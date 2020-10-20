

import {     
    Lasec360User,
    LasecQuote,
    IQuoteService
} from '@reactory/server-modules/lasec/types/lasec';

import {
    getCacheItem,
    setCacheItem
} from '@reactory/server-modules/lasec/models'

import {
    getLasecQuoteById,    
} from '@reactory/server-modules/lasec/resolvers/Helpers'

import { Reactory } from '@reactory/server-core/types/reactory';
import logger from '@reactory/server-core/logging';



class LasecQuoteService implements IQuoteService  {

    registry: Reactory.IReactoryServiceRegister

    constructor(props: Reactory.IReactoryServiceProps, context: any){
        this.registry = props.$services;
    }

    name: string = 'LasecQuoteService';
    nameSpace: string = 'lasec-crm';
    version: string = '1.0.0';
    
    sendQuoteEmail = async (quote_id: string, subject: string, message: string, to: Reactory.ToEmail[], cc: Reactory.ToEmail[], bcc: Reactory.ToEmail[], attachments: Reactory.EmailAttachment[], from: Lasec360User): Promise<Reactory.EmailSentResult> => {

        let result: Reactory.EmailSentResult = {
            message: `Email for quote ${quote_id} sent to`,
            success: true
        }

        const { user } = global;

        const emailService: Reactory.Service.ICoreEmailService = getService('core.EmailService@1.0.0') as Reactory.Service.ICoreEmailService;
                
        try {
            const sent_result = await emailService.sendEmail({ 
                body: message,
                contentType: 'html',
                attachments,
                saveToSentItems: true,
                subject,
                userId: user.id,
                via: 'microsoft', 
                to,
                cc,
                bcc,
            }).then();

            if(sent_result.success) {
                result.message = `${result.message} ${to.length} recipients`;
            }

        } catch (mailError) {
            logger.error(`Error occured while send the email ${mailError.message}`)
            return 
        }
        
        return result;
    }

    getQuoteById = async (quote_id: string): Promise<LasecQuote> => {
        return await getLasecQuoteById(quote_id).then();
    }

    getQuoteEmail = async (quote_id: string, email_type: string): Promise<Reactory.IEmailMessage> => {
        return await getCacheItem(`${email_type}::${quote_id}::${user._id}`).then() as Reactory.IEmailMessage;
    }

    setQuoteEmail = async (quote_id: string, email_type: string, message: Reactory.IEmailMessage): Promise<Reactory.IEmailMessage> => {
        return await setCacheItem(`${email_type}::${quote_id}::${user._id}`, message, (24 * 60 * 60)).then() as Reactory.IEmailMessage;
    }
};

const service_definition: Reactory.IReactoryServiceDefinition = {
    id: 'lasec-crm.LasecQuoteService@1.0.0',
    name: 'Lasec Quote Service 💱',    
    description: 'Service class for all quote related services.',
    dependencies: [],
    serviceType: 'Lasec.Quote.IQuoteService',
    service: (props: Reactory.IReactoryServiceProps, context: any) => {
        return new LasecQuoteService(props, context);
    }
};

export default service_definition;