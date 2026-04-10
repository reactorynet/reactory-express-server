
export default {
  type: 'object',
  title: 'Request Support',
  description: 'Use this form to log your support requests.',
  properties: {
    requestType: {
      type: 'string',
      title: 'Request Type',
      description: 'Category that best describes your support request',
      enum: [
        'general',
        'bug',
        'feature-request',
        'billing',
        'account',
        'performance',
        'integration',
        'documentation',
        'security',
        'other',
      ],
      enumNames: [
        'General',
        'Bug / Error',
        'Feature Request',
        'Billing',
        'Account & Access',
        'Performance',
        'Integration',
        'Documentation',
        'Security',
        'Other',
      ],
      default: 'general',
    },
    status: { type: 'string', title: 'Status', description: 'Current status for the support request' },
    request: { type: 'string', title: 'Request', description: 'Provide a short description of your help request' },
    description: { type: 'string', title: 'Description', description: 'Provide a detailed description of your request or problem' },
  }
}