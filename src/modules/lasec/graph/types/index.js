
import logger from '@reactory/server-core/logging';
import { fileAsString } from '@reactory/server-core/utils/io';

const typeDefs = [];

[
  'Lasec360/Authentication',
  'System/LasecUser',
  'SalesTeams/SalesTeams',
  'Quotes/Quote',
  'Products/Products',
  'SalesOrder/SalesOrder',
  'Clients/Clients',
  'Category/Category',
  'CategoryFilter/CategoryFilter',
].forEach((name) => {
  try {
    const fileName = `./${name}.graphql`;
    logger.debug(`Adding [lasec-crm][${fileName}`);
    const source = fileAsString(require.resolve(fileName));
    typeDefs.push(`${source}`);
  } catch (e) {
    logger.error(`Error loading type definition, please check file: ${name}`, { error: e });
  }
});

export default typeDefs;
