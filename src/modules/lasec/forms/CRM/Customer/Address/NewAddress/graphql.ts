import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetPlaceDetails',
    text: `query LasecGetPlaceDetails($placeId: String!){
      LasecGetPlaceDetails(placeId: $placeId) {
        streetName
        streetNumber
        suburb
        city
        metro
        province
        postalCode
        country
      }
    }`,
    variables: {
      'formContext.place_id': 'placeId',
    },
    resultMap: {
      'streetName': 'streetName',
      'streetNumber': 'streetNumber',
      'suburb': 'suburb',
      'city': 'city',
      'metro': 'metro',
      'province': 'province',
      'postalCode': 'postalCode',
      'country': 'country',
    },
    edit: false,
    new: true
  },
  mutation: {
    new: {
      name: "LasecCreateNewAddress",
      text: `mutation LasecCreateNewAddress($addressDetails: NewAddressInput!){
        LasecCreateNewAddress(addressDetails: $addressDetails) {
          success
          message
          id
        }
      }`,
      objectMap: true,
      updateMessage: 'Updating Address / Place Details',
      variables: {
        'formData.buildingType': 'addressDetails.buildingDescriptionId',
        'formData.floorNumber': 'addressDetails.buildingFloorNumberId',
        'formData.unitNumber': ['addressDetails.unit', 'addressDetails.addressFields.unitNumber'],
        'formData.unitName': 'addressDetails.addressFields.unitName',
        'formData.streetName': 'addressDetails.addressFields.streetName',
        'formData.streetNumber': 'addressDetails.addressFields.streetNumber',
        'formData.suburb': 'addressDetails.addressFields.suburb',
        'formData.city': 'addressDetails.addressFields.city',
        'formData.metro': 'addressDetails.addressFields.metro',
        'formData.province': 'addressDetails.addressFields.province',
        'formData.postalCode': 'addressDetails.addressFields.postalCode',
        'formData.country': 'addressDetails.addressFields.country',
      },
      onSuccessMethod: 'refresh'
    }
  }
};

export default graphql;
