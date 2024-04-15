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
      value: "$customer",
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
          column: 12,
          src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
        },
      },
      value: "@db",
      children: [
        {
          type: "MacroName",
          value: "db",
          token: {
            type: "IDENTIFIER",
            value: "db",
            position: {
              line: 2,
              column: 13,
              src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
            },
          },
          children: [
          ],
        },
        {
          type: "MacroArguments",
          value: "(\"main_mysql\", \"dbo.Customer\")",
          token: {
            type: "PAREN_OPEN",
            value: "(",
            position: {
              line: 2,
              column: 15,
              src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
            },
          },
          children: [
            {
              type: "StringLiteral",
              token: {
                type: "STRING_LITERAL",
                value: "\"main_mysql\"",
                position: {
                  line: 2,
                  column: 16,
                  src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
                },
              },
              children: [
              ],
              value: "\"main_mysql\"",
            },
            {
              type: "Punctuation",
              token: {
                type: "COMMA",
                value: ",",
                position: {
                  line: 2,
                  column: 28,
                  src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
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
                  line: 2,
                  column: 29,
                  src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
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
                value: "\"dbo.Customer\"",
                position: {
                  line: 2,
                  column: 30,
                  src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
                },
              },
              children: [
              ],
              value: "\"dbo.Customer\"",
            },
          ],
        },
      ],
    },
    {
      type: "Punctuation",
      children: [
      ],
      value: ";",
    },
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
      value: "$users",
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
          line: 3,
          column: 9,
          src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
        },
      },
      value: "@db",
      children: [
        {
          type: "MacroName",
          value: "db",
          token: {
            type: "IDENTIFIER",
            value: "db",
            position: {
              line: 3,
              column: 10,
              src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
            },
          },
          children: [
          ],
        },
        {
          type: "MacroArguments",
          value: "(\"main_customer\", \"Users\")",
          token: {
            type: "PAREN_OPEN",
            value: "(",
            position: {
              line: 3,
              column: 12,
              src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
            },
          },
          children: [
            {
              type: "StringLiteral",
              token: {
                type: "STRING_LITERAL",
                value: "\"main_customer\"",
                position: {
                  line: 3,
                  column: 13,
                  src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
                },
              },
              children: [
              ],
              value: "\"main_customer\"",
            },
            {
              type: "Punctuation",
              token: {
                type: "COMMA",
                value: ",",
                position: {
                  line: 3,
                  column: 28,
                  src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
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
                  line: 3,
                  column: 29,
                  src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
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
                value: "\"Users\"",
                position: {
                  line: 3,
                  column: 30,
                  src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
                },
              },
              children: [
              ],
              value: "\"Users\"",
            },
          ],
        },
      ],
    },
    {
      type: "Punctuation",
      children: [
      ],
      value: ";",
    },
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
      value: "$results",
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
      type: "Grouping",
      token: {
        type: "BRACKET_OPEN",
        value: "[",
        position: {
          line: 4,
          column: 11,
          src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
        },
      },
      children: [
      ],
    },
    {
      type: "Punctuation",
      children: [
      ],
      value: ";",
    },
    {
      type: "Newline",
      children: [
      ],
      value: "\n",
    },
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
      value: "declare",
    },
    {
      type: "Whitespace",
      children: [
      ],
      value: " ",
    },
    {
      type: "VariableIdentifier",
      children: [
      ],
      value: "search",
    },
    {
      type: "Grouping",
      token: {
        type: "PAREN_OPEN",
        value: "(",
        position: {
          line: 6,
          column: 14,
          src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
        },
      },
      children: [
        {
          type: "VariableIdentifier",
          children: [
          ],
          value: "$name",
        },
      ],
    },
    {
      type: "Whitespace",
      children: [
      ],
      value: " ",
    },
    {
      type: "Grouping",
      token: {
        type: "CURLY_OPEN",
        value: "{",
        position: {
          line: 6,
          column: 22,
          src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
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
          type: "VariableIdentifier",
          children: [
          ],
          value: "$results",
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
          type: "VariableIdentifier",
          children: [
          ],
          value: "select",
        },
        {
          type: "Whitespace",
          children: [
          ],
          value: " ",
        },
        {
          type: "VariableIdentifier",
          children: [
          ],
          value: "id",
        },
        {
          type: "Whitespace",
          children: [
          ],
          value: " ",
        },
        {
          type: "VariableIdentifier",
          children: [
          ],
          value: "from",
        },
        {
          type: "Whitespace",
          children: [
          ],
          value: " ",
        },
        {
          type: "VariableIdentifier",
          children: [
          ],
          value: "$customer",
        },
        {
          type: "Whitespace",
          children: [
          ],
          value: " ",
        },
        {
          type: "VariableIdentifier",
          children: [
          ],
          value: "where",
        },
        {
          type: "Whitespace",
          children: [
          ],
          value: " ",
        },
        {
          type: "VariableIdentifier",
          children: [
          ],
          value: "$customer",
        },
        {
          type: "Identifier",
          children: [
          ],
          value: ".",
        },
        {
          type: "VariableIdentifier",
          children: [
          ],
          value: "name",
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
          type: "VariableIdentifier",
          children: [
          ],
          value: "$name",
        },
        {
          type: "Punctuation",
          children: [
          ],
          value: ";",
        },
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
          type: "VariableIdentifier",
          children: [
          ],
          value: "$results",
        },
        {
          type: "Whitespace",
          children: [
          ],
          value: " ",
        },
        {
          type: "Operator",
          operator: 16777218,
          children: [
          ],
          value: "+",
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
          type: "VariableIdentifier",
          children: [
          ],
          value: "select",
        },
        {
          type: "Whitespace",
          children: [
          ],
          value: " ",
        },
        {
          type: "VariableIdentifier",
          children: [
          ],
          value: "id",
        },
        {
          type: "Whitespace",
          children: [
          ],
          value: " ",
        },
        {
          type: "VariableIdentifier",
          children: [
          ],
          value: "from",
        },
        {
          type: "Whitespace",
          children: [
          ],
          value: " ",
        },
        {
          type: "VariableIdentifier",
          children: [
          ],
          value: "$users",
        },
        {
          type: "Whitespace",
          children: [
          ],
          value: " ",
        },
        {
          type: "VariableIdentifier",
          children: [
          ],
          value: "where",
        },
        {
          type: "Whitespace",
          children: [
          ],
          value: " ",
        },
        {
          type: "VariableIdentifier",
          children: [
          ],
          value: "$users",
        },
        {
          type: "Identifier",
          children: [
          ],
          value: ".",
        },
        {
          type: "VariableIdentifier",
          children: [
          ],
          value: "username",
        },
        {
          type: "Whitespace",
          children: [
          ],
          value: " ",
        },
        {
          type: "VariableIdentifier",
          children: [
          ],
          value: "like",
        },
        {
          type: "Whitespace",
          children: [
          ],
          value: " ",
        },
        {
          type: "VariableIdentifier",
          children: [
          ],
          value: "$name",
        },
        {
          type: "Punctuation",
          children: [
          ],
          value: ";",
        },
        {
          type: "Whitespace",
          children: [
          ],
          value: " ",
        },
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
          type: "VariableIdentifier",
          children: [
          ],
          value: "$results",
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
          type: "VariableIdentifier",
          children: [
          ],
          value: "distinct",
        },
        {
          type: "Grouping",
          token: {
            type: "PAREN_OPEN",
            value: "(",
            position: {
              line: 9,
              column: 21,
              src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
            },
          },
          children: [
            {
              type: "VariableIdentifier",
              children: [
              ],
              value: "$results",
            },
          ],
        },
        {
          type: "Punctuation",
          children: [
          ],
          value: ";",
        },
        {
          type: "Newline",
          children: [
          ],
          value: "\n",
        },
      ],
    },
    {
      type: "Newline",
      children: [
      ],
      value: "\n",
    },
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
          line: 12,
          column: 0,
          src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
        },
      },
      value: "@search",
      children: [
        {
          type: "MacroName",
          value: "search",
          token: {
            type: "IDENTIFIER",
            value: "search",
            position: {
              line: 12,
              column: 1,
              src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
            },
          },
          children: [
          ],
        },
        {
          type: "MacroArguments",
          value: "($context.state.input)",
          token: {
            type: "PAREN_OPEN",
            value: "(",
            position: {
              line: 12,
              column: 7,
              src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
            },
          },
          children: [
            {
              type: "VariableIdentifier",
              token: {
                type: "VARIABLE",
                value: "$context",
                position: {
                  line: 12,
                  column: 8,
                  src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
                },
              },
              children: [
              ],
              value: "$context",
            },
            {
              type: "MacroArgument",
              token: {
                type: "DOT",
                value: ".",
                position: {
                  line: 12,
                  column: 8,
                  src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
                },
              },
              children: [
                {
                  type: "PropertyAccess",
                  token: {
                    type: "DOT",
                    value: ".",
                    position: {
                      line: 12,
                      column: 8,
                      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
                    },
                  },
                  children: [
                  ],
                },
              ],
            },
            {
              type: "Identifier",
              token: {
                type: "IDENTIFIER",
                value: "state",
                position: {
                  line: 12,
                  column: 8,
                  src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
                },
              },
              children: [
                {
                  type: "VariableIdentifier",
                  children: [
                  ],
                  value: "state",
                },
              ],
              value: "state",
            },
            {
              type: "MacroArgument",
              token: {
                type: "DOT",
                value: ".",
                position: {
                  line: 12,
                  column: 8,
                  src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
                },
              },
              children: [
                {
                  type: "PropertyAccess",
                  token: {
                    type: "DOT",
                    value: ".",
                    position: {
                      line: 12,
                      column: 8,
                      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
                    },
                  },
                  children: [
                  ],
                },
              ],
            },
            {
              type: "Identifier",
              token: {
                type: "IDENTIFIER",
                value: "input",
                position: {
                  line: 12,
                  column: 8,
                  src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
                },
              },
              children: [
                {
                  type: "VariableIdentifier",
                  children: [
                  ],
                  value: "input",
                },
              ],
              value: "input",
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
        value: "# host server",
        position: {
          line: 1,
          column: 1,
          src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/12 SearchForName.rxs",
        },
      },
      children: [
      ],
      value: "# host server",
      directiveType: null,
    },
  ],
  value: null,
};