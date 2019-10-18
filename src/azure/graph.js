import fetch from "node-fetch";
import { Client, ResponseType } from "@microsoft/microsoft-graph-client";
import logger from '../logging';
import { PNG } from 'pngjs';
import { updateUserProfileImage } from '../application/admin/User';
import om from 'object-mapper';


const getAuthenticatedClient = (accessToken) => {
  // Initialize Graph client
  const client = Client.init({
    // Use the provided access token to authenticate
    // requests
    defaultVersion: "v1.0",
	  debugLogging: true,
    authProvider: (done) => {
      done(null, accessToken);
    },    
  });

  return client;
};

export default {
  async getUserDetails(accessToken, who) {

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


    const imageBuff = new Promise(resolve => {
      
      client
        .api('/me/photos/120x120/$value')
        .headers({
          'accept': 'image/jpeg'
        })
        .responseType(ResponseType.STREAM)        
        .get()
        .then(( response ) => {          
          const buffer = [];        
          response.body.on('data', chunk => buffer.push(chunk));
          response.body.on('close', resolve(Buffer.concat(buffer)));           
        }).catch(getPhotoError => {
          logger.debug(`Could not get the user photo from MS Graph: ${getPhotoError.message}`, getPhotoError);    
          resolve(null); 
        });                                   
    });

    user.avatar = await imageBuff.then();
    
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

  async getEmails(accessToken, filter) {
    logger.debug(`Getting emails via MS graph`, filter);
    const client = getAuthenticatedClient(accessToken);    
    let emails = [];
    try {

      if(filter && filter.search) {
        emails = await client
        .api('/me/messages')
        .select('id,subject,receivedDateTime,sentDateTime,bodyPreview,body,sender,from,toRecipients')      
        .search(filter.search)
        .get()
        .then();

      } else {
        
        emails = await client
        .api('/me/messages')
        .select('id,subject,receivedDateTime,sentDateTime,bodyPreview,body,sender,from,toRecipients')      
        .get()
        .then();
      }
  
    } catch(error) {
      logger.debug('Error fetching emails from MS', error);
    }
              
    return emails;
  },
};


