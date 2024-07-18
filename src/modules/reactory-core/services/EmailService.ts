

import lodash, { find, isNil } from 'lodash';
import { ObjectId } from 'mongodb';
import Reactory from '@reactory/reactory-core';
import logger from '@reactory/server-core/logging';
import ApiError from '@reactory/server-core/exceptions';
import { User } from '@reactory/server-modules/reactory-core/models'
import O365 from '@reactory/server-modules/reactory-azure/services/graph';
import SendGrid from '@sendgrid/mail';
import path from 'path';
import * as Microsoft from '@microsoft/microsoft-graph-types'



class CoreEmailService implements Reactory.Service.ICoreEmailService {

    name: string = 'EmailService';
    nameSpace: string = 'core';
    version: string = '1.0.0';

    context: Reactory.Server.IReactoryContext;
    
    fileService: Reactory.Service.IReactoryFileService;


    constructor(props: any, context: any) {
        this.context = context;
    }

    getExecutionContext(): Reactory.Server.IReactoryContext {
        // throw new Error('Method not implemented.');  
        return this.context;
    }

    setExecutionContext(executionContext: Reactory.Server.IReactoryContext): boolean {
        this.context.partner = executionContext.partner;
        this.context.user = executionContext.user;

        return true;
    }

    /**
     * Return the user email address in the following format:
     * @param {UserModel} user
     * @param {ReactorClient} partner
     */
    resolveUserEmailAddress = (user: Reactory.Models.IUserDocument) => {
            const { MODE } = process.env;

            const partnerToUse = this.context.partner;

            // check if we have a redirect setting for this mode
            const redirectSetting = partnerToUse.getSetting(`email_redirect/${MODE}`);
            let emailAddress = user.email;
            if (lodash.isNil(redirectSetting) === false && lodash.isNil(redirectSetting.data) === false) {
                const { email, enabled } = redirectSetting.data;
                if (lodash.isNil(email) === false && enabled === true) emailAddress = email;
            }

            logger.info(`Email Address has been resolved as, ${emailAddress}`, { emailAddress, redirectSetting });

            return {
                to: `${user.firstName} ${user.lastName}<${emailAddress}>`,
                from: `${partnerToUse.name}<${partnerToUse.email}>`,
            };
        };


    onStartup(): Promise<any> {
        logger.debug(`CoreEmailService onStartup()`)
        return Promise.resolve(true);
    }

    onShutdown(): Promise<any> {
        logger.debug(`CoreEmailService onShutdown()`)
        return Promise.resolve(true);
    }

    setFileService(fileService: Reactory.Service.IReactoryFileService) {
        this.fileService = fileService;
    }

    async sendEmail(message: Reactory.Models.IEmailMessage): Promise<any> {

        const { userId, via, subject, contentType = "html", body, to, cc, bcc, saveToSentItems, attachments } = message;
        const { user, partner } = this.context;
        if (isNil(user) === true) throw new ApiError('Not Authorized');
        
        logger.info(`USER ID ${userId} via ${via}`);

        const fileService = this.fileService;
        const emailUser = await User.findById(userId).then();

        switch (via) {
            case 'microsoft': {
                if (emailUser.authentications) {
                    const found = find(emailUser.authentications, { provider: via });
                    logger.debug(`EMAIL USER FOUND: ${found}`);

                    const $to: Microsoft.Recipient[] = [];
                    const $cc: Microsoft.Recipient[] = [];
                    const $bcc: Microsoft.Recipient[] = [];

                    const $attachments: Microsoft.Attachment[] = [];

                    to.forEach((toEmail) => {
                        $to.push({ emailAddress: { address: toEmail.email, name: toEmail.display } })
                    });

                    cc.forEach((toEmail) => {
                        $cc.push({ emailAddress: { address: toEmail.email, name: toEmail.display } })
                    });

                    bcc.forEach((toEmail) => {
                        $bcc.push({ emailAddress: { address: toEmail.email, name: toEmail.display } })
                    });

                    attachments.forEach((attachment) => {
                        $attachments.push({
                            //@ts-ignore
                            "@odata.type": "#microsoft.graph.fileAttachment",
                            name: attachment.filename,
                            contentType: attachment.mimetype,
                            contentBytes: fileService.getContentBytesAsString(attachment.path, "base64"),
                            isInline: false,
                            id: `${attachment.id}`,
                            size: attachment.size,
                        });
                    })



                    if (found) {
                        const result = await O365.sendEmail(
                            found.props.accessToken,
                            subject,
                            contentType as Microsoft.BodyType,
                            body,
                            $to,
                            saveToSentItems,
                            $cc,
                            $bcc,
                            $attachments)
                            .then()
                            .catch(error => {
                                if (error.statusCode == 401) {
                                    throw new ApiError(`Error Sending Mail. Invalid Authentication Token`, {
                                        statusCode: error.statusCode,
                                        type: "MSAuthenticationFailure"
                                    });
                                } else {
                                    throw new ApiError(`Error Sending Mail: ${error.code} - ${error.message}`, {
                                        statusCode: error.statusCode
                                    });
                                }
                            });

                        if (result && result.statusCode && result.statusCode != 400) {
                            throw new ApiError(`${result.code}. ${result.message}`);
                        }

                        return {
                            Successful: true,
                            Message: 'Your mail was sent successfully.'
                        };
                    }
                    throw new ApiError('User has not authenticated with microsoft');
                } else {
                    throw new ApiError('User has not authenticated via microsoft');
                }
            }
            case 'sendgrid': {
                
                if (isNil(message.subject) === false && isNil(message.body) === false) {
                    let emailAddress = { to: 'UNREOLVED', from: 'UNRESOLVED' };
                    
                    try { 
                        emailAddress = this.resolveUserEmailAddress(emailUser); 
                    } catch (e) { 
                        emailAddress = { to: 'ERROR_RESOLVING_EMAIL', from: 'UNRESOLVED' };
                    }

                    try {
                        SendGrid.setApiKey(partner.emailApiKey);
                        let {
                            subject = '',                            
                            body = ''
                        } = message;

                        SendGrid.send({
                            to: emailAddress.to,
                            from: emailAddress.from,
                            html: body,
                            subject
                        });

                        this.context.log(`Email sent to ${emailAddress.to}`);
                    } catch (sendError) {
                        this.context.log(`Email error ${emailAddress.to} could not send`, { sendError }, 'error');
                    }
                }

                return;
            }
            case 'google':  {
                // TODO: Add support to use a google service account to send email
                throw new ApiError('Not Implemented Yet');
            }
            case 'smtp': {
                // TODO: Add support to use a smtp service to send email
                throw new ApiError('Not Implemented Yet');
            }            
            default: {
                //TODO: Add support for use of a FQN to resolve the email sending 
                // via a custom service
                throw new ApiError('Not Implemented Yet');
            }
        }
    }
}




export default {
    id: 'core.EmailService@1.0.0',
    name: "EmailService",
    nameSpace: "core",
    version: "1.0.0",
    dependencies: [{ id: 'core.ReactoryFileService@1.0.0', alias: 'fileService' }],
    description: "Provides a simple email service that allows you to send an email via any of the registered email providers as the logged in user.",
    service: (props: any, context: any) => {
        return new CoreEmailService(props, context);
    },
}