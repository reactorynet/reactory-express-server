

import {
    Lasec360User,
    LasecQuote,
    IQuoteService,
    LasecQuoteOption,
    SimpleResponse
} from '@reactory/server-modules/lasec/types/lasec';

import {
    getCacheItem,
    setCacheItem
} from '@reactory/server-modules/lasec/models'

import {
    getLasecQuoteById,
} from '@reactory/server-modules/lasec/resolvers/Helpers'
import LAPI from '@reactory/server-modules/lasec/api';
import { Reactory } from '@reactory/server-core/types/reactory';
import logger from '@reactory/server-core/logging';
import ApiError from '@reactory/server-core/exceptions';



class LasecQuoteService implements IQuoteService {

    name: string = 'LasecQuoteService';
    nameSpace: string = 'lasec-crm';
    version: string = '1.0.0';

    registry: Reactory.IReactoryServiceRegister

    constructor(props: Reactory.IReactoryServiceProps, context: any) {
        this.registry = props.$services;
    }

    async getQuoteOptionDetail(quote_id: string, option_id: string): Promise<LasecQuoteOption> {

        const payload = await LAPI.Quotes.getQuoteOption(option_id).then()

        return payload;

    }

    async getIncoTerms(): Promise<string[]> {
        try {
            let cache_key = 'lasec-crm.data.all-incoterms';
            let items = await getCacheItem(cache_key).then()
            logger.debug(`lasec-crm.QuoteService getIncoterms()`, { cached: items });
    
            if (!items) {
                const payload = await LAPI.Quotes.getIncoTerms().then()
                items = payload || [];
    
                logger.debug(`lasec-crm.QuoteService getIncoterms()`, { fetched: items });
                setCacheItem(cache_key, items, 180 * 3);
            }
            
            return items || [];
        } catch (err) {
            logger.error(`getIncoTerms() ${err.messag}`)
            return [];
        }
    }

    async createNewQuoteOption(quote_id: string): Promise<LasecQuoteOption> {
        const payload = await LAPI.Quotes.createQuoteOption(quote_id).then()

        return {
            id: payload.id,
            quote_id: quote_id,
            quote_option_id: payload.id
        }
    }

    async patchQuoteOption(quote_id: string, quote_option_id: string, option: LasecQuoteOption): Promise<LasecQuoteOption> {

        const payload = await LAPI.Quotes.patchQuoteOption(quote_id, quote_option_id, {
            name: option.option_name,
            inco_terms: option.incoterm,
            named_place: option.named_place,
            //transport_mode: option.transport_mode,
            //currency: option.currency
        }).then()

        return payload;
    }

    async deleteQuoteOption(quote_id: string, quote_option_id: string): Promise<SimpleResponse> {

        try {
            await LAPI.Quotes.deleteQuoteOption(quote_id, quote_option_id);

            return {
                message: `Deleted quote option ${quote_option_id}`,
                success: true,
            };
        } catch (error) {
            logger.error(error.message);
            throw new ApiError('Could not delete quote option', error);
        }

    }

    async copyQuoteOption(quote_id: string, quote_option_id: string): Promise<LasecQuoteOption> {

        try {
            const payload = await LAPI.Quotes.copyQuoteOption(quote_id, quote_option_id).then();
            logger.debug(`Payload Response ==> copyQuoteOption`, payload);
            return {
                id: payload.new_quote_option_id,
                quote_option_id: payload.new_quote_option_id,
                quote_id: quote_id,
            };
        } catch (apiError) {
            logger.error(apiError.message, apiError)
            throw new ApiError('Could not copy quote option', apiError);
        }

    }

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

            if (sent_result.success) {
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