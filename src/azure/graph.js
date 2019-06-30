import logger from '../logging';
import om from 'object-mapper';

const graph = require('@microsoft/microsoft-graph-client');

export default {
  async getUserDetails(accessToken) {

    const client = getAuthenticatedClient(accessToken);
    let user = {
      firstName: '',
      lastName: '',
      email: '',
      avatar: null
    };

    try {
      user = await client
        .api('/me')
        .select('mail,givenName,surname')
        .get();
    } catch (userGetError) {
      logger.error('Could not retrieve the user detauls from MS Graph');
    }


    try {
      debugger;
      const image = await client.api('/me/photos/120x120/$value').get();

      user = image;
    } catch (getPhotoError) {
      logger.error('Could not get the user photo from MS Graph');
    }

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
