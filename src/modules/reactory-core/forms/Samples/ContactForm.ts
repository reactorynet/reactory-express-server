import Reactory from '@reactorynet/reactory-core';

/**
 * A worked example of the generic submission pipeline.
 *
 * The form has no graphql block of its own. Declaring `submission` is the
 * whole opt in: `ReactoryFormService` merges the generic `ReactoryFormSubmit`
 * mutation into the definition when the form is resolved, and every submit is
 * stored as a `ReactoryFormSubmission` row keyed by this form's fqn. An ADMIN
 * can then open the explorer from the form list to read, filter and query the
 * captured data.
 */
const ContactForm: Reactory.Forms.IReactoryForm = {
  id: 'contact.Form@1.0.0',
  nameSpace: 'contact',
  name: 'Form',
  version: '1.0.0',
  title: 'Contact Us',
  description: 'A sample form that stores its submissions through the generic submission pipeline',
  uiFramework: 'material',
  uiSupport: ['material'],
  registerAsComponent: true,
  roles: ['ANON', 'USER'],
  schema: {
    type: 'object',
    title: 'Contact Us',
    required: ['fullName', 'email', 'message'],
    properties: {
      fullName: { type: 'string', title: 'Your name' },
      email: { type: 'string', title: 'Email address', format: 'email' },
      company: { type: 'string', title: 'Company' },
      country: { type: 'string', title: 'Country' },
      topic: {
        type: 'string',
        title: 'What is this about?',
        enum: ['sales', 'support', 'partnership', 'other'],
      },
      message: { type: 'string', title: 'Message' },
    },
  },
  uiSchema: {
    'ui:form': {
      submitProps: {
        titleText: 'Send',
        iconAlign: 'right',
      },
    },
    'ui:field': 'GridLayout',
    'ui:grid-layout': [
      {
        fullName: { xs: 12, md: 6 },
        email: { xs: 12, md: 6 },
      },
      {
        company: { xs: 12, md: 6 },
        country: { xs: 12, md: 6 },
      },
      {
        topic: { xs: 12 },
      },
      {
        message: { xs: 12 },
      },
    ],
    message: {
      'ui:options': {
        multiline: true,
        rows: 5,
      },
    },
  },
  submission: {
    enabled: true,
    // The form is reachable by anonymous visitors, so submissions from a signed
    // out browser are legitimate and are stored with a null userId. The default
    // anonymous rate limit (20 per minute per address) applies.
    allowAnonymous: true,
    readRoles: ['ADMIN'],
    successMessage: 'Thank you, we will be in touch shortly',
  },
} as Reactory.Forms.IReactoryForm;

export default ContactForm;
