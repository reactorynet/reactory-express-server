
import logger from '@reactory/server-core/logging';
import { fileAsString } from '@reactory/server-core/utils/io';

const graphTypes: any[] = [];
[
 'types/Survey/Assessment',
 'types/Survey/Survey',
 'types/Mores/Dashboards' 
].forEach((name) => {
  try {
    const fileName = `./${name}.graphql`;
    logger.debug(`Loading ${fileName} - Graph definitions For TowerStone`);
    const source = fileAsString(require.resolve(fileName));
    graphTypes.push(`${source}`);
  } catch (e) {
    logger.error(`Error loading type definition, please check file: ${name}`, { error: e });
  }
});

export default graphTypes;