import { Reactory } from '@reactory/server-core/types/reactory';
import $schema from './schema';
import $uiSchema from './uiSchema';

export const CopyLeadershipBrand: Reactory.IReactoryForm = {
  id: 'TowerStoneCopyLeadershipBrand',
  title: 'TowerStone Leadership Brand Configuration',  
  nameSpace: 'towerstone',
  uiFramework: 'material',
  uiSupport: [ 
    'material',
  ],
  name: 'CopyLeadershipBrand',
  helpTopics: ['Create Leadership Brand'],
  version: '1.0.0',
  registerAsComponent: true,
  schema: $schema,
  uiSchema: $uiSchema,
  graphql: {
    mutation: {
      new: {
        name: 'TowerStoneCopyLeadershipBrand',
        text: `
          mutation TowerStoneLeadershipBrandCopy($input: TowerStoneLeadershipBrandCopyInput!){
            TowerStoneLeadershipBrandCopy(input: $input){
              success
              message
              leadershipBrand {
                id
                title                
              }
            }
          }
        `,
        objectMap: true,
        variables: {
          'formData.TargetOrganization': 'input.targetOrganizationId',
          'formData.SourceLeadershipBrand': 'input.sourceLeadershipBrandId',
          'formData.TargetTitle': 'input.targetTitle'
        },
        options: {
          refetchQueries: [],
        },
        onSuccessMethod: 'notify',
        notification: {

        },
        onSuccessUrl: '', // eslint-disable-line
        onSuccessRedirectTimeout: 1000,
      },      
    },
  },
};


