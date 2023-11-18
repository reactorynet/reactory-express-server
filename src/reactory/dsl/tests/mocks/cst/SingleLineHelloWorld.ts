import { CSTProgramNode } from "@reactory/server-core/types/compiler/cst";

export const SingleLineHelloWorldProgramNode: CSTProgramNode = {
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
