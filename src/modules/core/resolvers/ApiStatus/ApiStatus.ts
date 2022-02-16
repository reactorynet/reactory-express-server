import { Reactory } from '@reactory/server-core/types/reactory';
import { resolver, query, property } from "@reactory/server-core/models/graphql/decorators/resolver";
import { isNil, isArray, sortBy, filter, intersection, uniq } from 'lodash';
import moment from 'moment';
const packageJson = require('../../../../../package.json');

@resolver
class ApiStatus {

  resolver: any

  @property("ApiStatus", "id")
  id(apiStatus: Reactory.IReactoryApiStatus) {
    return apiStatus.id || 'anon'
  };

  @property("ApiStatus", "menus")
  menus(apiStatus: Reactory.IReactoryApiStatus, params: any, context: Reactory.IReactoryContext): Promise<Reactory.IReactoryMenu[]> {
    const systemService = context.getService("core.SystemService@1.0.0") as Reactory.Service.IReactorySystemService;
    return systemService.getMenusForClient(context.partner)    
  };

  @property("ApiStatus", "server")
  async server(apiStatus: Reactory.IReactoryApiStatus, params: any, context: Reactory.IReactoryContext) {
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


  @query("apiStatus")
  async getApiStatus(obj: any, args: any, context: Reactory.IReactoryContext) {
    const { user, partner } = context;

    const systemService = context.getService("core.SystemService@1.0.0") as Reactory.Service.IReactorySystemService;


    let skipResfresh = false;
    let isAnon: boolean = false;
    let uxmessages: any[] = [];

    const roles: any[] = [];
    const alt_roles: any[] = [];
    const memberships: any[] = isArray(user.memberships) === true ? user.memberships : [];

    if (user.anon === true) {
      skipResfresh = true;
      isAnon = true;
      roles.push('ANON');
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

    if (isAnon === false) {

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
              alt_roles.push(`${r}\\${alt_partner._id.toString()}\\${alt_partner_membership.clientId}\\${alt_partner_membership.organizationId || '*'}\\${alt_partner_membership.organizationId || '*'}`);
            });
          }
        });
      });

    }

    let navigationComponents: any[] = [];
    const settingKey = `navigation_components/${process.env.MODE}`;
    const navigationComponentsSetting = partner.getSetting(settingKey, [], false);

    if (navigationComponentsSetting && navigationComponentsSetting.data) {
      navigationComponents = [...navigationComponentsSetting.data];
    }

    const api_status_result: any = {
      when: moment(),      
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
      themeOptions: partner.themeOptions || {},
      themes: [],
      colorSchemes: {
        primary: partner.colorScheme(partner.themeOptions.palette.primary.main.replace('#', '')),
        secondary: partner.colorScheme(partner.themeOptions.palette.primary.main.replace('#', '')),
      },
      messages: uxmessages,
      navigationComponents,
    };

    context.log(`${user.firstName} Api Status Call Result:${api_status_result.status}`);

    return api_status_result;
  }

}

export default ApiStatus;