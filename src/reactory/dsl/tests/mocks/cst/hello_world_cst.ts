import { CSTNode, CSTProgramNode } from "types/compiler/cst";

export const mockHelloWorldProgramNode: CSTProgramNode = {
  type: 'Program',
  children: [
    {
      type: 'MacroInvocation',
      value: '@',
      children: [
        {
          type: 'MacroName',
          children: [],
          value: 'print',
        },
        {
          type: 'MacroArguments',
          value: '("Hello, World!")',
          children: [
            {
              type: 'StringLiteral',
              children: [],
              value: '"Hello, World!"',
            },
          ],
        },
      ],
    },
  ]
};
