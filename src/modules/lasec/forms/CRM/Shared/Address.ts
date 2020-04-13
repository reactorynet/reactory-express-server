import { Reactory} from '@reactory/server-core/types/reactory';

const schema: Reactory.ISchema = {
  type: 'object',
  title: 'Address',
  properties: {
    id: {
      type: 'string',
      title: 'id'
    },
    placeId: {
      type: 'string',
      title: 'Place Id'
    },
    fullAddress: {
      type: 'string',
      title: 'Full Address'
    },
    addressLine1: {
      type: 'string',
      title: 'Street'
    },
    addressLine2: {
      type: 'string',
      title: 'addressLine2',
    },
    city: {
      type: 'string',
      title: 'City',
    },
    zipCode: {
      type: 'string',
      title: 'Postal Code',
    },
    state: {
      type: 'string',
      title: 'Province',
    },
    countryCode: {
      type: 'string',
      title: 'Country Code',
    },
    countryName: {
      type: 'string',
      title: 'Country Name',
    },
    lat: {
      type: 'number',
      title: 'Latitude'
    },
    long: {
      type: 'number',
      title: 'Longtitude'
    },
    addressSearch: {
      type: 'string',
      title: 'Address Search'
    }
  }
}

export default schema;
