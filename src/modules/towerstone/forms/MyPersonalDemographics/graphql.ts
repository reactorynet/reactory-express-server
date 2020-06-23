import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'GetPersonalDemographics',
    text: `
        query GetPersonalDemographics($userId: String!){
          GetPersonalDemographics(userId: $userId){
            userId
            race
            age
            gender
            position
            region
            operationalGroup
            businessUnit
            team
          }
        }
      `,
    variables: {
      'formData.id': 'userId',

    },
    resultMap: {
      'userId': 'id',
      'age': 'age',
      'race': 'race',
      'gender': 'gender',
      '.region': 'region',
      'position': 'position',
      'operationalGroup': 'operationalGroup',
      'businessUnit': 'businessUnit',
      'team': 'team',
    },
    new: true,
    edit: true,
  },
  mutation: {
    new: {
      name: 'CoreSetPersonalDemographics',
      text: `
        mutation CoreSetPersonalDemographics($personalDemographics: PersonalDemographicsInput!){
          CoreSetPersonalDemographics(personalDemographics: $personalDemographics){
            success
            message
          }
        }
      `,
      objectMap: true,
      variables: {
        'formData.id': 'personalDemographics.id',
        'formData.race': 'personalDemographics.race',
        'formData.age': 'personalDemographics.age',
        'formData.gender': 'personalDemographics.gender',
        'formData.position': 'personalDemographics.position',
        'formData.region': 'personalDemographics.region',
        'formData.operationalGroup': 'personalDemographics.operationalGroup',
        'formData.businessUnit': 'personalDemographics.businessUnit',
        'formData.team': 'personalDemographics.team',
      },
      onSuccessMethod: 'refresh'
      // options: {
      // refetchQueries: [],
      // },
      // onSuccessMethod: 'notify',
      // notification: {
      // text: '${CoreSetPersonalDemographics.data.message}'
      // },
      // onSuccessUrl: '', // eslint-disable-line
      // onSuccessRedirectTimeout: 1000,
    },
    edit: {
      name: 'CoreSetPersonalDemographics',
      text: `
        mutation CoreSetPersonalDemographics($personalDemographics: PersonalDemographicsInput!){
          CoreSetPersonalDemographics(personalDemographics: $personalDemographics){
            success
            message
          }
        }
      `,
      objectMap: true,
      variables: {
        'formData.id': 'personalDemographics.userId',
        'formData.race': 'personalDemographics.race',
        'formData.age': 'personalDemographics.age',
        'formData.gender': 'personalDemographics.gender',
        'formData.position': 'personalDemographics.position',
        'formData.region': 'personalDemographics.region',
        'formData.operationalGroup': 'personalDemographics.operationalGroup',
        'formData.businessUnit': 'personalDemographics.businessUnit',
        'formData.team': 'personalDemographics.team',
      },
      onSuccessMethod: 'refresh'
      // options: {
      // refetchQueries: [],
      // },
      // onSuccessMethod: 'notify',
      // notification: {
      // text: '${CoreSetPersonalDemographics.data.message}'
      // },
      // onSuccessUrl: '', // eslint-disable-line
      // onSuccessRedirectTimeout: 1000,
    },
  }
};

export default graphql;
