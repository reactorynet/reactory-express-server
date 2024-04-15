import { ProgramNode } from "@reactory/server-core/types/compiler/ast";

const VariableDeclarationProgramNode: ProgramNode ={
  type: "Program",
  options: {
    strict: false,
    version: "0.0.1",
    mode: "script",
  },
  body: [
    {
      type: "Variable",
      name: "name",
      right: {
        type: "StringLiteral",
        value: "\"John\"",
      },
      operation: "declare",
    },
  ],
};

export default VariableDeclarationProgramNode;
