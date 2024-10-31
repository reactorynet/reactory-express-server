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
      type: "VariableIdentifier",
      children: [
      ],
      value: "$name",
    },
    {
      type: "Whitespace",
      children: [
      ],
      value: " ",
    },
    {
      type: "Operator",
      operator: 1,
      children: [
      ],
      value: "=",
    },
    {
      type: "Whitespace",
      children: [
      ],
      value: " ",
    },
    {
      type: "MacroInvocation",
      token: {
        type: "MACRO_START",
        value: "@",
        position: {
          line: 2,
          column: 8,
          src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/11 AskForNameInput.rxs",
        },
      },
      value: "@form",
      children: [
        {
          type: "MacroName",
          value: "form",
          token: {
            type: "IDENTIFIER",
            value: "form",
            position: {
              line: 2,
              column: 9,
              src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/11 AskForNameInput.rxs",
            },
          },
          children: [
          ],
        },
        {
          type: "MacroArguments",
          value: "(\"core-test.WhatIsYourName@1.0.0\")",
          token: {
            type: "PAREN_OPEN",
            value: "(",
            position: {
              line: 2,
              column: 13,
              src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/11 AskForNameInput.rxs",
            },
          },
          children: [
            {
              type: "StringLiteral",
              token: {
                type: "STRING_LITERAL",
                value: "\"core-test.WhatIsYourName@1.0.0\"",
                position: {
                  line: 2,
                  column: 14,
                  src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/11 AskForNameInput.rxs",
                },
              },
              children: [
              ],
              value: "\"core-test.WhatIsYourName@1.0.0\"",
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
        value: "# host web",
        position: {
          line: 1,
          column: 1,
          src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/11 AskForNameInput.rxs",
        },
      },
      children: [
      ],
      value: "# host web",
      directiveType: null,
    },
  ],
  value: null,
};