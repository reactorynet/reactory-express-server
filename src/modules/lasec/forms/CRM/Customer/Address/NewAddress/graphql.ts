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
        province
        postalCode
      }
    }`,
    variables: {
      'formContext.place_id': 'placeId',
    },
    edit: false,
    new: true
  },
  mutation: {
    edit: {
      name: "LasecCreateNewAddress",
      text: `mutation LasecCreateNewAddress(
        $buildingDescriptionId: String,
        $buildingFloorNumberId: String,
        $unit: String,
        $addressFields: AddressFields
      ){
        LasecCreateNewAddress(
          buildingDescriptionId: $buildingDescriptionId,
          buildingFloorNumberId: $buildingFloorNumberId,
          unit: $unit,
          addressFields: $addressFields,
          ) {
          success
          id
        }
      }`,
      objectMap: true,
      updateMessage: 'Updating Template Content',
      variables: {
        'formData.buildingType': 'buildingDescriptionId',
        'formData.floorNumber': 'buildingFloorNumberId',
        'formData.unitNumber': ['unit', 'addressFields.unitNumber'],
        'formData.unitName': 'addressFields.unitName',
        'formData.streetName': 'addressFields.streetName',
        'formData.streetNumber': 'addressFields.streetNumber',
        'formData.suburb': 'addressFields.suburb',
        'formData.metro': 'addressFields.metro',
        'formData.city': 'addressFields.city',
        'formData.postCode': 'addressFields.postCode',
        'formData.province': 'addressFields.province',
        'formData.country': 'addressFields.country',
      },
      onSuccessMethod: 'refresh'
    }
  }
};

export default graphql;
