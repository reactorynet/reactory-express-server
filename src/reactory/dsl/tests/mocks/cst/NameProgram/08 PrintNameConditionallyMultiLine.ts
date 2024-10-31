export default {
  type: "Program",
  token: null,
  children: [
    {
      type: "IfControl",
      condition: {
        type: "Grouping",
        token: {
          type: "PAREN_OPEN",
          value: "(",
          position: {
            line: 1,
            column: 4,
            src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/08 PrintNameConditionallyMultiLine.rxs",
          },
        },
        children: [
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
            type: "ComparisonOperator",
            children: [
            ],
            value: "==",
          },
          {
            type: "Whitespace",
            children: [
            ],
            value: " ",
          },
          {
            type: "StringLiteral",
            children: [
            ],
            value: "\"John\"",
          },
        ],
      },
      thenBranch: {
        type: "Grouping",
        token: {
          type: "CURLY_OPEN",
          value: "{",
          position: {
            line: 1,
            column: 22,
            src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/08 PrintNameConditionallyMultiLine.rxs",
          },
        },
        children: [
          {
            type: "Newline",
            children: [
            ],
            value: "\n",
          },
          {
            type: "Whitespace",
            children: [
            ],
            value: "  ",
          },
          {
            type: "MacroInvocation",
            token: {
              type: "MACRO_START",
              value: "@",
              position: {
                line: 2,
                column: 2,
                src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/08 PrintNameConditionallyMultiLine.rxs",
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
                    line: 2,
                    column: 3,
                    src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/08 PrintNameConditionallyMultiLine.rxs",
                  },
                },
                children: [
                ],
              },
              {
                type: "MacroArguments",
                value: "(\"Hello, John!\")",
                token: {
                  type: "PAREN_OPEN",
                  value: "(",
                  position: {
                    line: 2,
                    column: 8,
                    src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/08 PrintNameConditionallyMultiLine.rxs",
                  },
                },
                children: [
                  {
                    type: "StringLiteral",
                    token: {
                      type: "STRING_LITERAL",
                      value: "\"Hello, John!\"",
                      position: {
                        line: 2,
                        column: 9,
                        src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/08 PrintNameConditionallyMultiLine.rxs",
                      },
                    },
                    children: [
                    ],
                    value: "\"Hello, John!\"",
                  },
                ],
              },
            ],
          },
          {
            type: "Newline",
            children: [
            ],
            value: "\n",
          },
        ],
      },
      elifBranches: [
      ],
      elseBranch: null,
      value: null,
      children: [
      ],
    },
  ],
  acl: null,
  directives: [
  ],
  value: null,
};