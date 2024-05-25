**Title:** Fix Baseline unit tests

**Type:** Bug

**Priority:** High

**Reporter:** Werner Weber

**Assignee:** Werner Weber

### Description:
There is an issue with the baseline core unit tests in Jest. The tests are failing and need to be fixed.

### Steps to Reproduce:
1. Run the Jest test suite. `bin/jest.sh reactory local core`
2. Observe the failing baseline tests.

### Expected Behavior:
All baseline tests should pass successfully.

### Actual Behavior:
Baseline tests are failing.

### Acceptance Criteria:
1. All baseline tests pass successfully.
2. The fix does not introduce new failures in other tests.

### Assigned to:
@wweber / @zepz-weber

### Labels:
bug, high-priority, testing

### Comments

26 May 2024 @wweber - moved the ApiStatus tests that was in the root test folder to the modules/core/resolvers/ApiStatus folder. The SupportTicket reflection test has been disabled as that feature is a WIP and will be completed as part of that feature.