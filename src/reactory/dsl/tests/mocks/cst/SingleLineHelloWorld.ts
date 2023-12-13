import { CSTProgramNode } from "@reactory/server-core/types/compiler/cst";

export const SingleLineHelloWorldProgramNode: CSTProgramNode = {
  type: "Program",
  token: null,
  children: [
    {
      type: "MacroInvocation",
      token: {
        type: "MACRO_START",
        value: "@",
        position: {
          line: 1,
          column: 1,
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
              column: 2,
            },
          },
          children: [
          ],
        },
        {
          type: "MacroArguments",
          value: "(\"Hello, World!\")",
          token: {
            type: "PAREN_OPEN",
            value: "(",
            position: {
              line: 1,
              column: 7,
            },
          },
          children: [
            {
              type: "StringLiteral",
              token: {
                type: "STRING_LITERAL",
                value: "\"Hello, World!\"",
                position: {
                  line: 1,
                  column: 8,
                },
              },
              children: [
              ],
              value: "\"Hello, World!\"",
            },
          ],
        },
      ],
    },
  ],
};
