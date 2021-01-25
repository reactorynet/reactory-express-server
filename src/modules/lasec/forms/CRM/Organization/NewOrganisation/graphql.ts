import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  mutation: {
    new: {
      name: "LasecCreateNewOrganisation",
      text: `mutation LasecCreateNewOrganisation($customerId: String, $name: String, $description: String){
        LasecCreateNewOrganisation(customerId: $customerId, name: $name, description: $description) {
          success
          message 
          organisation {
            id
            name
            description
          }
        }
      }`,
      objectMap: true,
      updateMessage: 'Creating organisation...',
      variables: {
        'formData.customerId': 'customerId',
        'formData.name': 'name',
        'formData.decription': 'description',
      },
      onSuccessMethod: 'notification',
      notification: {
        inAppNotification: true,
        title: 'Organisation Created',
        type: 'success'
      }
    }
  }
};

export default graphql;
