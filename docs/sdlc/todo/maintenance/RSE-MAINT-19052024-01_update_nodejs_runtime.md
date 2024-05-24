**Title:** Update Node.js Runtime to Latest LTS Version

**Type:** Maintenance

**Priority:** Medium

**Reporter:** [Your Name]

**Assignee:** [Assignee Name]

**Description:**

We need to update the Node.js runtime for the Reactory Server Express application to the latest LTS (Long Term Support) version. This will ensure that we are using a version of Node.js that is stable, well-supported, and includes the latest security updates.

**Acceptance Criteria:**

1. The Node.js runtime is updated to the latest LTS version.
2. The application builds and runs correctly with the updated Node.js version.
3. All tests pass with the updated Node.js version.
4. The Dockerfile (if applicable) is updated to use the latest LTS version of Node.js.

**Sub-Tasks:**

1. Research the latest LTS version of Node.js.
2. Update the Node.js version in the development environment and test the application.
3. Update the Node.js version in the Dockerfile (if applicable).
4. Test the application in a staging environment with the updated Node.js version.
5. Deploy the application with the updated Node.js version to the production environment.

**Suggested Solutions:**

1. **Use nvm:** Consider using nvm (Node Version Manager) to manage and update the Node.js version.
2. **Update Dockerfile:** If a Dockerfile is used, update the base image to the latest LTS version of Node.js.

**Labels:** `Node.js`, `Update`, `LTS`, `Maintenance`

**Due Date:** [Due Date]

**Sources:**

**reactory-server-express/package.json**: The package.json file for the Reactory Server Express application. This file may need to be updated as part of this task.
**reactory-server-express/Dockerfile**: The Dockerfile for the Reactory Server Express application. This file may need to be updated as part of this task.

**Comments:**