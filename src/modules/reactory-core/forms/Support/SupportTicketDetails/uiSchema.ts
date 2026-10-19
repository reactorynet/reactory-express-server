import Reactory from '@reactorynet/reactory-core';

/**
 * Renders the ticket through the same tabbed detail panel the grids expand.
 *
 * Mounting the panel as the form's only field (instead of duplicating its
 * tabs) means the details page and the expanded grid row can never drift apart:
 * comments, attachments, activity and related tickets behave identically in
 * both places.
 */
const BaseUISchema: Reactory.Schema.IFormUISchema = {
  'ui:form': {
    componentType: 'div',
    showSubmit: false,
    showRefresh: false,
    toolbarPosition: 'top',
    toolbarStyle: {
      display: 'flex',
      justifyContent: 'flex-end',
    },
  },
  // @ts-ignore
  'ui:title': {
    jss: {
      paddingLeft: '24px',
    },
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      ticket: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 },
    },
  ],
  ticket: {
    'ui:title': null,
    'ui:widget': 'core.SupportTicketDetailPanel@1.0.0',
    // The panel's contract is `ticket`; the form holds it under `formData`.
    'ui:props-map': {
      formData: 'ticket',
    },
  },
};

export default BaseUISchema;
