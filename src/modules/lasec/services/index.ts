import { Reactory } from '@reactory/server-core/types/reactory';
import QuoteService from './Quote/QuoteService';
import LoggingService from './LoggingService';

const services: Reactory.IReactoryServiceDefinition[] = [
    QuoteService,
    LoggingService,
];

export default services;