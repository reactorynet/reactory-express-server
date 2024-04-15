export default {
  type: "Program",
  token: null,
  acl: null,
  directives: [],
  value: null,
  children: [
    {
      type: "WhileLoop",
      children: [
      ],
      value: "while",
    },
    {
      type: "Grouping",
      token: {
        type: "PAREN_OPEN",
        value: "(",
        position: {
          line: 1,
          column: 6,
          src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/10 PrintNameInForLoop.rxs",
        },
      },
      children: [
        {
          type: "VariableIdentifier",
          children: [
          ],
          value: "$count",
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
          value: "<",
        },
        {
          type: "Whitespace",
          children: [
          ],
          value: " ",
        },
        {
          type: "NumberLiteral",
          children: [
          ],
          value: "10",
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
          line: 1,
          column: 20,
          src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/10 PrintNameInForLoop.rxs",
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
              src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/10 PrintNameInForLoop.rxs",
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
                  src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/10 PrintNameInForLoop.rxs",
                },
              },
              children: [
              ],
            },
            {
              type: "MacroArguments",
              value: "(`Hello $name, $count`)",
              token: {
                type: "PAREN_OPEN",
                value: "(",
                position: {
                  line: 2,
                  column: 8,
                  src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/10 PrintNameInForLoop.rxs",
                },
              },
              children: [
                {
                  type: "StringInterpolation",
                  token: {
                    type: "EXECUTABLE_STRING_LITERAL",
                    value: "`Hello $name, $count`",
                    position: {
                      line: 2,
                      column: 9,
                      src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/10 PrintNameInForLoop.rxs",
                    },
                  },
                  children: [
                    {
                      type: "StringInterpolation",
                      value: "`Hello $name, $count`",
                      token: {
                        type: "EXECUTABLE_STRING_LITERAL",
                        value: "`Hello $name, $count`",
                        position: {
                          line: 2,
                          column: 9,
                          src: "reactory-server-express/src/reactory/dsl/tests/mocks/scripts/NameProgram/10 PrintNameInForLoop.rxs",
                        },
                      },
                      children: [
                      ],
                    },
                  ],
                  value: "`Hello $name, $count`",
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
    {
      type: "Newline",
      children: [
      ],
      value: "\n",
    },
  ],
};