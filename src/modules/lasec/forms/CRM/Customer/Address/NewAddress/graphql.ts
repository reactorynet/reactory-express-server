import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetPlaceDetails',
    text: `query LasecGetPlaceDetails($placeId: String!, $lat: Float, $lng: Float){
      LasecGetPlaceDetails(placeId: $placeId, lat: $lat, lng: $lng) {
        streetName
        streetNumber
        suburb
        city
        metro
        province
        postalCode
        country
        lat
        lng                
      }
    }`,
    variables: {
      'formContext.place_id': 'placeId',
      'formData.lat': 'lat',
      'formData.lng': 'lng'

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
      'lat': 'lat',
      'lng': 'lng'
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
          fullAddress
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
        'formData.lat': 'addressDetails.lat',
        'formData.lng': 'addressDetails.lng'
      },
      onSuccessMethod: "notification",
      notification: {
        title: "Address [${mutation_result.fullAddress}] has been added with id: ${mutation_result.id}",
        type: "success",
        inAppNotification: true,
      },
    },
  }
};

export default graphql;
