---
applyTo: "src/**/__tests__/**"
---

# Test Execution
- Tests are environment specific
- Use `$REACTORY_SERVER/bin/jest.sh config_key environment_key [jest-options]`
- Example: `$REACTORY_SERVER/bin/jest.sh development local --watch`
- Available configs: development, staging, production
- Available environments: local, docker, ci

# Writing Tests
- **TDD Plan Required**: Always create a TDD plan before writing tests
- **Plan Location**: Create `<testfile>_plan.md` in the same directory as your test file
- **Plan Format**: Include test scenarios, expected outcomes, and coverage targets
- **Coverage Target**: Minimum 80% code coverage for targeted code
- **Test Quality**: Tests must be deterministic, isolated, and maintainable
- **Documentation**: Each test should have a clear description of what it validates
- **Plan Updates**: Update the plan with actual test results and coverage metrics

# Test File Structure
```
src/feature/__tests__/
├── feature.test.ts
├── feature_plan.md
└── feature.integration.test.ts
```

# TDD Plan Template
```markdown
# Test Plan for [Feature Name]

## Test Scenarios
- [ ] Scenario 1: [Description]
- [ ] Scenario 2: [Description]

## Coverage Targets
- Target: 80% minimum
- Current: [To be filled after test execution]

## Test Results
- [ ] All tests passing
- [ ] Coverage target met
- [ ] Plan updated with results
```

# Reviewing Tests
- **Code Understanding**: Fully understand the code being tested before reviewing
- **TDD Compliance**: Verify tests follow the adjacent TDD plan
- **Coverage Verification**: Confirm 80% coverage target is met
- **Documentation Check**: Ensure tests are well-documented with clear descriptions
- **Collaboration**: If uncertain about test changes, consult with team members
- **Plan Validation**: Verify the TDD plan has been updated with test results

# Running Tests For Server
```bash
# reactory configuration environment
$REACTORY_SERVER/bin/jest.sh reactory local

# With watch mode
$REACTORY_SERVER/bin/jest.sh reactory local --watch

# Specific test file
$REACTORY_SERVER/bin/jest.sh reactory local --testPathPattern=WorkflowRunner

# Coverage report
$REACTORY_SERVER/bin/jest.sh reactory local --coverage
```