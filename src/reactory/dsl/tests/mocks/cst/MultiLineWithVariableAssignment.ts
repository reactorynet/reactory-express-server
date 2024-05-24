import { CSTProgramNode } from "@reactory/server-core/types/compiler/cst";


export const MultiLineWithVariableAssignmentProgramNode: CSTProgramNode = {
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
};