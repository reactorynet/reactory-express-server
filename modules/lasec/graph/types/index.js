
import logger from '../../../../logging';
import { fileAsString } from '../../../../utils/io';

const typeDefs = [];

[
  'Quotes/Quote',
].forEach((name) => {
  try {
    const fileName = `./${name}.graphql`;
    logger.info(`Adding ${fileName} to graph`);
    const source = fileAsString(require.resolve(fileName));
    typeDefs.push(`${source}`);
  } catch (e) {
    logger.error(`Error loading type definition, please check file: ${name}`, { error: e });
  }
});

export default typeDefs;
