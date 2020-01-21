import { PieChart } from '@reactory/server-modules/core/schema/formSchema';
import { nextActions } from '@reactory/server-modules/lasec/schema/formSchema';

const userFilter = {
  type: 'array',
  title: 'Selected Reps',
  items: {
    type: 'object',
    title: 'Sales Reps',
    properties: {
      id: {
        title: 'User Id',
        type: 'string'
      },
      firstName: {
        type: 'string',
        title: 'Firstname'
      },
      lastName: {
        type: 'string',
        title: 'Lastname'
      }
    }
  }
};

/**
 * Toolbar schema definition
 */
const $toolbar = {
  type: 'object',
  title: 'Filter',
  required: [
    "agentSelection",
    "period"
  ],
  dependencies: {
    period: {
      oneOf: [
        {
          properties:
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
          },
        },
        //team filter
        {
          properties: {
            agentSelection: {
              enum: ['team']
            },
            teamFilter: {
              title: 'Team Filter',
              type: 'array',
              items: {
                type: 'string'
              }
            },
          },
          required: [
            "teamFilter"
          ]
        },
        //custom filter
        {
          properties: {
            agentSelection: {
              enum: ['custom']
            },
            userFilter,
          },
          required: [
            "userFilter"
          ]
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
            title: 'Product Class Name',
            type: 'string'
          }
        }
      }
    },
  },
};

export default {
  type: 'object',
  title: '',
  properties: {
    toolbar: $toolbar,
    charts: {
      type: 'object',
      title: 'Charts',
      description: 'Charts Container',
      properties: {        
        quoteProductPie: PieChart("quoteProductPie"),      
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
          productClassDescription: {
            type: 'string',
            title: 'Product Class Description'
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
        },
      },
    },
  },
};
