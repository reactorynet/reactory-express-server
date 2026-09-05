import path from 'path';
import Reactory from '@reactorynet/reactory-core';
import { resolver, query, property } from "@reactory/server-core/models/graphql/decorators/resolver";
import { ReactoryAnonUser } from '@reactory/server-core/context/AnonUser';
import { isNil, isArray, filter, intersection, uniq } from 'lodash';
import moment from 'moment';
const packageJson = require(path.join(process.cwd(), 'package.json'));



/***
 * Helper function to return roles for a user from the context object
 */
const isAnonymousUser = (user: any): boolean => {
  if (!user) return true;
  if (user.anon === true) return true;
  if (user.username === 'anonymous' || user.username === 'anon') return true;
  if (user.email && (user.email.startsWith('anon') || user.email.startsWith('anonymous'))) return true;
  if (Array.isArray(user.roles) && user.roles.length === 1 && user.roles[0] === 'ANON') return true;
  return false;
};

const getRoles = async (context: Reactory.Server.IReactoryContext): Promise<{ roles: string[], alt_roles: string[] }> => {
  const systemService = context.getService("core.SystemService@1.0.0") as Reactory.Service.IReactorySystemService;

  const { user, partner } = context;

  const isAnon: boolean = isAnonymousUser(user);

  const roles: string[] = [];
  const alt_roles: string[] = [];
  const memberships: any[] = (user && isArray(user.memberships)) === true ? user.memberships : [];

  if (isAnon === false && user) {
    const getUserDisplayName = () => {
      if (typeof user.fullName === 'function') return user.fullName();
      if (user.firstName || user.lastName) return `${user.firstName || ''} ${user.lastName || ''}`.trim();
      return user.email || 'User';
    };

    try {
      const login_partner_keys_setting = partner.getSetting("login_partner_keys", {
        partner_keys: [partner.key, 'reactory'],
        defaultAction: 'add_default_membership',
        organization_excludes: [],
        organization_includes: [],
      }, true, "core.ReactoryPartnerKeysConfig");

      const login_partner_keys = login_partner_keys_setting.data;

      // get a list of all partner / cross partner logins allowed
      const partnerLogins: Reactory.Models.IReactoryClientDocument[] = await systemService.getReactoryClients({ key: { $in: [...login_partner_keys.partner_keys] } }).then();

      let root_partner_memberships: any[] = [];
      memberships.forEach((membership) => {
        if (membership.clientId && partner._id && membership.clientId.toString() === partner._id.toString()) {
          root_partner_memberships.push(membership);
        }
      });

      root_partner_memberships.forEach((membership) => {
        if (isArray(membership.roles)) {
          membership.roles.forEach((r: string) => {
            roles.push(r);
          });
        }
      });

      // Process partner logins sequentially to avoid parallel save errors
      for (const alt_partner of partnerLogins) {
        const alt_partner_memberships = memberships.filter((m: any) =>
          m.clientId && alt_partner._id && m.clientId.toString() === alt_partner._id.toString()
        );

        for (const alt_partner_membership of alt_partner_memberships) {
          if (isArray(alt_partner_membership.roles)) {

            if (roles.length === 0) {
              context.log(`${getUserDisplayName()} did not have a membership for ${partner.name} - assigning default roles`, {}, 'debug', 'ApiStatus:getRoles');
              // we have no roles in the primary partner,
              // but we have one or more roles on the alt_partner
              // so we create our OWN PARTNER default role for the user and add the membership.
              const _default_roles_setting = partner.getSetting('new_user_roles', ['USER'], true, 'core.SecurityNewUserRolesForReactoryClient');
              const _default_roles: string[] = _default_roles_setting?.data || ['USER'];

              // Add default roles to the roles array
              _default_roles.forEach((r: string) => roles.push(r));

              // Sequentially add roles to avoid parallel save errors on the user document
              for (const r of _default_roles) {
                try {
                  await user.addRole(partner._id, r, null, null, context);
                } catch (addRoleError) {
                  context.log(`Failed to add role ${r} to user ${getUserDisplayName()}: ${addRoleError.message}`, { error: addRoleError }, 'error', 'ApiStatus:getRoles');
                  // Continue processing other roles even if one fails
                }
              }
            }

            alt_partner_membership.roles.forEach((r: string) => {
              alt_roles.push(`${r}:${alt_partner._id.toString()}:${alt_partner_membership.clientId}:${alt_partner_membership.organizationId || '*'}:${alt_partner_membership.businessUnitId || '*'}`);
            });
          }
        }
      }

      // Safe fallback if roles is still empty for an authenticated user
      if (roles.length === 0) {
        let fallbackRoles: string[] = [];
        if (isArray(user.roles) && user.roles.length > 0) {
          fallbackRoles = user.roles.filter((r: string) => r && r !== 'ANON');
        }
        if (fallbackRoles.length === 0) {
          const _default_roles_setting = partner.getSetting('new_user_roles', ['USER'], true, 'core.SecurityNewUserRolesForReactoryClient');
          fallbackRoles = _default_roles_setting?.data || ['USER'];
        }

        if (fallbackRoles.length > 0) {
          context.log(`Assigning fallback roles [${fallbackRoles.join(', ')}] for user ${getUserDisplayName()} on ${partner.name}`, {}, 'info', 'ApiStatus:getRoles');
          fallbackRoles.forEach((r: string) => roles.push(r));

          // Auto-persist the missing membership record so the session does not drop into an unauthorized state
          try {
            if (typeof user.addRole === 'function') {
              for (const r of fallbackRoles) {
                await user.addRole(partner._id, r, null, null, context);
              }
            } else if (user._id) {
              const mongoose = require('mongoose');
              const UserModel = mongoose.models.User || mongoose.model('User');
              if (UserModel) {
                await UserModel.updateOne(
                  { _id: user._id },
                  {
                    $addToSet: {
                      memberships: {
                        clientId: partner._id,
                        enabled: true,
                        roles: fallbackRoles,
                      }
                    }
                  }
                );
              }
            }
          } catch (persistError) {
            context.log(`Failed to auto-persist membership roles for user ${user.email}: ${persistError.message}`, { error: persistError }, 'warn', 'ApiStatus:getRoles');
          }
        }
      }
    } catch (error) {
      context.log(`Error in getRoles for user ${getUserDisplayName()}: ${error.message}`, { error }, 'error', 'ApiStatus:getRoles');
      // If user has global roles, use them as resilient fallback even on error
      if (isArray(user.roles) && user.roles.length > 0) {
        const globalRoles = user.roles.filter((r: string) => r && r !== 'ANON');
        if (globalRoles.length > 0) {
          return { roles: uniq(globalRoles), alt_roles: [] };
        }
      }
      return { roles: [], alt_roles: [] };
    }
  } else {
    roles.push('ANON');
  }

  return { roles: uniq(roles), alt_roles: uniq(alt_roles) };
}

const DEFAULT_MATERIAL_THEME = {  
  palette: {
    mode: 'dark',    
    primary: {
      light: '#e3f2fd',
      main: '#90caf9',
      dark: '#42a5f5',
      contrastText: '#ffffff',
    },
    secondary: {
      light: '#a5392a',
      main: '#700000',
      dark: '#430000',
      contrastText: '#ffffff',
    },
    background: {
      paper: '#121212',
      default: '#121212'
    }
  },
}


const getActiveTheme = (_: Reactory.Models.IApiStatus, args: { theme: string, mode: string }, context: Reactory.Server.IReactoryContext): Reactory.UX.IReactoryTheme => {
  const { themes = [], theme = "reactory" } = context.partner;

  let activeTheme: Reactory.UX.IReactoryTheme = null;
  let $themename = args.theme || theme;


  if (themes.length > 0) {
    activeTheme = themes.find(($theme) => { return $theme.name === $themename });
  }

  if (!activeTheme) {
    activeTheme = {
      type: "material",
      name: "reactory",
      assets: [],
      content: {},
      defaultThemeMode: 'dark',
      version: '1.0.0',
      options: { ...DEFAULT_MATERIAL_THEME }
    };
  }

  let $thememode = args.mode || activeTheme?.defaultThemeMode || "dark";

  if (!activeTheme.options) {
    activeTheme.options = { ...DEFAULT_MATERIAL_THEME }
  }

  if (activeTheme.modes) {
    let modeOptions = activeTheme.modes.find((mode) => { return mode.mode === $thememode });
    if (modeOptions) {
      activeTheme.options = { 
        ...modeOptions.options,        
      }
    }
  }

  return activeTheme
}

//@ts-ignore
@resolver
class ApiStatus {

  resolver: any

  @property("ApiStatus", "id")
  id(apiStatus: Reactory.Models.IApiStatus) {
    return apiStatus.id || 'anon'
  };

  @property("ApiStatus", "menus")
  menus(_: Reactory.Models.IApiStatus, __: any, context: Reactory.Server.IReactoryContext): Promise<Reactory.UX.IReactoryMenuConfig[]> {
    const systemService = context.getService("core.SystemService@1.0.0") as Reactory.Service.IReactorySystemService;
    return systemService.getMenusForClient(context.partner)    
  };

  @property("ApiStatus", "routes")
  async routes(apiStatus: Reactory.Models.IApiStatus, _: any, context: Reactory.Server.IReactoryContext): Promise<Reactory.Routing.IReactoryRoute[]> {
    
    const { partner, user, hasRole } = context;
    const anon = isAnonymousUser(user);
    const { routes } = apiStatus;
    let $routes: Reactory.Routing.IReactoryRoute[] = [];

    if (isArray(routes) === true) {
      routes.forEach((route: Reactory.Routing.IReactoryRoute) => {
        let permitted: boolean = false;
        if (route.public === true) permitted = true;
        if (route.public === true && anon === false) {
          if(route.roles && route.roles.length === 1) {
            //we don't want to show public routes that 
            //are only accessible to anon users i.e. login / register
            //pages.
            if(route.roles[0] === 'ANON') permitted = false;
          }
        }
        if (route.public === false) {
          permitted = false;
          if (anon === false) {
            if (!route.roles || route.roles.length === 0) {
              permitted = true;
            } else {
              permitted = route.roles.some((role: string) => hasRole(role, partner._id) === true);
            }
          }
        }       
        if(permitted === true) $routes.push(route);
      });
    }

    return $routes;
  }

  @property("ApiStatus", "server")
  async server(apiStatus: Reactory.Models.IApiStatus, params: any, context: Reactory.Server.IReactoryContext) {
    const systemService = context.getService("core.SystemService@1.0.0") as Reactory.Service.IReactorySystemService;
    const membershipsList = (context.user?.memberships && Array.isArray(context.user.memberships)) ? context.user.memberships : [];
    const clients = systemService.getReactoryClients({ 
      _id: {  $in: membershipsList.map((m: any) => m.clientId) } 
    });

    return {
      id: process.env.SERVER_ID || 'reactory.local',
      version: packageJson.version,
      started: global.REACTORY_SERVER_STARTUP,
      license: packageJson.license || 'NONE',
      access: 'open',
      administrator: process.env.REACTORY_ADMIN || 'none',
      contact: process.env.REACTORY_ADMIN_CONTANCT || 'none',
      mode: process.env.MODE,
      clients: clients,
    }
  };

  @property("ApiStatus", "activeTheme")
  themeOptions(apiStatus: Reactory.Models.IApiStatus, args: { theme: string, mode: string }, context: Reactory.Server.IReactoryContext){    
    return getActiveTheme(apiStatus, args, context);
  }

  @property("ApiStatus", "colorSchemes")
  colorSchemes(apiStatus: Reactory.Models.IApiStatus, params: any, context: Reactory.Server.IReactoryContext) {
    const themeOptions: any = getActiveTheme(apiStatus, params, context).options;
    let primary = themeOptions?.palette?.primary?.main; // default primary color
    let secondary = themeOptions?.palette?.secondary?.main

    return {
         primary: context.partner.colorScheme(primary.replace('#', '')),
         secondary: context.partner.colorScheme(secondary.replace('#', '')),
    };
  }

  @property("ApiStatus", "themes")
  async themes(apiStatus: Reactory.Models.IApiStatus, params: any, context: Reactory.Server.IReactoryContext){
    const { themes = [] } = context.partner;

    return themes;
  }

  @property("ApiStatus", "loggedIn")
  async loggedInContext(apiStatus: Reactory.Models.IApiStatus, params: any, context: Reactory.Server.IReactoryContext): Promise<Reactory.Models.IReactoryLoggedInContext> {
    const isAnon = isAnonymousUser(context.user);
    if (isAnon === true) {
      return {
        user: {
          _id: null,
          id: 'anon',
          firstName: 'Anon',
          lastName: 'Anonymous',
          fullNameWithEmail: 'Anon Anonymous (anon@reactor.local)',
          email: 'anon@reactor.local',
          avatar: null,
          authentications: [],
          memberships: [],
          roles: ['ANON'],
          alt_roles: [],
          additional: {},
        },
        id: 'anon',
        memberships: [],
        roles: ['ANON'],
        businessUnit: null,
        organization: null,
        team: null,
        additional: [],
        altRoles: [],
      };
    }
        
    const { roles, alt_roles } = await getRoles(context).then();

    let loggedInUser: Reactory.Models.IUserDocument = context.user;
    
    if(!loggedInUser){
      loggedInUser = ReactoryAnonUser
    }

    const memberships = ((loggedInUser && Array.isArray(loggedInUser.memberships)) ? loggedInUser.memberships : []).map((m: any) => {
      return {
        id: m._id ? m._id.toString() : '',
        clientId: m.clientId?.toString(),
        organizationId: m.organizationId?.toString(),
        businessUnitId: m.businessUnitId?.toString(),
        roles: m.roles || [],
      };
    });

    let _context: Reactory.Models.IReactoryLoggedInContext = {
      //@ts-ignore
      user: {
        _id: loggedInUser?._id,
        id: loggedInUser?._id?.toString(),
        firstName: loggedInUser.firstName,
        lastName: loggedInUser.lastName,
        fullNameWithEmail: loggedInUser.fullNameWithEmail,
        email: loggedInUser.email,
        avatar: loggedInUser.avatar,
        authentications: loggedInUser.authentications,
        memberships,
        roles: roles,
        alt_roles: alt_roles,
        additional: {},
      },
      id: loggedInUser?._id?.toString() || `${loggedInUser.id || -1}`,
      memberships,
      roles: roles,
      businessUnit: null,
      organization: null,
      team: null,
      additional: [],
      altRoles: alt_roles
    };
    
    return _context;
  }


  @query("apiStatus")
  async getApiStatus(obj: any, args: { theme: string }, context: Reactory.Server.IReactoryContext) {
    const { user, partner } = context;
    const systemService = context.getService("core.SystemService@1.0.0") as Reactory.Service.IReactorySystemService;

    let skipResfresh = false;
    let isAnon: boolean = false;
    let uxmessages: any[] = [];
    
    const { roles, alt_roles } = await getRoles(context).then()    

    if (isAnonymousUser(user)) {
      skipResfresh = true;
      isAnon = true;
    }

    let navigationComponents: any[] = [];
    const settingKey = `navigation_components/${process.env.MODE}`;
    const navigationComponentsSetting = partner.getSetting(settingKey, [], false);

    if (navigationComponentsSetting && navigationComponentsSetting.data) {
      navigationComponents = [...navigationComponentsSetting.data];
    }

    const api_status_result: Partial<Reactory.Models.IApiStatus> = {
      when: moment().toDate(),      
      status: 'API OK',
      firstName: isNil(user) === false ? user.firstName : 'An',
      lastName: isNil(user) === false ? user.lastName : 'Anon',
      avatar: isNil(user) === false ? user.avatar : null,
      email: isNil(user) === false ? user.email : null,
      id: isNil(user) === false ? user?._id?.toString() : null,
      roles: uniq(roles),
      alt_roles,
      memberships: isNil(user) === false && isArray(user.memberships) ? user.memberships : [],
      organization: user ? user.organization : null,
      routes: (partner.routes || []).map((route: Reactory.Routing.IReactoryRoute) => {
        if (!route.roles) return route;
        if (intersection(route.roles, route.roles).length > 0) return route;
      }),
      applicationAvatar: partner.avatar,
      applicationName: partner.name,
      applicationRoles: partner.applicationRoles,
      menus: [],
      plugins: partner?.plugins || [],
      theme: partner.theme,
      messages: uxmessages,
      navigationComponents,
    };
    return api_status_result;
  }

}

export default ApiStatus;