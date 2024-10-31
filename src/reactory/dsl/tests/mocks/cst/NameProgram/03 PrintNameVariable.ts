
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
          src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/03 PrintNameVariable.rxs",
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
              src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/03 PrintNameVariable.rxs",
            },
          },
          children: [
          ],
        },
        {
          type: "MacroArguments",
          value: "($name)",
          token: {
            type: "PAREN_OPEN",
            value: "(",
            position: {
              line: 1,
              column: 7,
              src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/03 PrintNameVariable.rxs",
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
                  src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/03 PrintNameVariable.rxs",
                },
              },
              children: [
              ],
              value: "$name",
            },
          ],
        },
      ],
    },
  ],
};