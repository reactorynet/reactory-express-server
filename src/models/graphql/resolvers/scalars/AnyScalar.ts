import { GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { Kind } from 'graphql/language';
import logger from '@reactory/server-core/logging';


const AnyScalarConfig: GraphQLScalarTypeConfig<any, string> = {
  name: 'Any',
  description: 'Arbitrary object',
  parseValue: (value) => {
    try {
      return typeof value === 'object' ? value
        : typeof value === 'string' ? JSON.parse(value)
          : null;
    } catch (error) {
      logger.error(error);
      return null;
    }    
  },
  serialize: (value) => {
    try {
      return typeof value === 'object' ? value
        : typeof value === 'string' ? JSON.parse(value)
          : null;
    } catch (error) { 
      logger.error(error);
    }
  },
  parseLiteral: (ast) => {
    try {
      switch (ast.kind) {
        case Kind.STRING: return JSON.parse(ast.value);
        case Kind.OBJECT: throw new Error('Not sure what to do with OBJECT for ObjectScalarType');
        default: return null;
      }
    } catch (error) {
      logger.error(error);
      return null;
    }    
  },
}

const AnyScalar = new GraphQLScalarType(AnyScalarConfig);

export default AnyScalar;