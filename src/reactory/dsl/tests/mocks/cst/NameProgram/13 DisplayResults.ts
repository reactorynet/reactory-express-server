export default {
  type: "Program",
  token: null,
  children: [
    {
      type: "Newline",
      children: [
      ],
      value: "\n",
    },
    {
      type: "MacroInvocation",
      token: {
        type: "MACRO_START",
        value: "@",
        position: {
          line: 2,
          column: 0,
          src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/13 DisplayResults.rxs",
        },
      },
      value: "@show",
      children: [
        {
          type: "MacroName",
          value: "show",
          token: {
            type: "IDENTIFIER",
            value: "show",
            position: {
              line: 2,
              column: 1,
              src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/13 DisplayResults.rxs",
            },
          },
          children: [
          ],
        },
        {
          type: "MacroArguments",
          value: "(result)",
          token: {
            type: "PAREN_OPEN",
            value: "(",
            position: {
              line: 2,
              column: 5,
              src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/13 DisplayResults.rxs",
            },
          },
          children: [
            {
              type: "Identifier",
              token: {
                type: "IDENTIFIER",
                value: "result",
                position: {
                  line: 2,
                  column: 6,
                  src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/13 DisplayResults.rxs",
                },
              },
              children: [
                {
                  type: "VariableIdentifier",
                  children: [
                  ],
                  value: "result",
                },
              ],
              value: "result",
            },
          ],
        },
      ],
    },
  ],
  acl: null,
  directives: [
    {
      type: "Directive",
      token: {
        type: "DIRECTIVE",
        value: "# host cli",
        position: {
          line: 1,
          column: 1,
          src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/13 DisplayResults.rxs",
        },
      },
      children: [
      ],
      value: "# host cli",
      directiveType: null,
    },
  ],
  value: null,
};