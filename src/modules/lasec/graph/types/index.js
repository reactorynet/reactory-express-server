
import logger from '@reactory/server-core/logging';
import { fileAsString } from '@reactory/server-core/utils/io';

const typeDefs = [];

[
  'Lasec360/Authentication',
  'System/LasecUser',
  'SalesTeams/SalesTeams',
  'Quotes/Quote',
  'Products/Products',
  'Clients/Clients',
  'Category/Category',
].forEach((name) => {
  try {
    const fileName = `./${name}.graphql`;
    logger.debug(`Loading ${fileName} - Graph definitions`);
    const source = fileAsString(require.resolve(fileName));
    typeDefs.push(`${source}`);
  } catch (e) {
    logger.error(`Error loading type definition, please check file: ${name}`, { error: e });
  }
});

export default typeDefs;
