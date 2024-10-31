import Cache  from "modules/reactory-core/models/CoreCache";
import logger from "@reactory/server-core/logging";

interface ReactoryGetCachedItemParams {
    key: String
}

export default {
    Query: {
        ReactoryGetCachedItem: async (obj: any, params: ReactoryGetCachedItemParams ) => {
            logger.debug(`ReactoryGetCachedItem( key: ${params.key} )`)
            const document = await  Cache.findOne({ key: params.key }).then();
            logger.debug(`Found Item`, document);
            return document;
        }
    }
}