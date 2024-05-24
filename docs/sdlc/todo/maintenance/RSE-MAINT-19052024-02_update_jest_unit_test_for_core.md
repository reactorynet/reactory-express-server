**Title:** Update Unit Test for Core Module Definition

**Type:** Maintenance

**Priority:** Medium

**Reporter:** Werner Weber

**Assignee:** [Assignee Name]

**Description:**

The unit tests for the core application need to be updated. Specifically, the tests need to move to the core module definition. This task involves refactoring the tests and ensuring they still pass after the update.

**Steps to Reproduce:**

1. Open the core application.
2. Run the existing unit tests.
3. Observe that the tests are not located in the core module definition.

**Expected Result:**

The unit tests should be located in the core module definition and should pass when run.

**Actual Result:**

The unit tests are not located in the core module definition.

**Acceptance Criteria:**

1. The unit tests are refactored to be located in the core module definition.
2. The refactored tests pass when run.

**Sub-Tasks:**

1. Identify the unit tests that need to be moved to the core module definition.
2. Refactor the identified tests to be located in the core module definition.
3. Run the refactored tests to ensure they still pass.

**Suggested Solutions:**

1. **Refactor the tests:** Move the tests to the core module definition and update any necessary references or imports.
2. **Run the tests:** After refactoring, run the tests to ensure they still pass. If any tests fail, debug and fix the issues causing the failures.

**Labels:** `Maintenance`, `Unit Test`, `Core Module`, `Refactor`

**Due Date:** [Due Date]

**Sources:**

**core/src/tests**: The directory containing the existing unit tests for the core application. This code will need to be updated as part of this task.

**Comments:**