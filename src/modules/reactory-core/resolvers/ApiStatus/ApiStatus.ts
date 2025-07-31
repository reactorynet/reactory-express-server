import path from 'path';
import Reactory from '@reactory/reactory-core';
import { resolver, query, property } from "@reactory/server-core/models/graphql/decorators/resolver";
import { ReactoryAnonUser } from '@reactory/server-core/context/AnonUser';
import { isNil, isArray, filter, intersection, uniq } from 'lodash';
import moment from 'moment';
const packageJson = require(path.join(process.cwd(), 'package.json'));



/***
 * Helper function to return roles for a user from the context object
 */
const getRoles = async (context: Reactory.Server.IReactoryContext): Promise <{ roles: string[], alt_roles: string[] }> => {
  context.debug(`getRoles called for ${context?.user?.firstName} ${context?.user?.lastName}`)
  const systemService = context.getService("core.SystemService@1.0.0") as Reactory.Service.IReactorySystemService;

  const { user, partner } = context;

  let isAnon: boolean = false;

  if (user.anon === true) {   
    isAnon = true;
  }

  const roles: any[] = [];
  const alt_roles: any[] = [];
  const memberships: any[] = isArray(user.memberships) === true ? user.memberships : [];

  if(isAnon === false) {

  const login_partner_keys_setting = partner.getSetting("login_partner_keys", {
    partner_keys: [partner.key, 'reactory'],
    defaultAction: 'add_default_membership',
    organization_excludes: [],
    organization_includes: [],
  }, true, "core.ReactoryPartnerKeysConfig");

  const login_partner_keys = login_partner_keys_setting.data;

  //get a list of all partner / cross partner logins allowed
  const partnerLogins: Reactory.Models.IReactoryClientDocument[] = await systemService.getReactoryClients({ key: { $in: [...login_partner_keys.partner_keys] } }).then();

  let root_partner_memberships: any[] = [];
  memberships.forEach((membership) => {
    if(membership.clientId.toString() === partner._id.toString()) {
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


  partnerLogins.forEach((alt_partner) => {
    const alt_partner_memberships = filter(memberships, { clientId: alt_partner._id });

    alt_partner_memberships.forEach((alt_partner_membership) => {
      if (isArray(alt_partner_membership.roles)) {

        if (roles.length === 0) {
          context.log(`${user.fullName} did not have a membership for ${partner.name} - assigning default roles`);
          //we have no roles in the primary partner, 
          //but we have one or more roles on the alt_partner
          //so we create our OWN PARTNER default role for the user and add the membership.
          let _default_roles = partner.getSetting('new_user_roles', ['USER'], true, 'core.SecurityNewUserRolesForReactoryClient');
          roles.push(_default_roles || 'USER');
          _default_roles.data.forEach((r: string) => user.addRole(partner._id, r, null, null));
        }

        alt_partner_membership.roles.forEach((r: string) => {
          alt_roles.push(`${r}:${alt_partner._id.toString()}:${alt_partner_membership.clientId}:${alt_partner_membership.organizationId || '*'}:${alt_partner_membership.businessUnitId || '*'}`);
        });
      }
    });
  });

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
    const { anon = false } = user;
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
          permitted = false; //default to false
          //if no roles are specified, we assume we don't care about the role, only need them to be authentication
          if (!route.roles || route.roles.length === 0) permitted = true; 
          //if anon is true, we deny access as the route is not public
          //we can rewrite the route to show the login page instead
          if (anon === true) {
            let loginRoute = routes.find((r: Reactory.Routing.IReactoryRoute) => r.path === '/login');
            $routes.push({ 
              path: route.path,
              args: route.args,
              roles: ["ANON"],
              components: loginRoute.components,
              exact: route.exact,
              id: route.id,
              key: route.key,
              redirect: route.redirect,
              title: loginRoute.title,
              public: true, 
              componentFqn: loginRoute.componentFqn,
              componentProps: loginRoute.componentProps,              
            });
            permitted = false;
          }
          
          if (anon === false && route.roles && route.roles.length > 0) {
            route.roles.forEach((role: string) => {
              if (hasRole(role, partner._id) === true) {
                permitted = true;
                return false;
              }
            });
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
    const clients = systemService.getReactoryClients({ 
      _id: {  $in: context.user.memberships.map((m: any) => m.clientId) } 
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
        
    const { roles, alt_roles } = await getRoles(context).then();

    let loggedInUser: Reactory.Models.IUserDocument = context.user;
    
    if(!loggedInUser){
      loggedInUser = ReactoryAnonUser
    }

    const memberships = loggedInUser.memberships.map((m: any) => {
      return {
        id: m._id.toString(),
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

    if (user.anon === true) {
      skipResfresh = true;
      isAnon = true;
    }


    if (skipResfresh === false && isAnon === false) {
      context.log(`apiStatus called for ${user.firstName} ${user.lastName}, performing profile refresh`, {});
      try {
        const refreshResult: any = await systemService.query(`
          query RefreshProfile($id:String, $skipImage: Boolean) {
            refreshProfileData(id: $id, skipImage: $skipImage) {
              user {
                id
                fullNameWithEmail
                avatar 
                authentications {
                  id
                  provider
                  props
                }      
              }
              messages {
                id
                title
                text
                data
                via
                icon
                actions {
                  id
                  action
                  title
                  icon
                  componentFqn
                  componentProps
                  modal
                  modalSize
                  priority
                }                
              }
            }
          }
        `, {
          id: user.id,
          skipImage: true,
        }).then();

        if (refreshResult && refreshResult.data && refreshResult.data.refreshProfileData) {
          const { user: profile, messages } = refreshResult.data.refreshProfileData;
          uxmessages = [...uxmessages, ...messages];
          context.log(`Result from profile refresh ${profile.fullNameWithEmail}, has ${uxmessages.length} messages`, {}, 'debug', 'ApiStatus.apiStatus()');
        }
      } catch (profileRefreshError) {
        context.log(`Error refreshing profile data for user ${user.firstName}`, profileRefreshError, 'error');
      }
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
      organization: user.organization,
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

    context.log(`${user.firstName} Api Status Call Result:${api_status_result.status}`);

    return api_status_result;
  }

}

export default ApiStatus;