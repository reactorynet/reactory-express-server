
import "isomorphic-fetch";
import { isNil, isString } from 'lodash';
import refresh from 'passport-oauth2-refresh';
import FormData from 'form-data';
import { User, PersonalDemographic } from '@reactory/server-core/models';
import MSGraph from '@reactory/server-core/azure/graph';
import { updateUserProfileImage } from '@reactory/server-core/application/admin/User';
import logger from '@reactory/server-core/logging';
import ApiError from "exceptions";
import moment from "moment";

const refreshMicrosoftToken = async (msauth) => {
  logger.debug('Refreshing Microsoft Token')
  /**
   *https://login.microsoftonline.com/common/oauth2/v2.0/token
    Content-Type: application/x-www-form-urlencoded

    grant_type=refresh_token&
    refresh_token=[REFRESH TOKEN]&
    client_id=[APPLICATION ID]&
    client_secret=[PASSWORD]&
    scope=[SCOPE]&
    redirect_uri=[REDIRECT URI]
    */
  if (msauth && msauth.props.oauthToken) {

    refresh.requestNewAccessToken('facebook', 'some_refresh_token', function (err, accessToken, refreshToken) {
      // You have a new access token, store it in the user object,
      // or use it to make a new request.
      // `refreshToken` may or may not exist, depending on the strategy you are using.
      // You probably don't need it anyway, as according to the OAuth 2.0 spec,
      // it should be the same as the initial refresh token.

    });
    const postbody = new FormData();
    postbody.append('grant_type', 'refresh_token');
    postbody.append('refresh_token', msauth.props.oauthToken.token.refresh_token);
    postbody.append('client_id', process.env.OAUTH_APP_ID);
    postbody.append('client_secret', process.env.OAUTH_APP_PASSWORD);
    postbody.append('scope', process.env.OAUTH_SCOPES);
    //postbody.append('resource', 'https://graph.microsoft.com')
    //postbody.append('redirect_uri', process.env.OAUTH_REDIRECT_URI);

    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST', // *GET, POST, PUT, DELETE, etc.
      //mode: 'cors', // no-cors, *cors, same-origin
      //cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      // credentials: 'same-origin', // include, *same-origin, omit
      headers: {
        //'Content-Type': 'application/json'
        'Content-Type': 'multipart/form-data',
        'Accept': 'application/json',
        ...postbody.getHeaders()
      },
      // redirect: 'follow', // manual, *follow, error
      // referrer: 'no-referrer', // no-referrer, *client
      body: postbody // body data type must match "Content-Type" header
    });


    if (response.status === 200 || response.status === 201) {
      const refreshResult = await response.json();

      /*
      {
        "access_token": "eyJ0eXAiOiJKV1QiLCJ...",
        "expires_in": 3599,
        "token_type": "Bearer",
        "scope": "https://graph.microsoft.com/mail.read https://graph.microsoft.com/user.read",
        "refresh_token": "OAAABAAAAiL9Kn2Z27...",
      }
      **/

      if (refreshResult && refreshResult.access_token) {
        msauth.props.oauthToken.token.access_token = refreshResult.access_token;
        msauth.props.accessToken = refreshResult.access_token;
        msauth.props.oauthToken.token.refresh_token = refreshResult.refresh_token;
        msauth.props.oauthToken.token.expires_at = moment().add(refreshResult.expires_in || 3599, 'seconds').toDate();
        return msauth;
      }
    } else {
      logger.debug(`Failed request from MS Graph: \n\tstatus: ${response.status}\n\ttext: ${response.statusText}]`);
      throw new ApiError("oauth token is invalid, please login again via login page.");
    }
  } else {
    throw new ApiError("oauth token is invalid, please login again via login page.");
  }
};

/**
 * A method to check if our current microsoft authentication token is valid.
 * If the expiry is within 5 min we, do a refresh of the token.
 * @param {*} msauth
 * @param {*} refresh
 * @param {*} userToCheck
 */
const isTokenValid = async (msauth, refresh = true, userToCheck = null) => {

  if (isNil(msauth)) throw new ApiError('Invalid Null Parameter input for msauth', { parameter: 'msauth', 'method': 'isTokenValid', 'source': 'modules.core.resolvers.User.ProfileResolver' });
  if (isNil(msauth.props) || isNil(msauth.provider) || isNil(msauth.lastLogin)) throw new ApiError('Invalid Parameter Shape for msauth', { parameter: 'msauth', 'method': 'isTokenValid', 'source': 'modules.core.resolvers.User.ProfileResolver' });
  logger.debug(`Checking if Microsoft Authentication token for ${user.fullName(true)} is valid`);
  const {
    expires_at,
    refresh_token,
    access_token
  } = msauth.props.oauthToken.token;

  const hasToken = isString(access_token) && isString(refresh_token);
  logger.debug(`Microsoft token looks ${hasToken ? 'good, checking dates' : 'bad, user must login'}`);
  if (hasToken === true) {
    const now = moment();
    let expiresWhen = null;

    expiresWhen = moment(expires_at);

    if (expiresWhen.isValid() === true) {
      logger.debug(`Checking if token has expired or about to expire ${expiresWhen.format('YYYY-MM-dd HH:mm:ss')}`);
      const expiresInMinutes = expiresWhen.diff(now, "minute")
      if (expiresInMinutes <= 0) {
        logger.debug(`Token already expired ${Math.abs(expiresInMinutes)} minutes ago. Use must login`);
        return {
          valid: false,
          msauth,
          message: `Your Microsoft login expired ${Math.abs(expiresInMinutes)} minutes ago. Please login to continue using Microsoft Features.`
        };
      }

      if (expiresInMinutes <= 5 && refresh === true && userToCheck && userToCheck.setAuthentication) {
        logger.debug(`The token expires in (${now.diff(expiresWhen, "minute")}) minutes. Will try a refresh using refresh token.`)
        try {
          const _auth = await refreshMicrosoftToken(msauth);
          await userToCheck.setAuthentication(_auth);

          // await userToCheck.save();
          return {
            valid: true,
            msauth: _auth,
            message: `Your Microsoft token authentication has been refreshed`
          };
        } catch (tokenRefreshError) {
          logger.error(`Token refresh failed ${tokenRefreshError} - user will need to login again`, { tokenRefreshError });
          return {
            valid: false,
            msauth,
            message: `Your Microsoft refresh token has failed, please login using your Microsoft Account in order to keep using Microsoft Features`
          };
        }
      }

      if (expiresInMinutes > 5) {
        logger.debug(`The token is valid and expires in ${expiresInMinutes} minutes`);
        return {
          valid: true,
          msauth,
          message: `Your Microsoft token expires in ${expiresInMinutes} minutes`
        };
      }
    }
  }
  logger.warn(`The given token does not appear to have a reasonable microsoft token shape. It requires properties 'props.oauthToken.token.expires_at' and 'props.oauthToken.token.refresh_token'`, { msauth });
  return {
    valid: false,
    msauth,
  };
};

const SetPersonalDemographics = async (args) => {
  logger.debug(`SAVING MY PERSONAL DEMOGRAPHICS :: ${JSON.stringify(args)}`);

  try {
    await PersonalDemographic.SetLoggedInUserDemograpics(args.personalDemographics);
    return {
      success: true,
      message: 'Your personal demographics have been saved successfully.',
    };
  } catch (error) {
    logger.debug(`ERROR SAVING PERSONAL DEMOGRAPHICS:: ${JSON.stringify(error)}`);
    throw new ApiError('Error saving personal demographics');
  }
};

const getPersonalDemographics = async (args) => {
  logger.debug('GETTING PERSONAL DEMOGRAPHICS FOR::', args);
  return PersonalDemographic.GetLoggedInUserDemograpics();
};

export default {
  Query: {
    refreshProfileData: async (parent, { id, skipImage = true }) => {
      let userToRefresh = global.user;
      const uxmessages = [];
      if (id && typeof id === 'string') {
        userToRefresh = await User.findById(id);
      }

      //for each available external provider we fetch the profile and
      //do an image fetch.  The skip image parameter will tell
      //the api whether or not to update the user profile.
      let msauth = userToRefresh.getAuthentication("microsoft");
      if (msauth && msauth.props) {
        /**
         * we have an oauth value, we can proceed
         * msauth.props.oauthToken
         * {
            "token": {
              "token_type": "Bearer",
              "scope": "Calendars.Read email Mail.Read openid profile User.Read",
              "expires_in": 3599,
              "ext_expires_in": 3599,
              "access_token": "XXXXXXX",
              "refresh_token": "XXXXXXX",
              "id_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6ImFQY3R3X29kdlJPb0VOZzNWb09sSWgydGlFcyJ9.eyJhdWQiOiJhYzE0OWRlOC0wNTI5LTQ4YWMtOWI0ZC1hOTUwYTczZGZiYWIiLCJpc3MiOiJodHRwczovL2xvZ2luLm1pY3Jvc29mdG9ubGluZS5jb20vZGU4M2RkZWQtYjA2MS00N2NmLWJkN2EtMGM0MzE2YTBhM2IzL3YyLjAiLCJpYXQiOjE1NzE0NjE2MDYsIm5iZiI6MTU3MTQ2MTYwNiwiZXhwIjoxNTcxNDY1NTA2LCJhaW8iOiJBVFFBeS84TkFBQUFpcmZYMVJlMkt5TVQyN2c5T2VVZE0yWGp6UW1GNGtsL2MveWtpcHZ5NW1FMk5peTh3cCtNNEV1RTVja0ZhczNhIiwiZW1haWwiOiJ3ZXJuZXIud2ViZXJAbGFzZWMuY29tIiwibmFtZSI6Ildlcm5lciBXZWJlciIsIm5vbmNlIjoiZnNrS0R3SHpoVXhXQ25jS2tSdmNmNk0yMS05MEN0cEgiLCJvaWQiOiIyYTE4ZjMyNi0zM2EwLTRiNTMtYjY5Mi1jZTRmZDM2MjZjNzAiLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJ3ZXJuZXIud2ViZXJAbGFzZWMuY29tIiwic3ViIjoiSHVTb0wtZjNmQUNVUG0wa3RoMUVoN21PQUIwMmtrMnNTY2wwb1FadlJpbyIsInRpZCI6ImRlODNkZGVkLWIwNjEtNDdjZi1iZDdhLTBjNDMxNmEwYTNiMyIsInV0aSI6Ik9WYmwtMXg2SWt5b2Y3cHRpejRtQUEiLCJ2ZXIiOiIyLjAifQ.TKRKnOTTqKEI6rE5eIvVrRnmsQONL6AfCP26ijtl9yRfUDYq01sEUaFPNUgnsUjGwE4QnX3ZscNp6s-8EgOgAe5mvwQ1fEVbsK6SeOBKuWrYdgwlwlAKvT8tguckXvs5uIh9YTSi4D2ShDhjzCxfV4CqoyT1BNaIZ_swIXjCSUMoVCSdvVBhVccb4o1y-W-14K4CiUKmnq4r_7N3_zopaQaedvDMFW74efgPKwCELIzkNSgqMWNEYhn8D4cdg5hvtmN-IZ3qQb6BVy9Cr6qHyZEsyrbxJAaFLv_v7_ZTngiUIPoPxxQfqfsqRZblgatAEp1ajmDjQBPWHz5LK2Qc2w",
              "expires_at": {
                "$date": "2019-10-19T06:12:29.755+0000"
              }
            }
          }
        */
        let msuser = null;
        //check if the token is valid, do a refresh if needed
        const tokenValidation = await isTokenValid(msauth, true, userToRefresh);
        if (tokenValidation.valid === true) {
          //our token is valid and we possibly refreshed the refresh and access tokens.
          try {
            msuser = await MSGraph.getUserDetails(msauth.props.accessToken, { imageSize: '120x120', profileImage: skipImage === false });
            logger.debug('microsoft user response received', msuser);
            uxmessage.push({
              title: 'Microsoft Authentication',
              text: 'Login valid',
              status: 'success',
              via: 'notification'
            });
          } catch (microsoftGraphError) {
            logger.error(`${microsoftGraphError.message}`, microsoftGraphError);
            /**
             * If our error is due to an expire accessToken we can try to do a refresh
             * {
                "MicrosoftError": {
                  "statusCode": 401,
                  "code": "InvalidAuthenticationToken",
                  "message": "Access token has expired.",
                  "requestId": "ced30975-1932-40f8-a902-f68028264733",
                  "date": "2019-10-19T12:11:34.000Z",
                  "body": "{\"code\":\"InvalidAuthenticationToken\",\"message\":\"Access token has expired.\",\"innerError\":{\"request-id\":\"ced30975-1932-40f8-a902-f68028264733\",\"date\":\"2019-10-19T14:11:34\"}}"
                }
              }
            */

            if (microsoftGraphError && microsoftGraphError.meta && microsoftGraphError.meta.MicrosoftError) {
              const { MicrosoftError } = microsoftGraphError.meta;
              if (MicrosoftError.code) {
                switch (MicrosoftError.code) {
                  case "InvalidAuthenticationToken": {
                    logger.debug('Invalid Authentication Token Received, trying refresh');
                    msauth = await refreshMicrosoftToken(msauth);
                    msuser = await MSGraph.getUserDetails(msauth.props.accessToken);

                    break;
                  }
                  default: {
                    throw microsoftGraphError;
                  }
                }
              }
            }
          }
        } else {
          const now = moment().valueOf();
          uxmessages.push({
            id: `ms-auth-expired-${now}`,
            title: 'Login Expired',
            text: tokenValidation.message || 'Your Microsoft Login has expired, please login again in order to resume Office 365 features.',
            data: {
              status: 'warning'
            },
            actions: [
              {
                id: `ms-auth-login-${now}`,
                title: 'Re-Authenticate',
                action: `${process.env.API_URI_ROOT}/auth/microsoft/openid/${global.partner.key}?x-client-key=${global.partner.key}&x-reactory-pass=${global.partner.password}+${global.partner.salt}`,
              }
            ],
            via: 'notification',
            reqiuresInteraction: true,
            timestamp: now
          });
        }

        if (msuser && msuser.avatar && skipImage === false) {
          userToRefresh.avatar = updateUserProfileImage(userToRefresh, msuser.avatar, false, false);
        }
      }

      return {
        user: userToRefresh,
        messages: uxmessages,
      };

    },
    GetPersonalDemographics: async (obj, args) => {
      return getPersonalDemographics(args);
    }
  },
  Mutation: {
    async CoreSetPersonalDemographics(obj, args) {
      return SetPersonalDemographics(args);
    }
  }
};
