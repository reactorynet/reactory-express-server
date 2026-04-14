import { GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { Kind } from 'graphql/language';
import logger from '@reactory/server-core/logging';


const AnyScalarConfig: GraphQLScalarTypeConfig<any, any> = {
  name: 'Any',
  description: 'Arbitrary value: string, number, boolean, object, array, or date',
  parseValue: (value) => {
    try {
      if (value === null || value === undefined) return null;
      if (typeof value === 'object') return value;
      if (typeof value === 'boolean') return value;
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    } catch (error) {
      logger.error(error);
      return null;
    }
  },
  serialize: (value) => {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return value;
    if (typeof value === 'object') return value;
    return String(value);
  },
  parseLiteral: (ast) => {
    try {
      switch (ast.kind) {
        case Kind.STRING:
          try {
            return JSON.parse(ast.value);
          } catch {
            return ast.value;
          }
        case Kind.BOOLEAN: return ast.value;
        case Kind.INT: return parseInt(ast.value, 10);
        case Kind.FLOAT: return parseFloat(ast.value);
        case Kind.NULL: return null;
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