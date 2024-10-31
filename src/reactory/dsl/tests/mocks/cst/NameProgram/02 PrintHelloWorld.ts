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
          src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/02 PrintHelloWorld.rxs",
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
              src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/02 PrintHelloWorld.rxs",
            },
          },
          children: [
          ],
        },
        {
          type: "MacroArguments",
          value: "(\"Hello, World!\")",
          token: {
            type: "PAREN_OPEN",
            value: "(",
            position: {
              line: 1,
              column: 7,
              src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/02 PrintHelloWorld.rxs",
            },
          },
          children: [
            {
              type: "StringLiteral",
              token: {
                type: "STRING_LITERAL",
                value: "\"Hello, World!\"",
                position: {
                  line: 1,
                  column: 8,
                  src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/02 PrintHelloWorld.rxs",
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