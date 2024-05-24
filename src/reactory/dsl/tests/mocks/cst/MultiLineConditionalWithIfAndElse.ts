import { CSTProgramNode } from "@reactory/server-core/types/compiler/cst";

/**
 * This is a mock of the following DSL code:
 * 
 * ```
 *   if ($name == "John") {
 *     @print("Hello, John!")
 *   } else {
 *     @print("Hello, Stranger!")
 *   }
 * ```
 */
export const MultiLineWithConditionalWithElseProgramNode: CSTProgramNode = {
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
      type: "Whitespace",
      children: [
      ],
      value: "    ",
    },
    {
      type: "IfControl",
      condition: {
        type: "Grouping",
        token: {
          type: "PAREN_OPEN",
          value: "(",
          position: {
            line: 2,
            column: 7,
            src: undefined,
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
            line: 2,
            column: 25,
            src: undefined,
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
            value: "      ",
          },
          {
            type: "MacroInvocation",
            token: {
              type: "MACRO_START",
              value: "@",
              position: {
                line: 3,
                column: 6,
                src: undefined,
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
                    line: 3,
                    column: 7,
                    src: undefined,
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
                    line: 3,
                    column: 12,
                    src: undefined,
                  },
                },
                children: [
                  {
                    type: "StringLiteral",
                    token: {
                      type: "STRING_LITERAL",
                      value: "\"Hello, John!\"",
                      position: {
                        line: 3,
                        column: 13,
                        src: undefined,
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
          {
            type: "Whitespace",
            children: [
            ],
            value: "    ",
          },
        ],
      },
      elifBranches: [
      ],
      elseBranch: {
        type: "ElseBranch",
        thenBranch: {
          type: "Grouping",
          token: {
            type: "CURLY_OPEN",
            value: "{",
            position: {
              line: 4,
              column: 11,
              src: undefined,
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
              value: "      ",
            },
            {
              type: "MacroInvocation",
              token: {
                type: "MACRO_START",
                value: "@",
                position: {
                  line: 5,
                  column: 6,
                  src: undefined,
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
                      line: 5,
                      column: 7,
                      src: undefined,
                    },
                  },
                  children: [
                  ],
                },
                {
                  type: "MacroArguments",
                  value: "(\"Hello, Stranger!\")",
                  token: {
                    type: "PAREN_OPEN",
                    value: "(",
                    position: {
                      line: 5,
                      column: 12,
                      src: undefined,
                    },
                  },
                  children: [
                    {
                      type: "StringLiteral",
                      token: {
                        type: "STRING_LITERAL",
                        value: "\"Hello, Stranger!\"",
                        position: {
                          line: 5,
                          column: 13,
                          src: undefined,
                        },
                      },
                      children: [
                      ],
                      value: "\"Hello, Stranger!\"",
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
            {
              type: "Whitespace",
              children: [
              ],
              value: "    ",
            },
          ],
        },
        children: [
        ],
        value: "undefined ",
      },
      value: null,
      children: [
        {
          type: "Whitespace",
          children: [
          ],
          value: " ",
        },
      ],
    },
  ],
}