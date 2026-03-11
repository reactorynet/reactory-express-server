# Test Plan for @cached Decorator

## Test Scenarios
- [x] Scenario 1: Returns cached value on cache hit (skips method execution)
- [x] Scenario 2: Executes method and caches result on cache miss
- [x] Scenario 3: Respects TTL option when writing to cache
- [x] Scenario 4: Resolves template key placeholders from arguments
- [x] Scenario 5: Resolves nested property placeholders (e.g. `${0.id}`)
- [x] Scenario 6: Falls through to method when no Reactory context is available
- [x] Scenario 7: Falls through to method when RedisService is unavailable
- [x] Scenario 8: Falls through to method when cache read throws
- [x] Scenario 9: Still returns result when cache write throws
- [x] Scenario 10: Supports contextSource 'params' (scans method args for context)
- [x] Scenario 11: Supports custom serialise / deserialise functions
- [x] Scenario 12: Works with static keys (no placeholders)

## Coverage Targets
- Target: 80% minimum
- Current: To be filled after test execution

## Test Results
- [ ] All tests passing
- [ ] Coverage target met
- [ ] Plan updated with results
