import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetAddressById',
    text: `query LasecGetAddressById($id: String!){
      LasecGetAddressById(id: $id) {
        id
        formatted_address
        
        street_number
        street_name
        
        city
        metro

        building_description_id
        building_description

        building_floor_number_id
        building_floor_description

        province_id
        province_name

        country_id
        country_name

        lat
        lng

        created_by
        last_edited_by

        linked_companies_count
        linked_clients_count
        linked_sales_orders_count        
      }
    }`,
    variables: {
      'formData.id': 'id',
    },
    resultMap: {
      'lat': 'lat',
      'lng': 'lng',
      'formatted_address': 'formatted_address',
      'street_name': 'streetName',
      'street_number': 'streetNumber',
      'suburb': 'suburb',
      'city': 'city',
      'metro': 'metro',
      'province_name': 'province',      
      'country_name': 'country',
      'created_by': 'created_by',
      'last_editied_by': 'editied_by'
    },
    edit: true,
    new: false,
  },
  mutation: {
    edit: {
      name: "LasecEditAddress",
      text: `mutation LasecEditAddress($address_input: EditAddressInput!){
        LasecEditAddress(address_input: $address_input) {
          success
          message
          address {
            id
            formatted_address
            street_name
            street_number
            suburb
            city      
            metro
            building_description_id
            building_floor_number_id
          }
        }
      }`,
      objectMap: true,
      updateMessage: 'Updating Address / Place Details',
      variables: {
        'formData.buildingType': 'address_input.building_description_id',
        'formData.floorNumber': 'address_input.building_floor_number_id',
        
        'formData.unitNumber': 'address_input.unit_number',
        'formData.unitName': 'address_input.unit_name',

        'formData.streetName': 'address_input.street_name',
        'formData.streetNumber': 'address_input.street_number',
        'formData.suburb': 'address_input.suburb',
        'formData.city': 'address_input.city',
        'formData.metro': 'address_input.metro',
        'formData.province': 'address_input.province',
        'formData.postalCode': 'address_input.postal_code',
        'formData.country': 'address_input.country',
      },
      onSuccessMethod: "notification",
      notification: {
        title: "Address #${mutation_result.id} [${mutation_result.fullAddress}] has been updated.",
        type: "success",
        inAppNotification: true
      },
    },    
  }
};

export default graphql;
