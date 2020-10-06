
import { mergeGraphResolver } from '@reactory/server-core/utils';
import ReactoryMongo from '../graph/Database/ReactoryMongo';

export default mergeGraphResolver([
    ReactoryMongo
]);
  
