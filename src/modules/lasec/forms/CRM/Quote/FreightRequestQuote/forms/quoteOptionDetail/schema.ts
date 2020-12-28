import { Reactory } from '@reactory/server-core/types/reactory';

export const schema: Reactory.ISchema = {
    type: 'object',
    title: 'Quote Option Details',
    properties: {
        transportMode: {
            type: 'string',
            title: 'Transport Mode'
        },
        incoTerm: {
            type: 'string',
            title: 'Incoterm'
        },
        place: {
            type: 'string',
            title: 'Named Place'
        },
        vatExempt: {
            type: 'boolean',
            title: 'If DDP, is the importer duty/VAT exempt?'
        },
        fromSA: {
            type: 'boolean',
            title: 'If FCA, is the customer exporting from SA via road freight?'
        },
        totalValue: {
            type: 'string',
            title: 'Total Value of Order'
        },
    }
};