import { PieChart } from '@reactory/server-modules/core/schema/formSchema';
import { nextActions } from '@reactory/server-modules/lasec/schema/formSchema';

export default {
  type: 'object',
  title: '',
  properties: {
    toolbar: {
      type: 'object',
      title: 'Filter',
      dependencies: {
        period: {
          oneOf: [
            { properties:
              {
                period: {
                  enum: ["custom"],
                },
                periodStart: {
                  type: 'string',
                  title: 'Period Start',
                  description: 'Start of the period for which to collate quote data',
                },
                periodEnd: {
                  type: 'string',
                  title: 'Period End',
                  description: 'End of the period for which to collate quote data',
                },
              }
            },
            {
              properties:
              {
                period: {
                  enum: [
                    'today',
                    'yesterday',
                    'this-week',
                    'last-week',
                    'this-month',
                    'last-month',
                    'this-year',
                    'last-year',
                  ]
                },
              }
            },
          ]
        },
        agentSelection: {
          oneOf: [
            //me filter
            {
              properties: {
                agentSelection: {
                  enum: ['me']
                },
              }
            },
            //team filter
            {
              agentSelection: {
                enum: ['team']
              },
              teamFilter: {
                tile: 'Team Filter',
                type: 'string',
              }
            },
            //customer filter
            {
              agentSelection: {
                enum: ['custom']
              },
              agentFilter: {
                type: 'array',
                title: 'Selected Reps',
                items: {
                  type: 'object',
                  properties: {
                    id: {
                      title: 'User Id',
                      type: 'string'
                    },
                    firstName: {
                      type: 'String',
                      title: 'Firstname'
                    },
                    lastName: {
                      type: 'String',
                      title: 'Lastname'
                    }
                  }
                }
              }
            },
          ]
        }
      },
      properties: {
        period: {
          type: 'string',
          title: 'Period',
          description: 'Select the time period for which you want to generate the dashboard',
          enum: [
            'today',
            'yesterday',
            'this-week',
            'last-week',
            'this-month',
            'last-month',
            'this-year',
            'last-year',
            'custom',
          ],
        },
        agentSelection: {
          type: 'string',
          title: 'Filter Reps / User',
          description: 'Select a User or Rep',
          enum: [
            'me',
            'team',
            'custom'
          ]
        },
        productClass: {
          title: 'Product Class',
          description: 'Select a product class.',
          type: 'array',
          items: {
            type: 'object',
            properies: {
              id: {
                title: 'Produc Class Id',
                type: 'string'
              },
              productName: {
                title: 'Produc Class Name',
                type: 'string'
              }
            }
          }
        },
      },
    },
    charts: {
      type: 'object',
      title: 'Charts',
      description: 'Charts Container',
      properties: {
        quoteProductFunnel: {
          type: 'object',
          title: 'Quote Product Funnel',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                title: 'Data Point',
                properties: {
                  value: {
                    type: 'number',
                    title: 'value',
                  },
                  name: {
                    type: 'string',
                    title: 'name'
                  },
                  fill: {
                    type: 'string',
                    title: 'fillcolor'
                  }
                }
              }
            },
          },
        },
        quoteProductPie: PieChart("quoteProductPie"),
        quoteISOPie: PieChart("quoteISOPie"),
        quoteINVPie: PieChart("quoteINVPie"),
        quoteStatusComposed: {
          type: 'object',
          title: 'Quote Status Funnel',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  value: {
                    type: 'number',
                    title: 'value',
                  },
                  name: {
                    type: 'string',
                    title: 'name'
                  },
                  fill: {
                    type: 'string',
                    title: 'fillcolor'
                  }
                }
              }
            }
          }
        }
      }
    },
    nextActions: {
      ...nextActions
    },
    targetPercent: {
      type: 'number',
      title: 'Target Percent'
    },
    target: {
      type: 'number',
      title: 'Target ZAR'
    },
    totalQuotes: {
      type: 'number',
      title: 'Total Good',
    },
    totalBad: {
      type: 'number',
      title: 'Total Bad',
    },
    combinedData: {
      type: 'string',
      title: 'combined'
    },
    productSummary: {
      title: 'Product Funnel',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          statusGroup: {
            type: 'string',
            title: 'Status Group',
          },
          statusKey: {
            type: 'string',
            title: 'Status Key',
          },
          status: {
            type: 'string',
            title: 'status',
          },
          good: {
            type: 'number',
            title: 'Good',
          },
          naughty: {
            type: 'number',
            title: '',
          },
        },
      },
    },
    quotes: {
      type: 'array',
      title: 'Quote Grid',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            title: 'Quote Id',
          },
          code: {
            type: 'string',
            title: 'Code',
          },
          statusName: {
            type: 'string',
            title: 'Status',
          },
          productClass: {
            type: 'string',
            title: 'Product Class',
          },
          companyTradingName: {
            type: 'string',
            title: 'Company',
          },
          customerName: {
            type: 'string',
            title: 'Customer',
          },
          totalVATExclusive: {
            type: 'number',
            title: 'Total Vat (Excl)',
          },
          totalVATInclusive: {
            type: 'number',
            title: 'Total Vat (Incl)',
          },
        },
      },
    },
  },
};
