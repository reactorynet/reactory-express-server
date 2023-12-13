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
      type: "Comment",
      children: [
      ],
      value: "// In this example, the @computeDiscount macro is nested within the @applyDiscount macro.",
    },
    {
      type: "Newline",
      children: [
      ],
      value: "\n",
    },
    {
      type: "Newline",
      children: [
      ],
      value: "\n",
    },
    {
      type: "MacroInvocation",
      token: {
        type: "MACRO_START",
        value: "@",
        position: {
          line: 4,
          column: 0,
          src: undefined,
        },
      },
      value: "@applyDiscount",
      children: [
        {
          type: "MacroName",
          value: "applyDiscount",
          token: {
            type: "IDENTIFIER",
            value: "applyDiscount",
            position: {
              line: 4,
              column: 1,
              src: undefined,
            },
          },
          children: [
          ],
        },
        {
          type: "MacroArguments",
          value: "(@, $customerId)",
          token: {
            type: "PAREN_OPEN",
            value: "(",
            position: {
              line: 4,
              column: 14,
              src: undefined,
            },
          },
          children: [
            {
              type: "MacroInvocation",
              token: {
                type: "MACRO_START",
                value: "@",
                position: {
                  line: 4,
                  column: 15,
                  src: undefined,
                },
              },
              children: [
                {
                  type: "MacroInvocation",
                  token: {
                    type: "MACRO_START",
                    value: "@",
                    position: {
                      line: 4,
                      column: 15,
                      src: undefined,
                    },
                  },
                  value: "@computeDiscount",
                  children: [
                    {
                      type: "MacroName",
                      value: "computeDiscount",
                      token: {
                        type: "IDENTIFIER",
                        value: "computeDiscount",
                        position: {
                          line: 4,
                          column: 16,
                          src: undefined,
                        },
                      },
                      children: [
                      ],
                    },
                    {
                      type: "MacroArguments",
                      value: "($cartTotal, $customerType)",
                      token: {
                        type: "PAREN_OPEN",
                        value: "(",
                        position: {
                          line: 4,
                          column: 31,
                          src: undefined,
                        },
                      },
                      children: [
                        {
                          type: "VariableIdentifier",
                          token: {
                            type: "VARIABLE",
                            value: "$cartTotal",
                            position: {
                              line: 4,
                              column: 32,
                              src: undefined,
                            },
                          },
                          children: [
                          ],
                          value: "$cartTotal",
                        },
                        {
                          type: "Punctuation",
                          token: {
                            type: "COMMA",
                            value: ",",
                            position: {
                              line: 4,
                              column: 42,
                              src: undefined,
                            },
                          },
                          children: [
                          ],
                          value: ",",
                        },
                        {
                          type: "Whitespace",
                          token: {
                            type: "WHITESPACE",
                            value: " ",
                            position: {
                              line: 4,
                              column: 43,
                              src: undefined,
                            },
                          },
                          children: [
                          ],
                          value: " ",
                        },
                        {
                          type: "VariableIdentifier",
                          token: {
                            type: "VARIABLE",
                            value: "$customerType",
                            position: {
                              line: 4,
                              column: 44,
                              src: undefined,
                            },
                          },
                          children: [
                          ],
                          value: "$customerType",
                        },
                      ],
                    },
                  ],
                },
              ],
              value: "@",
            },
            {
              type: "Punctuation",
              token: {
                type: "COMMA",
                value: ",",
                position: {
                  line: 4,
                  column: 58,
                  src: undefined,
                },
              },
              children: [
              ],
              value: ",",
            },
            {
              type: "Whitespace",
              token: {
                type: "WHITESPACE",
                value: " ",
                position: {
                  line: 4,
                  column: 59,
                  src: undefined,
                },
              },
              children: [
              ],
              value: " ",
            },
            {
              type: "VariableIdentifier",
              token: {
                type: "VARIABLE",
                value: "$customerId",
                position: {
                  line: 4,
                  column: 60,
                  src: undefined,
                },
              },
              children: [
              ],
              value: "$customerId",
            },
          ],
        },
      ],
    },
    {
      type: "Newline",
      children: [
      ],
      value: "\n",
    },
  ],
};
