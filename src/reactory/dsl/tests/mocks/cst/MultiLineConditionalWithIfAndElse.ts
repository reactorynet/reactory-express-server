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