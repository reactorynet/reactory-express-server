import { Reactory } from "types/reactory";

export const createBrandForOrganization = `
mutation CreateBrandMutation($brandInput: BrandInput!, $organizationId: String!){
  createBrandForOrganization(brandInput: $brandInput, organizationId: $organizationId){
    id
    title
    description      
    scale {
      id
      key
      title
      entries {
        rating
        description
      }
    }      
    qualities {
      ordinal        
      title
      description
      behaviours {
        ordinal
        description
      }      
    }
  } 
}
`;



export const mutationMap = {
  'formContext.organizationId': 'organizationId',
  'formData.id': 'brandInput.id',
  'formData.title': 'brandInput.title',
  'formData.description': 'brandInput.description',
  'formData.scale.id': 'brandInput.scale',
  'formData.qualities': 'brandInput.qualities',
};


export const updateBrandForOrganization = `
mutation UpdateBrandForOrganization($brandInput: BrandInput!, $organizationId: String!){
  updateBrandForOrganization(brandInput: $brandInput, organizationId: $organizationId){
    id
    title
    description      
    scale {
      id
      key
      title
      entries {
        rating
        description
      }
    }      
    qualities {
      ordinal        
      title
      description
      behaviours {
        ordinal
        description
      }      
    }
  } 
}
`;


export const brandWithId = `
  query BrandWithId($brandId: String!){
    brandWithId(brandId: $brandId){
      id,
      title
      description
      qualityDisplay
      archived
      scale {
        id
        key
        title
        min
        max
        entries {
          rating
          description
        }
      }
      qualities {
        id
        title
        description
        ordinal
        behaviours {
          id
          description
          title
          ordinal      
        }
      }
    }
  }
`;

export const queryMap = {
  'formContext.brandId': 'brandId',
  'formContext.organizationId': 'organizationId',
};

const NewBrandGraphQL: Reactory.IFormGraphDefinition = {
  query: {
    name: "TowerStoneGetNewLeadershipBrand",
    text: `query TowerStoneGetNewLeadershipBrand($organizationId: String!){
      TowerStoneGetNewLeaderShipBrand(organizationId: $organizationId){
        id,
        title
        description
        qualityDisplay
        archived
        scale {
          id
          key
          title
          min
          max
          entries {
            rating
            description
          }
        }
        qualities {
          id
          title
          description
          ordinal
          behaviours {
            id
            description
            title
            ordinal      
          }
        }  
      }
    }`,
    variables: {
      'formContext.query.organizationId': 'organizationId',
    }
  }
};

export default {
  query: {
    name: 'brandWithId',
    text: brandWithId,
    new: false,
    edit: true,
    variables: queryMap,
    delete: false,
    queryMessage: 'Loading Brand',      
  },
  mutation: {
    new: {
      name: 'createLeadershipBrand',
      text: createBrandForOrganization,
      objectMap: true,
      variables: {
        'formContext.organizationId': 'organizationId',      
        'formData.title': 'brandInput.title',
        'formData.description': 'brandInput.description',
        'formData.scale.id': 'brandInput.scale',
        'formData.qualities': 'brandInput.qualities',
      },
      options: {
        refetchQueries: [],
      },
      onSuccessMethod: 'route',
      onSuccessUrl: 'admin/org/${formData.organization}/brands/${createLeadershipBrand.id}', // eslint-disable-line
      onSuccessRedirectTimeout: 1000,
    },
    edit: {
      name: 'updateBrandForOrganization',
      text: updateBrandForOrganization,
      objectMap: true,
      variables: mutationMap,
      options: {
        refetchQueries: [],
      },
      onSuccessMethod: 'route',
      onSuccessUrl: 'admin/org/${formData.organization}/brands/${updateBrandForOrganization.id}?refresh=${new Date().valueOf()}', // eslint-disable-line
      onSuccessRedirectTimeout: 1000,
    },
  },
}