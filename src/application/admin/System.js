import co from 'co';
import { ReactoryClient } from '../../models';

export const getReactoryClientWithKey = co.wrap(function* getReactoryClientWithKeyGenerator(key) {
  try {
    return yield ReactoryClient.findOne({ key });
  } catch (ex) {
    return null;
  }
});

export const createReactoryClient = co.wrap(function* createReactoryClientGenerator(clientInput) {
  try {
    return yield new ReactoryClient({ clientInput }).save();
  } catch (ex) {
    return null;
  }
});
