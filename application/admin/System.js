import co from 'co';
import { ReactoryClient } from '../../models';

const getReactoryClientWithKey = co.wrap(function* getReactoryClientWithKeyGenerator(key) {
  try {
    return yield ReactoryClient.findOne({ key });
  } catch (ex) {
    return null;
  }
});

const createReactoryClient = co.wrap(function* createReactoryClientGenerator(clientInput) {
  try {
    return yield new ReactoryClient({ clientInput }).save();
  } catch (ex) {
    return null;
  }
});

module.exports = {
  getReactoryClientWithKey,
  createReactoryClient,
};
