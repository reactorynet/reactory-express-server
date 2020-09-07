
import logger from '@reactory/server-core/logging';
import { fileAsString } from '@reactory/server-core/utils/io';

const graphTypes: any[] = [];
[
 'types/Survey/Assessment',
 'types/Survey/Survey',
 'types/Mores/Dashboards',
 'types/Mores/Reports/MoresIndividual360'
].forEach((name) => {
  try {
    const fileName = `./${name}.graphql`;
    logger.debug(`Adding [towerstone][${fileName}]`);
    const source = fileAsString(require.resolve(fileName));
    graphTypes.push(`${source}`);
  } catch (e) {
    logger.error(`Error loading type definition, please check file: ${name}`, { error: e });
  }
});

export default graphTypes;