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
          src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/04 PrintNameAndHelloWorld.rxs",
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
              src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/04 PrintNameAndHelloWorld.rxs",
            },
          },
          children: [
          ],
        },
        {
          type: "MacroArguments",
          value: "($name, \"Hello, World!\")",
          token: {
            type: "PAREN_OPEN",
            value: "(",
            position: {
              line: 1,
              column: 7,
              src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/04 PrintNameAndHelloWorld.rxs",
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
                  src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/04 PrintNameAndHelloWorld.rxs",
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
                  src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/04 PrintNameAndHelloWorld.rxs",
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
                  src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/04 PrintNameAndHelloWorld.rxs",
                },
              },
              children: [
              ],
              value: " ",
            },
            {
              type: "StringLiteral",
              token: {
                type: "STRING_LITERAL",
                value: "\"Hello, World!\"",
                position: {
                  line: 1,
                  column: 15,
                  src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/04 PrintNameAndHelloWorld.rxs",
                },
              },
              children: [
              ],
              value: "\"Hello, World!\"",
            },
          ],
        },
      ],
    },
  ],
};