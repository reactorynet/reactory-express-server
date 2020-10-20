
import { Reactory } from '@reactory/server-core/types/reactory';
import * as Lasec from '@reactory/server-modules/lasec/types/lasec';
import { getLoggedIn360User } from '@reactory/server-modules/lasec/resolvers/Helpers';
import humanNumber from 'human-number';
import LasecAPI from '@reactory/server-modules/lasec/api';
import logger from '@reactory/server-core/logging';
import ApiError from '@reactory/server-core/exceptions';

import { ObjectID } from 'mongodb';

interface LasecPreparedEmailParams {
    quote_id: string,
    email_type: string
}

interface LasecPreparedQuoteEmailPropertyBag {
    quote: Lasec.Lasec360Quote,
    user: {
        id: string,
        email: string
        firstName: string
        lastName?: string
        signature?: string
    }
    partner: {
        logo?: string
        avatar?: string
    },
    customer: Lasec.LasecClient
};

const QuoteEmailResolver = {
    Query: {
        LasecPrepareQuoteEmail: async (obj: any, params: LasecPreparedEmailParams): Promise<Reactory.IEmailMessage> => {

            try {

                const { partner, getService } = global;

                let result: Reactory.IEmailMessage = null;

                logger.debug(`Query.LasecPrepareQuoteEmail(obj, params)`, { obj, params });

                const lasecUser: Lasec.Lasec360User = await getLoggedIn360User().then();

                // const emailService: Reactory.Service.ICoreEmailService = getService('core.EmailService@1.0.0');
                const templateService: Reactory.Service.IReactoryTemplateService = getService('core.TemplateService@1.0.0');
                const quoteService: Lasec.IQuoteService = getService('lasec-crm.LasecQuoteService@1.0.0');
                const fileService: Reactory.Service.IReactoryFileService = getService('core.ReactoryFileService@1.0.0');

                const templateDocument: Reactory.ITemplateDocument = await templateService.getTemplate(params.email_type, partner._id, null, null, null).then();
                const file_context = `${params.email_type}::${params.quote_id}::${user._id}::file-attachments`;
                const attached_files: Reactory.IReactoryFileModel[] = await fileService.getFileModelsForContext(file_context).then();
                                

                if (templateDocument) {
                    let emailTemplate: Reactory.IEmailTemplate = await templateService.hydrateEmail(templateDocument).then();
                    logger.debug(`Loaded email template object ${emailTemplate.name}`);
                    let quote: Lasec.LasecQuote = await quoteService.getQuoteById(params.quote_id).then();
                    const lasec360Quote: Lasec.Lasec360Quote = { ...quote.meta.source };
                    let quote_customer = {
                        emailAddress: '',
                        fullName: ''
                    };

                    const customerApiResponse = await LasecAPI.Customers.list({ filter: { ids: [lasec360Quote.customer_id] }, ordering: {}, pagination: { enabled: false, page_size: 10, current_page: 1 } }).then();
                    if (customerApiResponse.items && customerApiResponse.items.length === 1) {
                        quote_customer = customerApiResponse.items[0];
                    } else {
                        logger.error(`No customer found for quote ${params.quote_id} customer id: ${lasec360Quote.customer_id}`);
                    }

                    const  downloadQuotePDF = async () => {

                        const pdfresult = await LasecAPI.Quotes.getQuotePDF(params.quote_id, true).then();
                        let pdfFileModel: Reactory.IReactoryFileModel = null;                        
                        try {
                            pdfFileModel = await fileService.getRemote(pdfresult.url, 'GET', {}, true,
                                {
                                    public: false,
                                    owner: global.user._id,
                                    ttl: (24 * 60 * 60),
                                    permissions: {
                                        roles: ['USER'],
                                    },
                                }).then();

                            pdfFileModel.uploadContext = file_context;
                            await pdfFileModel.save().then();

                            attached_files.push(pdfFileModel);
                        } catch (fileServiceError) {
                            logger.error(`🔴 Mutation.LasecPrepareQuoteEmail() -> fileService.getRemote() threw error`, { fileServiceError });
                        }

                    };

                    //has pdf file
                    let hasPdf = false;
                    if (attached_files.length === 0) {
                        logger.debug(`No attached files, getting quote pdf`);
                        await downloadQuotePDF();
                    } else {
                        attached_files.forEach((fileEntry: Reactory.IReactoryFileModel) => {
                            if (fileEntry.filename === `${params.quote_id}.pdf`) {
                                hasPdf = true;
                            }
                        });

                        if (!hasPdf) {
                            await downloadQuotePDF();
                        }
                    }
                                        
                    logger.debug(`Retrieved customer`, { quote_customer });
                    const propertyBag: LasecPreparedQuoteEmailPropertyBag = {
                        quote: lasec360Quote,
                        user: {
                            id: (global.user as Reactory.IUserDocument)._id,
                            email: lasecUser.email,
                            firstName: lasecUser.firstName,
                            lastName: lasecUser.lastName,
                            signature: lasecUser.signature
                        },
                        partner: {
                            logo: `${process.env.CDN_ROOT}/themes/${partner.key}/images/logo.png`,
                            avatar: `${process.env.CDN_ROOT}/themes/${partner.key}/images/avatar.png`,
                        },
                        customer: quote_customer
                    };

                    try {
                        logger.debug('Rendering Email Template Elements', {
                            name: emailTemplate.name,
                            description: emailTemplate.description,
                            subject: emailTemplate.subject,
                            body: emailTemplate.body,
                        });

                        let bodyText = '';
                        try {
                            bodyText = templateService.renderTemplate(emailTemplate.body, propertyBag)
                        }
                        catch (e){
                            bodyText = e.message;
                        };

                        let subjectText = '';
                        try {
                            subjectText = templateService.renderTemplate(emailTemplate.subject, propertyBag);
                        } catch (e) {
                            subjectText = e.message;
                        };

                        result = {
                            id: new ObjectID(),
                            quote_id: params.quote_id,
                            email_type: params.email_type,
                            body: bodyText,
                            contentType: 'html',
                            saveToSentItems: true,
                            subject: subjectText,
                            to: [{
                                email: `${quote_customer.email}`,
                                display: `${quote_customer.first_name} ${quote_customer.surname}`
                            }],
                            cc: [],
                            from: {
                                email: user.email,
                                display: `${user.firstName} ${user.lastName}`
                            },
                            via: 'microsoft',
                            attachments: attached_files.map((fileModel: Reactory.IReactoryFileModel) => {
                                logger.debug(`Attached file ${fileModel.filename}`);
                                return {
                                    id: fileModel.id,
                                    filename: `${fileModel.filename}`,
                                    size: humanNumber(fileModel.size),
                                    original: `${fileModel.filename}`,
                                    mimetype: 'application/pdf',
                                    link: fileModel.link
                                };
                            }),
                            userId: propertyBag.user.id
                        };

                        return result;
                    } catch (renderingError) {
                        logger.error(`🔴 Error while rendering email template`);
                    }
                }

                return {
                    id: new ObjectID(),
                    quote_id: params.quote_id,
                    email_type: params.email_type,
                    contentType: 'html',
                    saveToSentItems: true,
                    subject: `No Template Found`,
                    body: `No Template Available`,
                    to: [],
                    cc: [],
                    bcc: [],
                    userId: user._id,
                    via: 'microsoft',
                    attachments: [],
                }

            } catch (resolverError) {
                logger.error(`Error occured preparing email for quote`, { resolverError });
                throw new ApiError(`Could not generate the template due an internal server error`, { resolverError });
            }


        },
    },
}

export default QuoteEmailResolver;