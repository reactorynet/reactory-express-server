import * as YAML from 'yaml';

const originalYaml = `
# Header comment
nameSpace: test
name: TestWorkflow
version: 1.0.0

steps:
  # Comment on step 1
  - id: step1
    type: log
    config:
      message: "hello"
`;

const doc = YAML.parseDocument(originalYaml);
const stepsSeq = doc.get('steps') as any;

const newSteps = [
  {
    id: 'step1',
    type: 'log',
    config: { message: 'updated hello' },
    name: 'Updated Step 1'
  },
  {
    id: 'step2',
    type: 'delay',
    config: { duration: 500 }
  }
];

const existingMap = new Map<string, any>();
stepsSeq.items.forEach((item: any) => {
  if (item && item.type === 'MAP') {
    const id = item.get('id');
    if (id) existingMap.set(id, item);
  }
});

const mergedItems: any[] = [];
newSteps.forEach((newStep) => {
  const existingStep = existingMap.get(newStep.id);
  if (existingStep) {
    const newKeys = Object.keys(newStep);
    const existingKeys = existingStep.items.map((pair: any) => pair.key.value);
    
    existingKeys.forEach((key: string) => {
      if (!newKeys.includes(key)) {
        existingStep.delete(key);
      }
    });
    
    newKeys.forEach((key) => {
      existingStep.set(key, (newStep as any)[key]);
    });
    
    mergedItems.push(existingStep);
  } else {
    mergedItems.push(YAML.createNode(newStep));
  }
});

stepsSeq.items = mergedItems;

console.log(doc.toString());
