
const uiSchema = {    
  quote_id: {
    
  },
};

export default uiSchema;

/**
 * 
 * 
 *  /*
    'ui:widget': 'QuoteStatusWidget',
    'ui:options': {
      filter: {
        predicate: { group: '${props.formContext.formData.statusGroup || "1"}' },
      },
      steps: [
        {
          group: '1', groupTitle: 'Draft', key: '1-1', value: '1-1', label: 'Pending Submission', step: 0,
        },
        {
          group: '1', groupTitle: 'Draft', key: '1-2', value: '1-2', label: 'Awaiting Approval', step: 1,
        },
        {
          group: '1', groupTitle: 'Draft', key: '1-3', value: '1-3', label: 'Approved', step: 2,
        },
        {
          group: '1', groupTitle: 'Draft', key: '1-4', value: '1-4', label: 'Declined', step: 3,
        },
        {
          group: '2', groupTitle: 'Open', key: '2-1', value: '2-1', label: 'Quote Submitted', step: 1,
        },
        {
          group: '2', groupTitle: 'Open', key: '2-2', value: '2-2', label: 'Under Assessment', step: 2,
        },
        {
          group: '2', groupTitle: 'Open', key: '2-3', value: '2-3', label: 'Budget Timeline', step: 3,
        },
        {
          group: '2', groupTitle: 'Open', key: '2-4', value: '2-4', label: 'Pricing Negotiation', step: 4,
        },
        {
          group: '2', groupTitle: 'Open', key: '2-5', value: '2-5', label: 'Awaiting Purchase Order', step: 5,
        },
        {
          group: '2', groupTitle: 'Open', key: '2-6', value: '2-6', label: 'Purchase Order Received', step: 6,
        },
        {
          group: '3', groupTitle: 'Accepted', key: '3-2', value: '3-2', label: 'Accepted Fully', step: 1,
        },
        {
          group: '3', groupTitle: 'Accepted', key: '3-3', value: '3-3', label: 'Partially Accepted', step: 2,
        },
        {
          group: '3', groupTitle: 'Accepted', key: '3-4', value: '3-4', label: 'Job Card', step: 3,
        },
        {
          group: '4', groupTitle: 'Draft', key: '4-2', value: '4-2', label: 'Lost - Price', step: 1,
        },
        {
          group: '4', groupTitle: 'Draft', key: '4-3', value: '4-3', label: 'Lost - Funds', step: 2,
        },
        {
          group: '4', groupTitle: 'Draft', key: '4-4', value: '4-4', label: 'Lost - No Stock', step: 3,
        },
        {
          group: '4', groupTitle: 'Draft', key: '4-5', value: '4-5', label: 'Lost - No Info', step: 4,
        },
        {
          group: '4', groupTitle: 'Draft', key: '4-6', value: '4-6', label: 'Lost - Lead Time', step: 5,
        },
        {
          group: '4', groupTitle: 'Draft', key: '4-7', value: '4-7', label: 'Other (specify)', step: 6,
        },
        {
          group: '5', groupTitle: 'Draft', key: '5-2', value: '5-2', label: 'Expired - Awaiting Feedback', step: 1
        },
        {
          group: '5', groupTitle: 'Draft', key: '5-3', value: '5-3', label: 'Expired - Awaiting Budget', step: 2
        }
      ],
    },
    
  },

  nextStatus: {
    'ui:widget': 'StepperWidget',
    'ui:options': {      
      steps: [
        {
          group: '1', groupTitle: 'Draft', key: '1-1', value: '1-1', label: 'Pending Submission', step: 0,
        },
        {
          group: '1', groupTitle: 'Draft', key: '1-2', value: '1-2', label: 'Awaiting Approval', step: 1,
        },
        {
          group: '1', groupTitle: 'Draft', key: '1-3', value: '1-3', label: 'Approved', step: 2,
        },
        {
          group: '1', groupTitle: 'Draft', key: '1-4', value: '1-4', label: 'Declined', step: 3,
        },
        {
          group: '2', groupTitle: 'Open', key: '2-5', value: '2-1', label: 'Quote Submitted', step: 1,
        },
        {
          group: '2', groupTitle: 'Open', key: '2-6', value: '2-2', label: 'Under Assessment', step: 2,
        },
        {
          group: '2', groupTitle: 'Open', key: '2-7', value: '2-3', label: 'Budget Timeline', step: 3,
        },
        {
          group: '2', groupTitle: 'Open', key: '2-8', value: '2-4', label: 'Pricing Negotiation', step: 4,
        },
        {
          group: '2', groupTitle: 'Open', key: '2-9', value: '2-5', label: 'Awaiting Purchase Order', step: 5,
        },
        {
          group: '2', groupTitle: 'Open', key: '2-10', value: '2-6', label: 'Purchase Order Received', step: 6,
        },
        {
          group: '3', groupTitle: 'Accepted', key: '3-11', value: '3-2', label: 'Accepted Fully', step: 1,
        },
        {
          group: '3', groupTitle: 'Accepted', key: '3-12', value: '3-3', label: 'Partially Accepted', step: 2,
        },
        {
          group: '3', groupTitle: 'Accepted', key: '3-13', value: '3-4', label: 'Job Card', step: 3,
        },
        {
          group: '4', groupTitle: 'Draft', key: '4-14', value: '4-2', label: 'Lost - Price', step: 1,
        },
        {
          group: '4', groupTitle: 'Draft', key: '4-15', value: '4-3', label: 'Lost - Funds', step: 2,
        },
        {
          group: '4', groupTitle: 'Draft', key: '4-16', value: '4-4', label: 'Lost - No Stock', step: 3,
        },
        {
          group: '4', groupTitle: 'Draft', key: '4-17', value: '4-5', label: 'Lost - No Info', step: 4,
        },
        {
          group: '4', groupTitle: 'Draft', key: '4-18', value: '4-6', label: 'Lost - Lead Time', step: 5,
        },
        {
          group: '4', groupTitle: 'Draft', key: '4-19', value: '4-7', label: 'Other (specify)', step: 6,
        },
        {
          group: '5', groupTitle: 'Draft', key: '5-20', value: '5-2', label: 'Expired - Awaiting Feedback', step: 1
        },
        {
          group: '5', groupTitle: 'Draft', key: '5-21', value: '5-3', label: 'Expired - Awaiting Budget', step: 2
        },
        {
          group: '6', groupTitle: 'REFS', key: '3-22', isGroup: true, items: ['3-11','3-12','3-13'], value: '3-22', label: 'Step Refrences (3-22)'
        },
        {
          group: '6', groupTitle: 'REFS', key: '4-23', isGroup: true, items: ['1-1','4-14','4-15','4-16','4-17','4-18','4-19'], value: '4-23', label: 'Step Refrences (4-23)'
        },
        {
          group: '6', groupTitle: 'REFS', key: '5-24', isGroup: true, items: ['1-1','5-20','5-12'], value: '4-23', label: 'Step Refrences (4-23)'
        },
      ],
    }
  },

  */

