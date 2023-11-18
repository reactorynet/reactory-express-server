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
  children: [
    {
      type: "Whitespace",
      children: [
      ],
      value: "\n    ",
    },
    {
      type: "IfControl",
      condition: {
        type: "Grouping",
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
            type: "Literal",
            children: [
            ],
            value: "\"John\"",
          },
        ],
      },
      thenBranch: {
        type: "Grouping",
        children: [
          {
            type: "Whitespace",
            children: [
            ],
            value: "\n      ",
          },
          {
            type: "MacroInvocation",
            value: "@",
            children: [
              {
                type: "MacroName",
                value: "print",
                children: [
                ],
              },
              {
                type: "MacroArguments",
                value: "(\"Hello, John!\")",
                children: [
                  {
                    type: "StringLiteral",
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
            value: "\n    ",
          },
        ],
      },
      elifBranches: [
      ],
      elseBranch: {
        type: "ElseBranch",
        thenBranch: {
          type: "Grouping",
          children: [
            {
              type: "Whitespace",
              children: [
              ],
              value: "\n      ",
            },
            {
              type: "MacroInvocation",
              value: "@",
              children: [
                {
                  type: "MacroName",
                  value: "print",
                  children: [
                  ],
                },
                {
                  type: "MacroArguments",
                  value: "(\"Hello, Stranger!\")",
                  children: [
                    {
                      type: "StringLiteral",
                      children: [
                      ],
                      value: "\"Hello, Stranger!\"",
                    },
                  ],
                },
              ],
            },
            {
              type: "Whitespace",
              children: [
              ],
              value: "\n    ",
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