const chartSchema = {
  type: 'object',
  properties: {
    data: {
      type: 'array',
      items: {
        type: 'object',
        properties: {

        }
      }
    },
    options: {
      type: 'object'
    }
  }
}

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
          enum: [
            'me',
            'team',
            'custom'
          ]
        },                
      },
    },    
    charts: {
      type: 'object',
      title: 'Charts',
      description: 'Charts Container',
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
        quoteStatusPie: {
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
        },
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
