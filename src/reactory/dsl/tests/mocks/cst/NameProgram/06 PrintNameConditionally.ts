export default {
  type: "Program",
  token: null,
  acl: null,
  directives: [],
  value: null,
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
            column: 3,
            src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/06 PrintNameConditionally.rxs",
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
            column: 21,
            src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/06 PrintNameConditionally.rxs",
          },
        },
        children: [
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
                line: 1,
                column: 23,
                src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/06 PrintNameConditionally.rxs",
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
                    column: 24,
                    src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/06 PrintNameConditionally.rxs",
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
                    line: 1,
                    column: 29,
                    src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/06 PrintNameConditionally.rxs",
                  },
                },
                children: [
                  {
                    type: "StringLiteral",
                    token: {
                      type: "STRING_LITERAL",
                      value: "\"Hello, John!\"",
                      position: {
                        line: 1,
                        column: 30,
                        src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/06 PrintNameConditionally.rxs",
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
            type: "Whitespace",
            children: [
            ],
            value: " ",
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
};