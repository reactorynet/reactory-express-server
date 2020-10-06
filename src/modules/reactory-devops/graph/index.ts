
import { existsSync } from 'fs';
import logger from '@reactory/server-core/logging';
import { fileAsString } from '@reactory/server-core/utils/io';

const typeDefs: string[] = [];

[  
  'Database/ReactoryMongo',
].forEach((name) => {
  try {
    const fileName = `./${name}.graphql`;
    //if(existsSync(fileName) === true) {
    logger.debug(`Adding [CORE-DEVOPS][${fileName}]`);
    const source = fileAsString(require.resolve(fileName));
    typeDefs.push(source);
    //}
  } catch (e) {
    logger.error(`Error loading type definition, please check file: ${name}`, { error: e });
  }
});

export default typeDefs;
