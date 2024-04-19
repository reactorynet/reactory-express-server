import passport from 'passport';
import { Application } from 'express';
import { User  } from '../models/index';
import { findIndex } from 'lodash';
import ReactoryProviders from './strategies';
import ReactoryModules from '@reactory/server-core/modules';
import logger from '@reactory/server-core/logging';
/**
 * Reactory Authentication Configuration
 */
class AuthConfig {
  /**
   * A static method to configure the authentication strategies
   * @param app 
   */
  static Configure = (app: Application) => {
    app.use(passport.initialize());
    // Passport calls serializeUser and deserializeUser to
    // manage users
    passport.serializeUser((user: any, done) => {
      // Use the OID property of the user as a key
      // users[user.profile.oid] = user;
      done(null, user?.oid);
    });

    passport.deserializeUser((id, done) => {
      User.findById(id).then((user) => {
        done(null, user);
      });
    });
    const {
      enabled,
    } = ReactoryModules;
    // Load all strategies from the strategies directory
    // that is available by default.
    const providerList = ReactoryProviders.map((provider) => provider);
    
    /**
     * Load all strategies from custom modules
     */
    enabled.forEach((module) => {
      if(module.passportProviders) {
        module.passportProviders.forEach((provider) => {
          const index = findIndex(providerList, (p) => p.name === provider.name);
          if(index === -1) {
            providerList.push(provider);
          } else {
            providerList[index] = provider;
          }
        });
      }
    });

    const {
      REACTORY_DISABLED_AUTH_PROVIDERS = '',
    } = process.env;

    providerList.forEach((provider) => {
      if(!REACTORY_DISABLED_AUTH_PROVIDERS.includes(provider.name)) {
        logger.debug(`🔐 Enabling ${provider.name} authentication strategy`);
        passport.use(provider.strategy);
        if (provider.configure) {
          provider.configure(app);
        }
      }
    });
  };
}

export { default as Decorators } from './decorators';
export default AuthConfig;