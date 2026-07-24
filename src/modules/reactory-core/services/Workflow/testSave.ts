import ReactoryWorkflowService from './ReactoryWorkflowService';
import * as fs from 'fs';
import * as path from 'path';
import * as jsYaml from 'js-yaml';

// Mock context
const mockContext = {
  log: (msg: string, meta?: any, level: string = 'info') => {
    console.log(`[${level.toUpperCase()}] ${msg}`, meta || '');
  },
  colors: {
    green: (s: string) => s,
  }
} as any;

async function runTest() {
  const service = new ReactoryWorkflowService({}, mockContext);
  
  // 1. Read original YAML file
  const originalPath = '/Users/wweber/Source/reactory/reactory-express-server/src/modules/reactory-reactor/workflow/AgentGitCommit.yaml';
  const originalContent = fs.readFileSync(originalPath, 'utf8');
  const parsedOriginal: any = jsYaml.load(originalContent);
  
  // 2. Build the WorkflowDefinitionInput that the designer would send
  // We simulate the designer sending the definition.
  const definitionInput: any = {
    nameSpace: parsedOriginal.nameSpace,
    name: parsedOriginal.name,
    version: parsedOriginal.version,
    description: parsedOriginal.description,
    author: parsedOriginal.author,
    tags: parsedOriginal.tags,
    inputs: parsedOriginal.inputs,
    outputs: parsedOriginal.outputs,
    variables: parsedOriginal.variables,
    metadata: {
      timeout: 300000,
      retryPolicy: {
        maxAttempts: 2,
        backoffStrategy: 'linear',
        initialDelay: 3000
      }
    },
    steps: parsedOriginal.steps.map((step: any) => ({
      id: step.id,
      type: step.type,
      name: step.name,
      description: step.description,
      enabled: step.enabled ?? true,
      continueOnError: step.continueOnError ?? false,
      timeout: step.timeout ?? null,
      inputs: step.inputs,
      outputs: step.outputs,
      condition: step.condition,
      dependsOn: step.dependsOn,
      config: step.config,
      steps: step.steps,
    })),
    designer: {
      canvas: { zoom: 1, panX: 0, panY: 0, gridSize: 20, snapToGrid: true },
      connections: [],
    }
  };

  // 3. Make sure the target directory and file exist with the stripped version first
  // so we can test merging and comment preservation!
  const targetDir = '/Users/wweber/Source/reactory/reactory-data/workflows/catalog/reactor/AgentGitCommit/1.0.0';
  const targetFile = path.join(targetDir, 'AgentGitCommit.yaml');
  
  // Restore the original file to targetFile first, so we have comments to preserve!
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(targetFile, originalContent, 'utf8');
  console.log('Restored original file with comments to target path.');

  // 4. Run saveWorkflowDefinition
  console.log('Saving workflow definition...');
  const result = await service.saveWorkflowDefinition(definitionInput);
  console.log('Save result status:', result.loadStatus);
  console.log('Save result errors:', result.errors);

  // 5. Read the saved file and check if comments, inputs, and metadata are preserved
  const savedContent = fs.readFileSync(targetFile, 'utf8');
  console.log('--- SAVED FILE HEADER ---');
  console.log(savedContent.substring(0, 1500));
}

runTest().catch(err => {
  console.error('Test failed:', err);
});
