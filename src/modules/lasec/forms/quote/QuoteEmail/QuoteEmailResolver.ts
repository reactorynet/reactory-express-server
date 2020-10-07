
import { Reactory } from '@reactory/server-core/types/reactory';
import { getService } from '@reactory/server-core/services';

import * as Lasec from '@reactory/server-modules/lasec/types/lasec';
import { getLoggedIn360User } from '@reactory/server-modules/lasec/resolvers/Helpers';

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
    }
}


const QuoteEmailResolver = {
    Query: {
        LasecPreprareQuoteEmail: async (params: LasecPreparedEmailParams): Promise<Reactory.IEmailMessage> => {
            debugger
            const { partner } = global;

            const lasecUser: Lasec.Lasec360User = await getLoggedIn360User().then();

            const emailService: Reactory.Service.ICoreEmailService = getService('core.EmailService@1.0.0');
            const templateService: Reactory.Service.IReactoryTemplateService = getService('core.TemplateService@1.0.0'); 
            const quoteService: Lasec.IQuoteService = getService('lasec-crm.QuoteService@1.0.0');
            
            const templateDocument: Reactory.ITemplateDocument = await templateService.getTemplate(`lasec-crm.prepared-emails:${params.email_type}`, partner._id, null).then();
            let template: Reactory.IEmailTemplate = await templateService.hydrateEmail(templateDocument).then();
            let quote: Lasec.LasecQuote = await quoteService.getQuoteById(params.quote_id).then();

            const lasec360Quote: Lasec.Lasec360Quote = { ...quote.meta.source };
            const quote_customer: any = {},            
            
            let propertyBag: LasecPreparedQuoteEmailPropertyBag  = {
                quote: lasec360Quote,
                user: {
                    id: (global.user as Reactory.IUserDocument)._id,
                    email: lasecUser.email,
                    firstName: lasecUser.firstName,
                    lastName: lasecUser.lastName,
                    signature: lasecUser.signature
                },
                partner: {
                    logo: '',
                    avatar: ''
                }
            };
            
            let result: Reactory.IEmailMessage = {
                content: `${templateService.renderTemplate(template.body, propertyBag)}${template.signature ? templateService.renderTemplate(template.signature, propertyBag) : ''}`,
                contentType: 'html',
                saveToSentItems: true,
                subject: templateService.renderTemplate(template.subject, propertyBag),
                to: [],
                cc: [],
                via: 'microsoft',
                attachments: [],
                userId: propertyBag.user.id
            }

            return result;
        },


    },
}

export default QuoteEmailResolver;