import { CSTProgramNode, Operator } from "@reactory/server-core/types/compiler/cst";


/**
 * Program with a while loop. for the following 
 * reactory script
 * 
 * ```
 *  while ($i < 10) {
 *    print(`row $i`)
 *    $i = $i + 1
 *  }
 * ```
 */
export const MultilineWithWhileLoopCSTProgramNode: CSTProgramNode = {
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
      type: "WhileLoop",
      children: [
      ],
      value: "while",
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
        type: "PAREN_OPEN",
        value: "(",
        position: {
          line: 2,
          column: 10,
          src: undefined,
        },
      },
      children: [
        {
          type: "VariableIdentifier",
          children: [
          ],
          value: "$i",
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
          line: 2,
          column: 20,
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
              value: "($i)",
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
                  type: "VariableIdentifier",
                  token: {
                    type: "VARIABLE",
                    value: "$i",
                    position: {
                      line: 3,
                      column: 13,
                      src: undefined,
                    },
                  },
                  children: [
                  ],
                  value: "$i",
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
          value: "      ",
        },
        {
          type: "VariableIdentifier",
          children: [
          ],
          value: "$i",
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
          value: "$i",
        },
        {
          type: "Whitespace",
          children: [
          ],
          value: " ",
        },
        {
          type: "Operator",
          operator: 16777218 as any,
          children: [
          ],
          value: "+",
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
          value: "1",
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
          value: "    ",
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
      value: "  ",
    },
  ],
}