import NameProgram from '@reactory/server-core/reactory/dsl/tests/mocks/scripts/NameProgram';
import { Token } from '@reactory/server-core/types/compiler/lexer';

const source = NameProgram._07_PrintNameWithStringInterpolation
const tokens: Token[] = [];

export default {
  source,
  tokens
}