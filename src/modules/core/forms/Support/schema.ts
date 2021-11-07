
export default {
  type: 'object',
  title: 'Support Form',
  description: 'Use this form to log your tickets',
  properties: {
    request: { type: 'string',  title: 'Request', description: 'Provide a short description of your help request' },
    description: { type: 'string', title: 'Description', description: 'Provide a detailed description of your request or problem' },
  }
}