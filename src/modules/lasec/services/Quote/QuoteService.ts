import om from 'object-mapper';
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
    async getQuoteHeaders(quote_id: string): Promise<any> {        
        try {
            return await LAPI.Quotes.getQuoteHeaders(quote_id).then();
        } catch (err) {
            logger.error(`Error returning headers`);
            return [];
        }

    }
    async getQuoteTransportModes(): Promise<any> {
        try {
            let cache_key = 'lasec-crm.data.all-transport-modes';
            let items = await getCacheItem(cache_key).then()
            
            logger.debug(`lasec-crm.QuoteService getQuoteTransportModes()`, { cached: items });
    
            if (!items) {
                const payload = await LAPI.Quotes.getQuoteTransportModes().then()
                items = payload || [];
    
                logger.debug(`lasec-crm.QuoteService getQuoteTransportModes()`, { fetched: items });
                setCacheItem(cache_key, items, 180 * 3);
            }
            
            return items || [];
        } catch (err) {
            logger.error(`getIncoTerms() ${err.messag}`)
            return [];
        }
    }

    async getQuoteOptionDetail(quote_id: string, option_id: string): Promise<LasecQuoteOption> {        
        try {
            logger.debug(`Calling LAPI.Quote.getQuoteOption(${option_id})`);
            const payload = await LAPI.Quotes.getQuoteOption(option_id).then()

            return om.merge(payload, {
                "id": ["id", "quote_option_id"],
                "name": "option_name",
                "inco_terms": "incoterm",
                "named_place": "named_place",
                "special_comment": "special_comment",
                "grand_total_discount_cents": "discount",
                "grand_total_discount_percent": "discount_percent",
                "grand_total_excl_vat_cents": "total_ex_vat",
                "grand_total_incl_vat_cents": "total_incl_vat",
                "grant_total_vat_cents": "vat",
                "gp_percent": "gp_percent",
                "actual_gp_percent": "gp",                
            }) as LasecQuoteOption;
        } catch (convertError) {
            logger.error(`💥 Could not get quote option details ${convertError.message}`, {error: convertError})
        }        
    }

    async getQuoteOptionsDetail(quote_id: string, option_ids: string[]): Promise<LasecQuoteOption[]> {        
        try {
            logger.debug(`Calling LAPI.Quote.getQuoteOption(${option_ids})`);
            const payload = await LAPI.Quotes.getQuoteOptions(option_ids).then()

            logger.debug(`Payload received LAPI.Quote.getQuoteOption(${option_ids})`, {payload})

            let converted = om.merge(payload, {
                "items[].id": ["[].id", "[].quote_option_id"],
                "items[].name": "[].option_name",
                "items[].inco_terms": "[].incoterm",
                "items[].named_place": "[].named_place",
                "items[].special_comment": "[].special_comment",
                "items[].grand_total_discount_cents": "[].discount",
                "items[].grand_total_discount_percent": "[].discount_percent",
                "items[].grand_total_excl_vat_cents": "[].total_ex_vat",
                "items[].grand_total_incl_vat_cents": "[].total_incl_vat",
                "items[].grant_total_vat_cents": "[].vat",
                "items[].gp_percent": "[].gp_percent",
                "items[].actual_gp_percent": "[].gp",                
            }) as LasecQuoteOption[];
            
            logger.debug(`Returning getQuoteOptionsDetail(${option_ids})`, { converted })
            
            return converted;
        } catch (convertError) {
            logger.error(`💥 Could not get quote option details ${convertError.message}`, {error: convertError})
        }        
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