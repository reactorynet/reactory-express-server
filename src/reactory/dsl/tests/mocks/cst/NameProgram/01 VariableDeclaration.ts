import { CSTProgramNode } from "@reactory/server-core/types/compiler/cst";

const _01_VariableDeclaration: CSTProgramNode = {
  type: "Program",
  token: null,
  acl: null,
  directives: [],
  value: null,
  children: [
    {
      type: "VariableDeclaration",
      readonly: false,
      children: [
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
          type: "StringLiteral",
          children: [
          ],
          value: "\"John\"",
        },
        {
          type: "Punctuation",
          children: [
          ],
          value: ";",
        },
      ],
      value: "var",
    },
  ],
};

export default _01_VariableDeclaration;