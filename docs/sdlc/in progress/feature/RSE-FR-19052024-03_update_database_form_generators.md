**Title:** Update Reactory Form Generators

**Type:** Feature Request

**Priority:** High

**Reporter:** Werner Weber

**Assignee:** Werner Weber

**Description:**

The Reactory form generators need to be updated. The goal is to establish the current working status of the generators and to create several working examples for each of the current generator types available under `reactory-server-express/src/reactory/schema/generators`.

**Steps to Reproduce:**

1. Open the Reactory application.
2. Navigate to `reactory-server-express/src/reactory/schema/generators`.
3. Observe the current status and examples of the form generators.

**Expected Result:**

The form generators should be fully functional, and several working examples should be available for each generator type.

**Actual Result:**

The current working status of the form generators is unknown, and there are not enough examples for each generator type.

**Acceptance Criteria:**

1. The current working status of the form generators is established.
2. Several working examples are created for each generator type.

**Sub-Tasks:**

1. Review the current form generators and establish their working status.
2. Create several working examples for each generator type.

**Suggested Solutions:**

1. **Review the form generators:** Go through each form generator and establish its working status.
2. **Refactor the form generators to the core module:** Make current generators part of the core reactory module and move to forms as a generator function.
3. **Create examples:** Create several working examples for each generator type to demonstrate their functionality and usage.
   1. mysql
   2. postgres
   3. sqlserver
   4. mongo

**Labels:** `Feature Request`, `Form Generators`, `Examples`, `Update`

**Due Date:** [Due Date]

**Sources:**

**reactory-server-express/src/reactory/schema/generators**: The directory containing the form generators that need to be updated.

**Comments:**