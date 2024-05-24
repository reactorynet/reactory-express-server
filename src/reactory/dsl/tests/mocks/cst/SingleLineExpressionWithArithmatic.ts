import { CSTProgramNode, Operator } from "@reactory/server-core/types/compiler/cst";


export const SingleLineExpressionWithArithmaticProgramNode: CSTProgramNode = {
  type: "Program",
  token: null,
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
  ],
}