
import { Lasec } from './QuoteService.d'
import {     
    Lasec360User,
} from '@reactory/server-modules/lasec/types/lasec';
import { Reactory } from '@reactory/server-core/types/reactory';
import logger from '@reactory/server-core/logging';

class LasecQuoteService implements Lasec.Quote.IQuoteService  {

    registry: Reactory.IReactoryServiceRegister

    constructor(props: Reactory.IReactoryServiceProps, context){
        this.registry = props.$services;
    }

    

    sendQuoteEmail = async (quote_id: string, subject: string, message: string, to: Reactory.ToEmail[], cc: Reactory.ToEmail[], bcc: Reactory.ToEmail[], attachments: Reactory.EmailAttachment[], from: Lasec360User): Promise<Reactory.EmailSentResult> => {

        let result: Reactory.EmailSentResult = {
            message: `Email for quote ${quote_id} sent to`,
            success: true
        }

        const { user } = global;

        const emailService: Reactory.Service.ICoreEmailService = this.registry['core.EmailService@1.0.0'].service({ $services: this.registry }, this) as Reactory.Service.ICoreEmailService;
                
        try {
            const sent_result = await emailService.sendEmail({ 
                content: message,
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
};

const service_definition: Reactory.IReactoryServiceDefinition = {
    id: 'lasec-crm.LasecQuoteService@1.0.0',
    name: 'Lasec Quote Service 💱',
    description: 'Service class for all quote related services.',
    dependencies: [],
    serviceType: 'Lasec.Quote.IQuoteService',
    service: (props: Reactory.IReactoryServiceProps, context: any) => {
        return new LasecQuoteService(props, context)
    }
};

export default service_definition;