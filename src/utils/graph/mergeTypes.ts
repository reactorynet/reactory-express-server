import logger from '@reactory/server-core/logging';
import { fileAsString } from '@reactory/server-core/utils/io';



const mergeTypes = (graphTypeFiles: any[] = [], moduleName: string = ''): string[] => {
  let merged: string[] = [];
  graphTypeFiles.forEach((name) => {
    try {
      const fileName = `./${name}.graphql`;
      logger.debug(`LOADING [${moduleName}][${fileName}]`);
      const source = fileAsString(require.resolve(fileName));
      merged.push(`${source}`);      
    } catch (e) {
      logger.error(`Error loading type definition, please check file: ${name}`, { error: e });      
    }
  });

  return merged;
}

export default mergeTypes;