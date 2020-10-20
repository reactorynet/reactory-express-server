

import QuoteService from './Quote/QuoteService';
import { Reactory } from '@reactory/server-core/types/reactory';

const services: Reactory.IReactoryServiceDefinition[] = [
    QuoteService
];

export default services;