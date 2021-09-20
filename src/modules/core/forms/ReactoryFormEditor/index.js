
      import $schema from './schema';
      import $uiSchema from './uiSchema';
      import $graphql from './graphql';

      const ReactoryFormEditor = {
        id: 'ReactoryFormEditor',
        uiFramework: 'material',
        uiSupport: ['material'],
        uiResources: [],
        title: 'Form Editor Content',
        tags: ['Form Editor'],
        name: 'ReactoryFormEditor',
        nameSpace: 'core',
        version: '1.0.0',
        description: 'Provides a light interface to edit / create a new Reactory Form',
        author: {
          fullName: 'Werner Weber',
          email: 'werner.weber@gmail.com',
        },
        helpTopics: [
          'ReactoryFormEditor',
        ],
        defaultFormValue: {
          diagramOptions: {

          },
          nodes: [
            { id: 'test', title: 'Node Test 1', color: 'rgb(0,192,255)', ports: [{ title: 'Out Port', type: 'out' }] },
            { id: 'test', title: 'Node Test 2', color: 'rgb(192,255,0)', ports: [{ title: 'In Port', type: 'int' }] },
            { id: 'test', title: 'Node Test 3', color: 'rgb(192,0,255)', ports: [{ title: 'Out Port', type: 'out' }] }
          ]
        },
        registerAsComponent: true,
        schema: $schema,
        uiSchema: $uiSchema,
        //graphql: $graphql,        
      };

      export default ReactoryFormEditor;
