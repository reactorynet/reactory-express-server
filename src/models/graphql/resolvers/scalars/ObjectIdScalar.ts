import { ObjectId } from 'mongodb';
import { GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { Kind } from 'graphql/language';
import logger from '@reactory/server-core/logging';

const ObjectIdScalarConfig: GraphQLScalarTypeConfig<ObjectId, string> = {
  name: 'ObjID',
  description: 'Id representation, based on Mongo Object Ids',
  parseValue(value) {
    try {
      if (value === null || value === undefined) return null;
      if (value instanceof String || typeof value === 'string') return new ObjectId(value as string);
      if (value instanceof ObjectId || typeof value === 'object') return new ObjectId(value as ObjectId);
      if (value instanceof Number || typeof value === 'number') return new ObjectId(value as number);
    } catch (error) {
      logger.error(error);
    }
    return null;
  },
  serialize(value) {
    try {
      if (value instanceof Object && value.$oid) return value.$oid;
      if (value instanceof ObjectId) return value.toString();
      return value.toString();
    } catch (error) {
      logger.error(error);
    }
    return null;
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING || ast.kind === Kind.INT) {
      return new ObjectId(ast.value);
    }
    return null
  },
}

const ObjID = new GraphQLScalarType(ObjectIdScalarConfig);

export default ObjID;

