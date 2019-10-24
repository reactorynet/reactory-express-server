
import logger from '../../../../logging';
import { fileAsString } from '../../../../utils/io';

const typeDefs = [];

[
  'Lasec360/Authentication',
  'SalesTeams/SalesTeams',
  'Quotes/Quote',
  'Products/Products',
  'Clients/Clients',
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
