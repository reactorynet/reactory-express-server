import { Reactory } from '@reactory/server-core/types/reactory';

export const schema: Reactory.ISchema = {
    type: 'object',
    title: 'Consignment Details',
    properties: {
        freightFor: {
            type: 'string',
            title: 'Requet Freight for:'
        },
        offloadRequired: {
            type: 'boolean',
            title: 'Offloading Reuired?'
        },
        hazardous: {
            type: 'string',
            title: 'Hazardous?'
        },
        refrigerationRequired: {
            type: 'boolean',
            title: 'Refrigeration Required?'
        },
        containsLithium: {
            type: 'boolean',
            title: 'Contains Lithium Batteries?'
        },
        sample: {
            type: 'string',
            title: 'Sample/Repair'
        },
    }
};