
export default {
  type: 'object',
  title: 'Request Support',
  description: 'Use this form to log your support requests.',
  properties: {
    status: { type: 'string', title: 'Status', description: 'Current status for the support request' },
    request: { type: 'string',  title: 'Request', description: 'Provide a short description of your help request' },
    description: { type: 'string', title: 'Description', description: 'Provide a detailed description of your request or problem' },
  }
}