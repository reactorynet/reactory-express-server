export default {
  type: "Program",
  token: null,
  acl: null,
  directives: [],
  value: null,
  children: [
    {
      type: "MacroInvocation",
      token: {
        type: "MACRO_START",
        value: "@",
        position: {
          line: 1,
          column: 1,
          src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/05 PrintNameAndNumbers.rxs",
        },
      },
      value: "@print",
      children: [
        {
          type: "MacroName",
          value: "print",
          token: {
            type: "IDENTIFIER",
            value: "print",
            position: {
              line: 1,
              column: 2,
              src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/05 PrintNameAndNumbers.rxs",
            },
          },
          children: [
          ],
        },
        {
          type: "MacroArguments",
          value: "($name, 123)",
          token: {
            type: "PAREN_OPEN",
            value: "(",
            position: {
              line: 1,
              column: 7,
              src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/05 PrintNameAndNumbers.rxs",
            },
          },
          children: [
            {
              type: "VariableIdentifier",
              token: {
                type: "VARIABLE",
                value: "$name",
                position: {
                  line: 1,
                  column: 8,
                  src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/05 PrintNameAndNumbers.rxs",
                },
              },
              children: [
              ],
              value: "$name",
            },
            {
              type: "Punctuation",
              token: {
                type: "COMMA",
                value: ",",
                position: {
                  line: 1,
                  column: 13,
                  src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/05 PrintNameAndNumbers.rxs",
                },
              },
              children: [
              ],
              value: ",",
            },
            {
              type: "Whitespace",
              token: {
                type: "WHITESPACE",
                value: " ",
                position: {
                  line: 1,
                  column: 14,
                  src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/05 PrintNameAndNumbers.rxs",
                },
              },
              children: [
              ],
              value: " ",
            },
            {
              type: "NumberLiteral",
              token: {
                type: "NUMBER_LITERAL",
                value: "123",
                position: {
                  line: 1,
                  column: 15,
                  src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/05 PrintNameAndNumbers.rxs",
                },
              },
              children: [
              ],
              value: "123",
            },
          ],
        },
      ],
    },
  ],
};