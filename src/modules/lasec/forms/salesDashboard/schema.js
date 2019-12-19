import { PieChart } from '@reactory/server-modules/core/schema/formSchema';
import { nextActions } from '@reactory/server-modules/lasec/schema/formSchema';

const userFilter = {
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

export default {
  type: 'object',
  title: '',
  properties: {
    toolbar: {
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
          description: 'Select user / teams for which you want to view the dashboard',
          default: 'me',
          enum: [
            'me',
            'team',
            'custom'
          ],
        },        
      },
    },
    charts: {
      type: 'object',
      title: 'Overview',      
      properties: {
        quoteStatusFunnel: {
          type: 'object',
          title: 'Quote Status Funnel',
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
        quoteStatusPie: PieChart("quoteStatusPie"),
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
    statusSummary: {
      title: 'Status Funnel',
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
          created: {
            type: 'string',
            title: 'Created'
          },
          modified: {
            type: 'string',
            title: 'Modified'
          },
          code: {
            type: 'string',
            title: 'Code',
          },
          statusName: {
            type: 'string',
            title: 'Status',
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
