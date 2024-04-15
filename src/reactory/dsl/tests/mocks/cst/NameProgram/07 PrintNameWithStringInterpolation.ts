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
          src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/07 PrintNameWithStringInterpolation.rxs",
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
              src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/07 PrintNameWithStringInterpolation.rxs",
            },
          },
          children: [
          ],
        },
        {
          type: "MacroArguments",
          value: "(`Hello $name`)",
          token: {
            type: "PAREN_OPEN",
            value: "(",
            position: {
              line: 1,
              column: 7,
              src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/07 PrintNameWithStringInterpolation.rxs",
            },
          },
          children: [
            {
              type: "StringInterpolation",
              token: {
                type: "EXECUTABLE_STRING_LITERAL",
                value: "`Hello $name`",
                position: {
                  line: 1,
                  column: 8,
                  src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/07 PrintNameWithStringInterpolation.rxs",
                },
              },
              children: [
                {
                  type: "StringInterpolation",
                  value: "`Hello $name`",
                  token: {
                    type: "EXECUTABLE_STRING_LITERAL",
                    value: "`Hello $name`",
                    position: {
                      line: 1,
                      column: 8,
                      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/07 PrintNameWithStringInterpolation.rxs",
                    },
                  },
                  children: [
                  ],
                },
              ],
              value: "`Hello $name`",
            },
          ],
        },
      ],
    },
  ],
};