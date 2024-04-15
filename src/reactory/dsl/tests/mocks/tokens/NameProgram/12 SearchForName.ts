import NameProgram from '@reactory/server-core/reactory/dsl/tests/mocks/scripts/NameProgram';
import { Token } from '@reactory/server-core/types/compiler/lexer';

const source = NameProgram._12_SearchForName;
const tokens: Token[] = [
  {
    type: "DIRECTIVE",
    value: "# host server",
    position: {
      line: 1,
      column: 1,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 1,
      column: 14,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "VARIABLE",
    value: "$customer",
    position: {
      line: 2,
      column: 0,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 2,
      column: 9,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "ASSIGNMENT",
    value: "=",
    position: {
      line: 2,
      column: 10,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 2,
      column: 11,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "MACRO_START",
    value: "@",
    position: {
      line: 2,
      column: 12,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "IDENTIFIER",
    value: "db",
    position: {
      line: 2,
      column: 13,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "PAREN_OPEN",
    value: "(",
    position: {
      line: 2,
      column: 15,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "STRING_LITERAL",
    value: "\"main_mysql\"",
    position: {
      line: 2,
      column: 16,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "COMMA",
    value: ",",
    position: {
      line: 2,
      column: 28,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 2,
      column: 29,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "STRING_LITERAL",
    value: "\"dbo.Customer\"",
    position: {
      line: 2,
      column: 30,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "PAREN_CLOSE",
    value: ")",
    position: {
      line: 2,
      column: 44,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "SEMICOLON",
    value: ";",
    position: {
      line: 2,
      column: 45,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 2,
      column: 46,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "VARIABLE",
    value: "$users",
    position: {
      line: 3,
      column: 0,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 3,
      column: 6,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "ASSIGNMENT",
    value: "=",
    position: {
      line: 3,
      column: 7,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 3,
      column: 8,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "MACRO_START",
    value: "@",
    position: {
      line: 3,
      column: 9,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "IDENTIFIER",
    value: "db",
    position: {
      line: 3,
      column: 10,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "PAREN_OPEN",
    value: "(",
    position: {
      line: 3,
      column: 12,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "STRING_LITERAL",
    value: "\"main_customer\"",
    position: {
      line: 3,
      column: 13,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "COMMA",
    value: ",",
    position: {
      line: 3,
      column: 28,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 3,
      column: 29,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "STRING_LITERAL",
    value: "\"Users\"",
    position: {
      line: 3,
      column: 30,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "PAREN_CLOSE",
    value: ")",
    position: {
      line: 3,
      column: 37,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "SEMICOLON",
    value: ";",
    position: {
      line: 3,
      column: 38,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 3,
      column: 39,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "VARIABLE",
    value: "$results",
    position: {
      line: 4,
      column: 0,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 4,
      column: 8,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "ASSIGNMENT",
    value: "=",
    position: {
      line: 4,
      column: 9,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 4,
      column: 10,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "BRACKET_OPEN",
    value: "[",
    position: {
      line: 4,
      column: 11,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "BRACKET_CLOSE",
    value: "]",
    position: {
      line: 4,
      column: 12,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "SEMICOLON",
    value: ";",
    position: {
      line: 4,
      column: 13,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 4,
      column: 14,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 5,
      column: 0,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "IDENTIFIER",
    value: "declare",
    position: {
      line: 6,
      column: 0,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 6,
      column: 7,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "IDENTIFIER",
    value: "search",
    position: {
      line: 6,
      column: 8,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "PAREN_OPEN",
    value: "(",
    position: {
      line: 6,
      column: 14,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "VARIABLE",
    value: "$name",
    position: {
      line: 6,
      column: 15,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "PAREN_CLOSE",
    value: ")",
    position: {
      line: 6,
      column: 20,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 6,
      column: 21,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "CURLY_OPEN",
    value: "{",
    position: {
      line: 6,
      column: 22,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 6,
      column: 23,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: "  ",
    position: {
      line: 7,
      column: 0,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "VARIABLE",
    value: "$results",
    position: {
      line: 7,
      column: 2,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 7,
      column: 10,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "ASSIGNMENT",
    value: "=",
    position: {
      line: 7,
      column: 11,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 7,
      column: 12,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "IDENTIFIER",
    value: "select",
    position: {
      line: 7,
      column: 13,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 7,
      column: 19,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "IDENTIFIER",
    value: "id",
    position: {
      line: 7,
      column: 20,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 7,
      column: 22,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "IDENTIFIER",
    value: "from",
    position: {
      line: 7,
      column: 23,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 7,
      column: 27,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "VARIABLE",
    value: "$customer",
    position: {
      line: 7,
      column: 28,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 7,
      column: 37,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "IDENTIFIER",
    value: "where",
    position: {
      line: 7,
      column: 38,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 7,
      column: 43,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "VARIABLE",
    value: "$customer",
    position: {
      line: 7,
      column: 44,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "DOT",
    value: ".",
    position: {
      line: 7,
      column: 44,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "IDENTIFIER",
    value: "name",
    position: {
      line: 7,
      column: 44,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 7,
      column: 58,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "ASSIGNMENT",
    value: "=",
    position: {
      line: 7,
      column: 59,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 7,
      column: 60,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "VARIABLE",
    value: "$name",
    position: {
      line: 7,
      column: 61,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "SEMICOLON",
    value: ";",
    position: {
      line: 7,
      column: 66,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 7,
      column: 67,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: "  ",
    position: {
      line: 8,
      column: 0,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "VARIABLE",
    value: "$results",
    position: {
      line: 8,
      column: 2,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 8,
      column: 10,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "ARITHMETIC_OPERATOR",
    value: "+",
    position: {
      line: 8,
      column: 11,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "ASSIGNMENT",
    value: "=",
    position: {
      line: 8,
      column: 12,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 8,
      column: 13,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "IDENTIFIER",
    value: "select",
    position: {
      line: 8,
      column: 14,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 8,
      column: 20,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "IDENTIFIER",
    value: "id",
    position: {
      line: 8,
      column: 21,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 8,
      column: 23,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "IDENTIFIER",
    value: "from",
    position: {
      line: 8,
      column: 24,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 8,
      column: 28,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "VARIABLE",
    value: "$users",
    position: {
      line: 8,
      column: 29,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 8,
      column: 35,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "IDENTIFIER",
    value: "where",
    position: {
      line: 8,
      column: 36,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 8,
      column: 41,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "VARIABLE",
    value: "$users",
    position: {
      line: 8,
      column: 42,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "DOT",
    value: ".",
    position: {
      line: 8,
      column: 42,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "IDENTIFIER",
    value: "username",
    position: {
      line: 8,
      column: 42,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 8,
      column: 57,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "IDENTIFIER",
    value: "like",
    position: {
      line: 8,
      column: 58,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 8,
      column: 62,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "VARIABLE",
    value: "$name",
    position: {
      line: 8,
      column: 63,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "SEMICOLON",
    value: ";",
    position: {
      line: 8,
      column: 68,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 8,
      column: 69,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 8,
      column: 70,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: "  ",
    position: {
      line: 9,
      column: 0,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "VARIABLE",
    value: "$results",
    position: {
      line: 9,
      column: 2,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 9,
      column: 10,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "ASSIGNMENT",
    value: "=",
    position: {
      line: 9,
      column: 11,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "WHITESPACE",
    value: " ",
    position: {
      line: 9,
      column: 12,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "IDENTIFIER",
    value: "distinct",
    position: {
      line: 9,
      column: 13,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "PAREN_OPEN",
    value: "(",
    position: {
      line: 9,
      column: 21,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "VARIABLE",
    value: "$results",
    position: {
      line: 9,
      column: 22,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "PAREN_CLOSE",
    value: ")",
    position: {
      line: 9,
      column: 30,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "SEMICOLON",
    value: ";",
    position: {
      line: 9,
      column: 31,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 9,
      column: 32,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "CURLY_CLOSE",
    value: "}",
    position: {
      line: 10,
      column: 0,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 10,
      column: 1,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "NEWLINE",
    value: "\n",
    position: {
      line: 11,
      column: 0,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "MACRO_START",
    value: "@",
    position: {
      line: 12,
      column: 0,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "IDENTIFIER",
    value: "search",
    position: {
      line: 12,
      column: 1,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "PAREN_OPEN",
    value: "(",
    position: {
      line: 12,
      column: 7,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "VARIABLE",
    value: "$context",
    position: {
      line: 12,
      column: 8,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "DOT",
    value: ".",
    position: {
      line: 12,
      column: 8,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "IDENTIFIER",
    value: "state",
    position: {
      line: 12,
      column: 8,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "DOT",
    value: ".",
    position: {
      line: 12,
      column: 8,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "IDENTIFIER",
    value: "input",
    position: {
      line: 12,
      column: 8,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "PAREN_CLOSE",
    value: ")",
    position: {
      line: 12,
      column: 28,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
  {
    type: "EOF",
    value: "",
    position: {
      line: 12,
      column: 29,
      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
    },
  },
];

export default {
  source,
  tokens
}