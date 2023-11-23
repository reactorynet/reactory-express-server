import { CSTProgramNode } from "@reactory/server-core/types/compiler/cst";

/**
 * 
// In this example, the `@computeDiscount` macro is nested within the `@applyDiscount` macro.
@applyDiscount(@computeDiscount($cartTotal, $customerType), $customerId)
 */

export const NestedMacroInvocationScript: string = `
// In this example, the @computeDiscount macro is nested within the @applyDiscount macro.

@applyDiscount(@computeDiscount($cartTotal, $customerType), $customerId)
`;

export const NestedMacroInvocationProgramNode: CSTProgramNode = { 
  type: 'Program',
  children: [
    {
      type: 'MacroInvocation',
      value: '@',
      children: [
        {
          type: 'MacroName',
          children: [],
          value: 'applyDiscount',
        },
        {
          type: 'MacroArguments',
          value: '(@computeDiscount($cartTotal, $customerType), $customerId)',
          children: [
            {
              type: 'MacroInvocation',
              value: '@',
              children: [
                {
                  type: 'MacroName',
                  children: [],
                  value: 'computeDiscount',
                },
                {
                  type: 'MacroArguments',
                  value: '($cartTotal, $customerType)',
                  children: [
                    {
                      type: 'VariableIdentifier',
                      children: [],
                      value: '$cartTotal',
                    },
                    {
                      type: 'Punctuation',
                      children: [],
                      value: ',',
                    },
                    {
                      type: 'Whitespace',
                      children: [],
                      value: ' ',
                    },
                    {
                      type: 'VariableIdentifier',
                      children: [],
                      value: '$customerType',
                    },
                  ],
                },
              ],
            },
            {
              type: 'Punctuation',
              children: [],
              value: ',',
            },
            {
              type: 'Whitespace',
              children: [],
              value: ' ',
            },
            {
              type: 'VariableIdentifier',
              children: [],
              value: '$customerId',
            },
          ],
        },
      ],
    },
  ]
};
