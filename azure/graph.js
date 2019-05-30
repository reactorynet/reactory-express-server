import logger from '../logging';

const graph = require('@microsoft/microsoft-graph-client');

module.exports = {
  async getUserDetails(accessToken) {
    const client = getAuthenticatedClient(accessToken);

    const user = await client
      .api('/me')
      .select('mail,givenName,surname')
      .get();
    return user;
  },

  async getEvents(accessToken) {
    const client = getAuthenticatedClient(accessToken);

    const events = await client
      .api('/me/events')
      .select('subject,organizer,start,end')
      .orderby('createdDateTime DESC')
      .get();

    return events;
  },

  async getEmails(accessToken) {
    logger.debug(`Getting emails for ${accessToken}`);
    const client = getAuthenticatedClient(accessToken);

    const emails = await client
      .api('/me/messages')
      .select('id,subject,receivedDateTime,sentDateTime,bodyPreview,body,sender,from,toRecipients')
      .get();

    return emails;
  },
};


function getAuthenticatedClient(accessToken) {
  // Initialize Graph client
  const client = graph.Client.init({
    // Use the provided access token to authenticate
    // requests
    authProvider: (done) => {
      done(null, accessToken);
    },
  });

  return client;
}
