import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  mutation: {
    new: {
      name: "LasecCreateNewOrganisation",
      text: `mutation LasecCreateNewOrganisation($customerId: String, $name: String, $description: String){
        LasecCreateNewOrganisation(customerId: $customerId, name: $name, description: $description) {
          success
          id
        }
      }`,
      objectMap: true,
      updateMessage: 'Updating Template Content',
      variables: {
        'formData.customerId': 'customerId',
        'formData.name': 'name',
        'formData.decription': 'description',
      },
      onSuccessMethod: 'refresh'
    }
  }
};

export default graphql;
