var fs = require('fs');
var argv = require('minimist')(process.argv.slice(2));
const path = require('path');

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const formInfo = {
  folder: 'data/forms/',
  supportsGraphQL: false,
  supportsData: false,
  model: '',
  indexJson: {
    id: '',
    uiFramework: 'material',
    uiSupport: ['material', 'bootstrap'],
    uiResources: [],
    name: '',
    nameSpace: '',
    version: '1.0.0',
    componentDefs: [],
    helpTopics: [],
    registerAsComponent: true,
    schema: {},
    uiSchema: {},
    uiSchemas: [],
  },
};
const defaultUiSchemaContent = `
// add ui schemas in this file.
export default {

};`


rl.question('NameSpace: ', (nameSpace) => {
  // TODO: Log the answer in a database
  formInfo.folder = `${formInfo.folder}${nameSpace}`;
  formInfo.indexJson.nameSpace = nameSpace;
  rl.question('Model: ', (model) => {
    formInfo.model = model;
    rl.question('Name: ', (name) => {
      formInfo.indexJson.name = name;    
      const folder = path.resolve(`${process.cwd()}/../${formInfo.folder}/${formInfo.model}`);
      //console.log(`Resolved Path: ${folder}`);
      if (!fs.existsSync(folder)) fs.mkdirSync(folder);
      fs.writeFileSync(`${folder}/${formInfo.indexJson.name}.json`, `${JSON.stringify(formInfo.indexJson)}`);      
      fs.writeFileSync(`${folder}/uiSchema.js`, `${defaultUiSchemaContent}`);
      fs.writeFileSync(`${folder}/index.js`, `
      const ${formInfo.indexJson.name} = require('./${formInfo.indexJson.name}.json);'
      import DefaultUiSchema from './uiSchema'
      
      ${formInfo.indexJson.name}.uiSchema = DefaultUiSchema;
      ${formInfo.indexJson.name}.uiSchemas = [
        { id: 'default', value: 'default' title: 'default', uiSchema: DefaultUiSchema, icon: 'view_stream' },
      ];

      export const ${formInfo.indexJson.name};
      `);
      rl.close();
    });
  });
});
