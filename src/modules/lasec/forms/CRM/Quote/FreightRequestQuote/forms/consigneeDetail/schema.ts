import { Reactory } from '@reactory/server-core/types/reactory';

export const schema: Reactory.ISchema = {
    type: 'object',
    title: 'Consignee Details',
    properties: {
        companyName: {
            type: 'string',
            title: 'Company Name'
        },
        streetAddress: {
            type: 'string',
            title: 'Street Address'
        },
        suburb: {
            type: 'string',
            title: 'Suburb'
        },
        city: {
            type: 'string',
            title: 'City'
        },
        province: {
            type: 'string',
            title: 'Province'
        },
        country: {
            type: 'string',
            title: 'Country'
        },
    }
};
