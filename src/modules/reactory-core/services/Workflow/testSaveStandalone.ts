import * as YAML from 'yaml';
import * as fs from 'fs';
import * as path from 'path';

async function runStandaloneTest() {
  const originalPath = '/Users/wweber/Source/reactory/reactory-express-server/src/modules/reactory-reactor/workflow/AgentGitCommit.yaml';
  const targetDir = '/Users/wweber/Source/reactory/reactory-data/workflows/catalog/reactor/AgentGitCommit/1.0.0';
  const targetFile = path.join(targetDir, 'AgentGitCommit.yaml');

  console.log('Reading original YAML from:', originalPath);
  const originalContent = fs.readFileSync(originalPath, 'utf8');

  // Parse using yaml package
  const doc = YAML.parseDocument(originalContent);

  // Let's simulate changing some values
  doc.set('description', 'AI-driven git commit: gathers repo context, consults the Reactor agent, executes the agent\'s decision. (UPDATED DESCRIPTION)');
  
  // Set inputs and metadata to simulate what the designer sends
  const inputsObject = {
    workdir: {
      type: 'string',
      required: false,
      description: 'Absolute path of the git repository root. Defaults to the server process cwd. (UPDATED INPUT)'
    }
  };
  doc.set('inputs', inputsObject);

  const metadataObject = {
    timeout: 300000,
    retryPolicy: {
      maxAttempts: 3, // updated from 2 to 3
      backoffStrategy: 'linear',
      initialDelay: 3000
    }
  };
  doc.set('metadata', metadataObject);

  // Simulate updating some steps
  const stepsSeq = doc.get('steps') as any;
  if (stepsSeq && stepsSeq.type === 'SEQ') {
    const getBranchStep = stepsSeq.items.find((item: any) => item && item.type === 'MAP' && item.get('id') === 'getBranch');
    if (getBranchStep) {
      getBranchStep.set('name', 'getBranch (UPDATED STEP NAME)');
    }
  }

  // Serialize back to YAML
  const updatedYaml = doc.toString();

  // Write to catalog
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(targetFile, updatedYaml, 'utf8');
  console.log('Saved updated YAML to:', targetFile);

  console.log('--- FIRST 50 LINES OF SAVED FILE ---');
  console.log(updatedYaml.split('\n').slice(0, 50).join('\n'));
}

runStandaloneTest().catch(err => {
  console.error('Test failed:', err);
});
