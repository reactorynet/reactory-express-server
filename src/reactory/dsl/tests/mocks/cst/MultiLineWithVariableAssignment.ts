import { CSTProgramNode } from "@reactory/server-core/types/compiler/cst";


export const MultiLineWithVariableAssignmentProgramNode: CSTProgramNode = {
  type: "Program",
  children: [
    {
      type: "Whitespace",
      children: [
      ],
      value: "\n    ",
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
      type: "Literal",
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
      type: "Whitespace",
      children: [
      ],
      value: "\n    ",
    }
  ],
};