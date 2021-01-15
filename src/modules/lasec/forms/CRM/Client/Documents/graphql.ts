import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  // query: {
  //   name: 'LasecGetCustomerDocuments',
  //   text: `query LasecGetCustomerDocuments($id: String, $uploadContexts: [String], $paging: PagingRequest){
  //     LasecGetCustomerDocuments(id: $id, uploadContexts: $uploadContexts, paging: $paging){
  //       id
  //       documents {
  //         id
  //         filename
  //         mimetype
  //         link
  //         size
  //         owner {
  //           id
  //           firstName
  //           fullName
  //         }
  //         fromApi
  //       }
  //     }
  //   }`,
  //   variables: {
  //     'formData.id': 'id',
  //     'formData.$uploadContexts': 'uploadContexts',
  //   },
  //   formData: {
  //     $uploadContexts: [
  //       'lasec-crm::existing-company::document'
  //       // 'lasec-crm::company-document',
  //       // 'lasec-crm::new-company::document'
  //     ]
  //   },
  //   resultMap: {
  //     'id': 'id',
  //     'documents': 'documents',
  //   },
  //   autoQuery: true,
  //   queryMessage: 'Loading customer documents',
  //   resultType: 'object',
  //   edit: false,
  //   new: false,
  //   refreshEvents: [
  //     { name: 'lasec-crm::new-document::uploaded' },
  //     { name: 'lasec-crm::existing-company::document' }
  //   ],
  //   onError: {
  //     componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
  //     method: 'onGraphQLQueryError',
  //   },
  // },
};

export default graphql;
