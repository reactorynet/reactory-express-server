import { isNil } from 'lodash';
import moment from 'moment';
import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';

const DateScalar = new GraphQLScalarType({
  name: 'Date',
  description: 'Date custom scalar type',
  parseValue(value) {
    return moment(value); // value from the client
  },
  serialize(value) {
    if (isNil(value) === true) return null;
    if (moment.isMoment(value) === true) return value.format();
    if (moment.isMoment(moment(value)) === true) return moment(value).format();
    console.warn('type not supported', value);
    return null;
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.INT) {
      return parseInt(ast.value, 10); // ast value is always in string format
    }
    return null;
  },
});

export default DateScalar;
