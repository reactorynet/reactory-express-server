import { isNil } from 'lodash';
import { Application, User, ReactoryClient } from '../models';
import { installDefaultEmailTemplates } from '../emails';
import data from '../data';

const { clients } = data;

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
            resolve({
              application: appResult,
              system_user: userResponse,
              clientsLoaded: done,
              installedTemplates,
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
