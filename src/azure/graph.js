'use strict';
import "isomorphic-fetch";
import { Client, ResponseType } from "@microsoft/microsoft-graph-client";
import logger from '../logging';
import { PNG } from 'pngjs';
import { updateUserProfileImage } from '../application/admin/User';
import om from 'object-mapper';
import { Stream } from "stream";
import ApiError from "exceptions";
import { sendSurveyEmail } from "application/admin/Survey";


const getAuthenticatedClient = (accessToken, apiVersion = 'v1.0') => {
  // Initialize Graph client
  const client = Client.init({
    // Use the provided access token to authenticate
    // requests
    defaultVersion: apiVersion,
	  debugLogging: true,
    authProvider: (done) => {
      done(null, accessToken);
    },    
  });

  return client;
};

const MSGraph = {
  async getProfileImage(accessToken, size = '120x120') {
    const client = getAuthenticatedClient(accessToken);

    try {
      
      const imageResponse = await client
        .api(`/me/photos/${size}/$value`)
        .headers({
          'accept': 'image/jpeg'
        })
        .responseType(ResponseType.RAW)        
        .get();

      const s2b = async (readStream) => {

        return await new Promise((resolve, reject)=>{
          const chunks = [];

          readStream.on("data", function (chunk) {
            chunks.push(chunk);
          });
        
          // Send the buffer or you can put it into a var
          readStream.on("end", function () {
            resolve(Buffer.concat(chunks));
          });      

        }).then();
      };      
      const imageBuffer = await s2b(imageResponse.body);
      return `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    } catch (getImageError) {
      logger.debug(`Could not get image`, getImageError);
      return null;
    }
  },
  async getUserDetails(accessToken, options = { profileImage: false, imageSize: '120x120' }) {

    const client = getAuthenticatedClient(accessToken);
    let user = {
      firstName: '',
      lastName: '',
      email: '',
      avatar: null,      
    };

    try {
      user = await client
        .api('/me')
        .select('mail,givenName,surname')
        .get();
    } catch (userGetError) {
      logger.error(`Could not retrieve the user detauls from MS Graph ${userGetError.message}`);
      throw new ApiError(`Could not connect with Microsoft Graph API: ${userGetError.message}`, { MicrosoftError: userGetError });
    }

    if(options.profileImage === true) {
      user.avatar = await MSGraph.getProfileImage(accessToken, options.imageSize);
    }

    logger.debug(`MSGraph /me ${options.profileImage ? 'with profile image fetch' : ''} result`, { user })
                
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

  async getTasks(accesstoken, filter) {
    const tasks = await getAuthenticatedClient(accesstoken, 'beta')
      .api('/me/outlook/tasks')
      .select('id,dueDateTime,assignedTo,subject,body')
      .get()
      .then();

    return tasks;
  },

  async createTask(accessToken, task) {

  },

  async sendEmail(accessToken, message) {

  }
};

export default MSGraph;

