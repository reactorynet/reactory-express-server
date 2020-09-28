/*
import { ObjectID } from "bson";
import Mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { Moment } from "moment";
*/
import { Reactory } from "@reactory/server-core/types/reactory";
import { Lasec360User } from "@reactory/server-modules/lasec/types/lasec";

export namespace Lasec.Quote {
    
    export interface IQuoteService {

        /**
         * Sends an email to the list of users regarding the quote with the quote id.
         * @param quote_id 
         * @param subject 
         * @param message 
         * @param to 
         * @param attachments 
         */
        sendQuoteEmail(quote_id: string, subject: string, message: string, to: Reactory.ToEmail[], cc: Reactory.ToEmail[], bcc: Reactory.ToEmail[], attachments: Reactory.EmailAttachment[], from: Lasec360User): Promise<EmailSentResult>;

    }

}

