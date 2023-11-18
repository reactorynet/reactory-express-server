import { CSTProgramNode } from "@reactory/server-core/types/compiler/cst";


export const MultiLineWithVariableAssignmentProgramNode: CSTProgramNode = {
  type: "Program",
  children: [
    {
      type: "Assignment",
      left: {
        type: "VariableIdentifier",
        children: [],
        value: "$name"
      },
      right: {
        type: "Literal",
        children: [],
        value: "\"John\""
      }
    }
  ]
};