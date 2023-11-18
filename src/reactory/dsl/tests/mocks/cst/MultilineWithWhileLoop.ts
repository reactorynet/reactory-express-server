import { CSTProgramNode } from "@reactory/server-core/types/compiler/cst";


/**
 * Program with a while loop. for the following 
 * reactory script
 * 
 * ```
 *  while ($i < 10) {
 *    @print($i)
 *    $i = $i + 1
 *  }
 * ```
 */
export const MultilineWithWhileLoopCSTProgramNode: CSTProgramNode = { 
  type: 'Program',
  children: [
    {
      type: 'Whitespace',
      children: [],
      value: '\n    ',
    },
    {
      type: 'WhileControl',
      condition: {
        type: 'Grouping',
        children: [
          {
            type: 'VariableIdentifier',
            children: [],
            value: '$i',
          },
          {
            type: 'Whitespace',
            children: [],
            value: ' ',
          },
          {
            type: 'ComparisonOperator',
            children: [],
            value: '<',
          },
          {
            type: 'Whitespace',
            children: [],
            value: ' ',
          },
          {
            type: 'Literal',
            children: [],
            value: '10',
          },
        ],
      },
      body: {
        type: 'Grouping',
        children: [
          {
            type: 'Whitespace',
            children: [],
            value: '\n      ',
          },
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
                value: '($i)',
                children: [
                  {
                    type: 'VariableIdentifier',
                    children: [],
                    value: '$i',
                  },
                ],
              },
            ],
          },
          {
            type: 'Whitespace',
            children: [],
            value: '\n      ',
          },
          {
            type: 'AssignmentOperator',
            children: [],
            value: '=',
          },
          {
            type: 'Whitespace',
            children: [],
            value: ' ',
          },
          {
            type: 'BinaryOperator',
            children: [],
            value: '+',
          },
          {
            type: 'Whitespace',
            children: [],
            value: ' ',
          },
          {
            type: 'Literal',
            children: [],
            value: '1',
          },
          {
            type: 'Whitespace',
            children: [],
            value: '\n    ',
          },
        ],
      },
    },
    {
      type: 'Whitespace',
      children: [],
      value: '\n  ',
    },
  ],
};
};