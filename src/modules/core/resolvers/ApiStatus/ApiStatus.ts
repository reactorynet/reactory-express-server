import Reactory from '@reactory/reactory-core';
import { resolver, query, property } from "@reactory/server-core/models/graphql/decorators/resolver";
import { isNil, isArray, sortBy, filter, intersection, uniq } from 'lodash';
import moment from 'moment';
const packageJson = require('../../../../../package.json');


/***
 * Helper function to return roles for a user from the context object
 */
const getRoles = async (context: Reactory.Server.IReactoryContext): Promise <{ roles: string[], alt_roles: string[] }> => {

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

  console.log(`Partner has Keys (${login_partner_keys.partner_keys.length})`, {}, 'debug');
  //get a list of all partner / cross partner logins allowed
  const partnerLogins: Reactory.IReactoryClientDocument[] = await systemService.getReactoryClients({ key: { $in: [...login_partner_keys.partner_keys] } }).then();

  let root_partner_memberships = filter(memberships, { clientId: partner._id });
  context.log(`${user.firstName} has (${root_partner_memberships.length})`, null, 'debug');

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

@resolver
class ApiStatus {

  resolver: Reactory.IResolverStruct

  @property("ApiStatus", "id")
  id(apiStatus: Reactory.IReactoryApiStatus) {
    return apiStatus.id || 'anon'
  };

  @property("ApiStatus", "menus")
  menus(apiStatus: Reactory.IReactoryApiStatus, params: any, context: Reactory.Server.IReactoryContext): Promise<Reactory.IReactoryMenu[]> {
    const systemService = context.getService("core.SystemService@1.0.0") as Reactory.Service.IReactorySystemService;
    return systemService.getMenusForClient(context.partner)    
  };

  @property("ApiStatus", "server")
  async server(apiStatus: Reactory.IReactoryApiStatus, params: any, context: Reactory.Server.IReactoryContext) {
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
  themeOptions(apiStatus: Reactory.IReactoryApiStatus, args: { theme: string, mode: string }, context: Reactory.Server.IReactoryContext){

    debugger
    const { themes = [], theme = "reactory" } = context.partner;
    
    let activeTheme: Reactory.IReactoryTheme = null;
    let $themename = args.theme || theme;
    

    if(themes.length > 0) {
      activeTheme = themes.find(($theme) => { return $theme.name === $themename });
    }

    if(!activeTheme) {
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
    
    if(!activeTheme.options) {
      activeTheme.options = { ...DEFAULT_MATERIAL_THEME }
    }

    if(activeTheme.modes) {
      let modeOptions = activeTheme.modes.find((mode) => { return mode.mode === $thememode });      
      if(modeOptions) {
        activeTheme.options = { ...modeOptions.options }
      }
    }

    return activeTheme
  }

  @property("ApiStatus", "colorSchemes")
  colorSchemes(apiStatus: Reactory.IReactoryApiStatus, params: any, context: Reactory.Server.IReactoryContext) {
    
    const { themeOptions } = context.partner;

    let $themeOptions = themeOptions ? { ...themeOptions } : { type: "material", options: { ...DEFAULT_MATERIAL_THEME }, };

    let primary = '#10012b'; // default primary color
    let secondary = '#430000'; // default secondary color

    if (themeOptions.type === "material" && themeOptions.options) {
      let mode = $themeOptions?.options?.mode || "dark";

      primary = $themeOptions?.options?.palette?.primary[mode] || primary;
      secondary = $themeOptions?.options?.palette?.secondary[mode] || secondary;
    }

    return {
         primary: context.partner.colorScheme(primary.replace('#', '')),
         secondary: context.partner.colorScheme(secondary.replace('#', '')),
    };
  }

  @property("ApiStatus", "themes")
  async themes(apiStatus: Reactory.IReactoryApiStatus, params: any, context: Reactory.Server.IReactoryContext){
    const { themes = [] } = context.partner;

    return themes;
  }

  @property("ApiStatus", "loggedIn")
  async loggedInContext(apiStatus: Reactory.IReactoryApiStatus, params: any, context: Reactory.Server.IReactoryContext): Promise<Reactory.IReactoryLoggedInContext> {
        
    const { roles, alt_roles } = await getRoles(context).then();

    let _context: Reactory.IReactoryLoggedInContext = {
      user: context?.user,
      id: context?.user?._id,
      memberships: context?.user?.memberships || [],
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
      context.log(`apiStatus called for ${user.firstName} ${user.lastName}, performing profile refresh`, {}, 'debug');
      try {
        const refreshResult = await systemService.query(`
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

 


    const api_status_result: any = {
      when: moment().toDate(),      
      status: 'API OK',
      firstName: isNil(user) === false ? user.firstName : 'An',
      lastName: isNil(user) === false ? user.lastName : 'Anon',
      avatar: isNil(user) === false ? user.avatar : null,
      email: isNil(user) === false ? user.email : null,
      id: isNil(user) === false ? user._id : null,
      roles: uniq(roles),
      alt_roles,
      memberships: isNil(user) === false && isArray(user.memberships) ? user.memberships : [],
      organization: user.organization,
      routes: (partner.routes || []).map((route) => {
        if (!route.roles) return route;
        if (intersection(route.roles, route.roles).length > 0) return route;
      }),
      applicationAvatar: partner.avatar,
      applicationName: partner.name,
      applicationRoles: partner.applicationRoles,
      menus: partner._id,
      theme: partner.theme,
      // themeOptions: partner.themeOptions || {},
      // themes: [],
      // colorSchemes: {
      //   primary: partner.colorScheme(primary.replace('#', '')),
      //   secondary: partner.colorScheme(secondary.replace('#', '')),
      // },
      messages: uxmessages,
      navigationComponents,
    };

    context.log(`${user.firstName} Api Status Call Result:${api_status_result.status}`);

    return api_status_result;
  }

}

export default ApiStatus;