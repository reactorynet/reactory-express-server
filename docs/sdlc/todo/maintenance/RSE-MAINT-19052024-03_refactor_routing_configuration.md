**Title:** Update Routing Configuration for Reactory Application

**Type:** Maintenance

**Priority:** Medium

**Reporter:** [Your Name]

**Assignee:** [Assignee Name]

**Description:**

The routing configuration for the Reactory application needs to be updated. The goal is to configure and load all routes using the modules defined for the server. This task involves refactoring the routing configuration and ensuring the application still functions correctly after the update.

**Steps to Reproduce:**

1. Open the Reactory application.
2. Navigate through the application and observe the current routing behavior.

**Expected Result:**

All routes should be configured and loaded using the server-defined modules, and the application should function correctly.

**Actual Result:**

The routes are not currently configured and loaded using the server-defined modules.

**Acceptance Criteria:**

1. All routes are configured and loaded using the server-defined modules.
2. The application functions correctly after the routing configuration update.

**Sub-Tasks:**

1. Identify the current routing configuration that needs to be updated.
2. Refactor the routing configuration to use the server-defined modules.
3. Test the application to ensure it still functions correctly after the update.

**Suggested Solutions:**

1. **Refactor the routing configuration:** Update the routing configuration to use the server-defined modules.
2. **Test the application:** After refactoring, test the application to ensure it still functions correctly. If any issues are found, debug and fix them.

**Labels:** `Maintenance`, `Routing`, `Configuration`, `Refactor`

**Due Date:** [Due Date]

**Sources:**

**reactory-server/src/express/server.ts**: From line 359 change the routing to be configured per module.

**Comments:**