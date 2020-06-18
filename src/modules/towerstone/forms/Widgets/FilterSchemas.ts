
export const PeriodToolbarSchema = {
  type: 'object',
  title: 'Filter',
  required: [
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
  },
}