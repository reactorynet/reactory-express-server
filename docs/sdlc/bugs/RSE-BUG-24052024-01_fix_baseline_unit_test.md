**Title:** Fix Baseline unit tests

**Type:** Bug

**Priority:** High

**Reporter:** Werner Weber

**Assignee:** Werner Weber

### Description:
There is an issue with the baseline unit tests in Jest. The tests are failing and need to be fixed.

### Steps to Reproduce:
1. Run the Jest test suite. `bin/jest.sh reactory local`
2. Observe the failing baseline tests.

### Expected Behavior:
All baseline tests should pass successfully.

### Actual Behavior:
Baseline tests are failing.

### Additional Context:
Baseline login has changed, need to update the unit tests

### Acceptance Criteria:
1. All baseline tests pass successfully.
2. The fix does not introduce new failures in other tests.

### Assigned to:
@wweber / @zepz-weber

### Labels:
bug, high-priority, testing