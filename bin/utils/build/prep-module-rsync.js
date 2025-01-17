const fs = require('fs');
const path = require('path');

// Get the modules file path from environment variable
const modulesFilePath = process.env.MODULES_FILE || process.argv[2];
const target = process.argv[3] || path.join(process.cwd(), 'bin/build.modules.rsync');

let modules = [];
if (fs.existsSync(modulesFilePath)) {
  // Read the modules file
  fs.readFile(modulesFilePath, 'utf8', (err, data) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error(`Error reading modules file: ${err.message}`);
      process.exit(1);
    }

    // Parse the JSON data;
    try {
      modules = JSON.parse(data);
    } catch (parseErr) {
      // eslint-disable-next-line no-console
      console.error(`Error parsing modules file: ${parseErr.message}`);
      process.exit(1);
    }

    // Generate rsync filter entries
    const rsyncEntries = modules.map((module) => {
      const moduleName = module.moduleEntry.split('/')[0];
      return `+ /${moduleName}/\n+ /${moduleName}/**`;
    }).join('\n');
    const rsyncFilterContent = `+ /index.js
+ /__index.js
+ /${modulesFilePath.split('/').pop()}
+ /available.json
+ /helpers/
+ /helpers/**
${rsyncEntries}
- *`;

    // write the sync file to disc
    fs.writeFileSync(target, rsyncFilterContent);
    console.info(`Rsync filter file generated at: ${target}`);
  });
} else {
  // eslint-disable-next-line no-console
  console.error(`Modules file not found: ${modulesFilePath}`);
  process.exit(1);
}
