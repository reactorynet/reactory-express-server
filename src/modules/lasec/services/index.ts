import { Reactory } from '@reactory/server-core/types/reactory';
import QuoteService from './Quote/QuoteService';
import LoggingService from './LoggingService';
import LasecExecutionContextProvider from './LasecExecutionContextService';

const services: Reactory.IReactoryServiceDefinition[] = [
    QuoteService,
    LoggingService,
    LasecExecutionContextProvider,
];

export default services;