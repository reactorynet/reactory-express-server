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
              value: "($i)",
              children: [
                {
                  type: "VariableIdentifier",
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
          operator: 16777218 as Operator,
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
