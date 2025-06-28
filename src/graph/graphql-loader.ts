import logger from '@reactory/server-core/logging';
import { fileAsString } from '@reactory/server-core/utils/io';
import { parse } from 'graphql';
import path from 'path';

/**
 * Validates if a string is valid GraphQL syntax
 * @param source The GraphQL schema string to validate
 * @returns {boolean} True if valid, false otherwise
 */
export const isValidGraphQLSyntax = (source: string): boolean => {
  try {
    parse(source);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Load GraphQL type definitions from files
 * @param fileNames Array of file names to load
 * @param basePath Base path for resolving files (defaults to calling file's directory)
 * @param moduleName Name of the module (for logging)
 * @returns Array of GraphQL type definition strings
 */
export const loadGraphQLTypeDefinitions = (
  fileNames: string[], 
  basePath: string, 
  moduleName: string = 'UNNAMED'
): string[] => {
  const typeDefinitions: string[] = [];
  
  fileNames.forEach((name) => {
    try {
      const fileName = path.join(basePath, `${name}.graphql`);
      const relativeFileName = path.relative(process.cwd(), fileName);
      logger.debug(`Adding [${moduleName}][${relativeFileName}] to graph`);
      
      const source = fileAsString(require.resolve(fileName));
      
      // Validate GraphQL syntax
      if (!isValidGraphQLSyntax(source)) {
        logger.error(`🟥 [${moduleName}] Invalid GraphQL syntax in file: ${relativeFileName}`);
        return;
      }
      
      typeDefinitions.push(source);
    } catch (e) {
      const error = e as Error;
      logger.error(`Error [${moduleName}] loading type definition for ${name}.graphql: ${error.message}`, { 
        error,
        fileName: name,
        moduleName,
        stack: error.stack 
      });
    }
  });
  
  return typeDefinitions;
};
