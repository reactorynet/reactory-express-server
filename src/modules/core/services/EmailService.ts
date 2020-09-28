

import { find, isNil } from 'lodash';
import { ObjectId } from 'mongodb';
import { Reactory } from '@reactory/server-core/types/reactory';
import logger from '@reactory/server-core/logging';
import ApiError from '@reactory/server-core/exceptions';
import { User } from '@reactory/server-core/models';
import O365 from '@reactory/server-core/azure/graph';



class CoreEmailService implements Reactory.Service.ICoreEmailService {

    constructor(props: any, context: any){
        
    }

    async sendEmail(message: Reactory.IEmailMessage): Promise<any> {

        const { userId, via, subject, contentType, content, to, cc, bcc, saveToSentItems } = message;
        const { user } = global;
        if (isNil(user) === true) throw new ApiError('Not Authorized');
        const $userId = isNil(userId) ? user._id : new ObjectId(userId);
        logger.info(`USER ID ${userId} via ${via}`);
        switch (via) {
            case 'microsoft': {
                const emailUser = await User.findById(userId).then();
                if (emailUser.authentications) {
                    const found = find(emailUser.authentications, { provider: via });
                    logger.debug(`EMAIL USER FOUND: ${found}`);
                    if (found) {
                        const result = await O365.sendEmail(found.props.accessToken, subject, contentType, content, to, cc, saveToSentItems)
                            .then()
                            .catch(error => {
                                if (error.statusCode == 401) {
                                    throw new ApiError(`Error Sending Mail. Invalid Authentication Token`, { statusCode: error.statusCode, type: "MSAuthenticationFailure" });
                                } else {
                                    throw new ApiError(`Error Sending Mail: ${error.code} - ${error.message}`, { statusCode: error.statusCode });
                                }
                            });

                        if (result && result.statusCode && result.statusCode != 400) {
                            throw new ApiError(`${result.code}. ${result.message}`);
                        }

                        return {
                            Successful: true,
                            Message: 'Your mail was sent successfully.'
                        }
                    }
                    throw new ApiError('User has not authenticated with microsoft');
                } else {
                    throw new ApiError('User has not authenticated via microsoft');
                }
            }
            default: {
                throw new ApiError('Not Implemented Yet');
            }

                throw new Error('Method not implemented.');

        }
    }
}


 
 
 export default {
    id: 'core.EmailService@1.0.0',
    name: "Reactory Email Service - 💌",
    description: "Provides a simple email service that allows you to send an email via any of the registered email providers as the logged in user.",
    service: (props: any, context: any) => {
        return new CoreEmailService(props, context);
    },
}