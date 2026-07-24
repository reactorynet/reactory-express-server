import * as YAML from 'yaml';

const originalYaml = `
# This is a header comment
nameSpace: test
name: TestWorkflow
version: 1.0.0

# This is a comment before metadata
metadata:
  timeout: 1000

# This is a comment before steps
steps:
  # Comment on step 1
  - id: step1
    type: log
    config:
      message: "hello"

  # Comment on step 2
  - id: step2
    type: delay
    config:
      duration: 1000
`;

const doc = YAML.parseDocument(originalYaml);
console.log('Original description:', doc.get('description'));
doc.set('description', 'Updated description');

// Update steps
const steps: any = doc.get('steps');
if (steps && steps.type === 'SEQ') {
  const step1 = steps.items.find((item: any) => item && item.type === 'MAP' && item.get('id') === 'step1');
  if (step1 && step1.type === 'MAP') {
    step1.set('name', 'Updated Step 1');
    const config = step1.get('config');
    if (config && config.type === 'MAP') {
      config.set('message', 'updated hello');
    }
  }
}

console.log('--- UPDATED YAML ---');
console.log(doc.toString());
