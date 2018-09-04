import { isNil } from 'lodash';
import { Application, User, ReactoryClient } from '../models';
import { installDefaultEmailTemplates } from '../emails';
import data from '../data';

const { clients, users } = data;

const startup = () => {
  console.log('Startup initializing', Application, User);
  const appPromise = new Promise((resolve, reject) => {
    Application.count({}, function(err, result) { //eslint-disable-line
      if (result === 0) {
        const app = new Application({
          title: 'Reactory',
          description: 'Core API for reactory applications',
          version: 'alpha',
          createdAt: new Date(),
          updatedAt: new Date(),
        }).save(function(err) { //eslint-disable-line
          if (err) reject(err);
          resolve(app);
        });
      } else {
        Application.findOne({ title: 'Reactory' }).exec(function(err, result){ //eslint-disable-line
          if (err) reject(err);
          resolve(result);
        });
      }
    });
  });

  const systemUserPromise = new Promise((resolve, reject) => {
    User.findOne({ username: 'sysadmin' }).then((result) => {
      if (result === null) {
        const systemUser = new User({
          username: 'sysadmin',
          firstName: 'System',
          lastName: 'User',
          email: 'werner.weber+reactory-sysadmin@gmail.com',          
          authProvider: 'LOCAL',
          providerId: 'reactory-system',
          lastLogin: new Date(),
          roles: ['SYSADMIN'],
          legacyId: -1,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        systemUser.setPassword('XXXXXXXXXXXXX');
        systemUser.save(function(err){ //eslint-disable-line
          if (err) reject(err);
          resolve(systemUser);
        });
      } else {
        resolve(result);
      }
    }).catch((error) => {
      reject(error);
    });
  });

  /**
   * Returns an array of promises
   */
  const testUsersPromise = () => {
    return users.map((user) => {
      return new Promise((reject, resolve) => {
        User.findOne({ email: user.email }).then((result) => {
          if (result === null) {
            const newUser = new User({
              ...user,
              lastLogin: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            newUser.setPassword(user.password || 'P@ssw0rd_99!');
            newUser.save(function(err){ //eslint-disable-line
              if (err) reject(err);
              resolve(newUser);
            });
          } else {
            resolve(result);
          }
        }).catch((error) => {
          reject(error);
        });
      });
    });
  };

  const clientsPromise = new Promise((resolve, reject) => {
    try {
      clients.forEach((clientConfig) => {
        ReactoryClient.findOne({ key: clientConfig.key }).then((findResult) => {
          if (isNil(findResult) === true) {
            const newClient = new ReactoryClient(clientConfig);
            newClient.setPassword(clientConfig.password);
            const validationResult = newClient.validateSync();
            if (isNil(validationResult) === true) {
              newClient.save().catch((saveError) => {
                console.error('Could not save new client data', saveError);
              });
            }
          }
        });
      });
      resolve(true);
    } catch (ex) {
      reject(ex);
    }
  });

  return new Promise((resolve, reject) => {
    appPromise.then((appResult) => {
      systemUserPromise.then((userResponse) => {
        clientsPromise.then((done) => {
          installDefaultEmailTemplates().then((installedTemplates) => {
            const complete = () => {
              resolve({
                application: appResult,
                system_user: userResponse,
                clientsLoaded: done,
                installedTemplates,
              });
            };
            Promise.all(testUsersPromise()).then(() => {
              complete();
            }).catch((error) => {
              console.error(error);
              complete();
            });
          }).catch((templateInstallError) => {
            reject(templateInstallError);
          });
        }).catch((clientsError) => { reject(clientsError); });
      }).catch((userError) => { reject(userError); });
    }).catch((appError) => { reject(appError); });
  });
};

export default startup;
