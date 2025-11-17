#!/bin/bash

# Workflow Routes Test Script
# This script tests the basic workflow endpoints

# Configuration
BASE_URL="http://localhost:4000"
WORKFLOW_URL="${BASE_URL}/workflow"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results tracking
PASSED=0
FAILED=0

# Function to print test results
print_result() {
    local test_name="$1"
    local result="$2"
    local response="$3"
    
    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $test_name"
        echo -e "${YELLOW}Response:${NC} $response"
        ((FAILED++))
    fi
    echo
}

# Function to test endpoint
test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local expected_status="$3"
    local test_name="$4"
    local data="$5"
    
    echo "Testing: $test_name"
    echo "Endpoint: $method $endpoint"
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X "$method" "$endpoint" \
            -H "Content-Type: application/json" \
            -H "x-client-key: reactory" \
            -H "x-client-pwd: reactory" \
            -d "$data" 2>/dev/null)
    else
        response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X "$method" "$endpoint" \
            -H "x-client-key: reactory" \
            -H "x-client-pwd: reactory" 2>/dev/null)
    fi
    
    http_status=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
    response_body=$(echo "$response" | sed 's/HTTP_STATUS:[0-9]*$//')
    
    if [ "$http_status" = "$expected_status" ]; then
        print_result "$test_name" "PASS" "$response_body"
    else
        print_result "$test_name (Expected: $expected_status, Got: $http_status)" "FAIL" "$response_body"
    fi
}

echo "=========================================="
echo "      Workflow Routes Test Suite"
echo "=========================================="
echo

# Test 1: System Status
test_endpoint "GET" "${WORKFLOW_URL}/status" "200" "Get system status"

# Test 2: Get all registered workflows
test_endpoint "GET" "${WORKFLOW_URL}/workflows" "200" "Get all registered workflows"

# Test 3: Get workflows filtered by namespace
test_endpoint "GET" "${WORKFLOW_URL}/workflows?nameSpace=reactory" "200" "Get workflows filtered by namespace"

# Test 4: Search workflows
test_endpoint "GET" "${WORKFLOW_URL}/workflows?search=test" "200" "Search workflows by name"

# Test 5: Get specific workflow (may not exist)
test_endpoint "GET" "${WORKFLOW_URL}/workflows/reactory/test-workflow" "404" "Get specific workflow (expected not found)"

# Test 6: Invalid workflow start (should fail validation)
test_endpoint "POST" "${WORKFLOW_URL}/start/" "404" "Start workflow with missing ID (should fail)"

# Test 7: Start a workflow (may fail if workflow doesn't exist, but should validate request)
test_endpoint "POST" "${WORKFLOW_URL}/start/test-workflow" "500" "Start test workflow (expected to fail - no such workflow)" '{"test": "data"}'

# Test 8: Get non-existent workflow instance
test_endpoint "GET" "${WORKFLOW_URL}/instance/non-existent" "404" "Get non-existent workflow instance"

# Test 9: Get schedules
test_endpoint "GET" "${WORKFLOW_URL}/schedules" "200" "Get workflow schedules"

# Test 10: Create schedule (should return 501 - not implemented)
test_endpoint "POST" "${WORKFLOW_URL}/schedules" "501" "Create schedule (not implemented)" '{
    "id": "test-schedule",
    "name": "Test Schedule", 
    "workflowId": "test-workflow",
    "cron": "0 0 * * *"
}'

# Test 11: Get non-existent schedule
test_endpoint "GET" "${WORKFLOW_URL}/schedules/non-existent" "404" "Get non-existent schedule"

# Test 12: Reload schedules
test_endpoint "POST" "${WORKFLOW_URL}/schedules/reload" "200" "Reload schedules"

# Test 13: Get audit logs
test_endpoint "GET" "${WORKFLOW_URL}/audit" "200" "Get audit logs"

# Test 14: Get metrics
test_endpoint "GET" "${WORKFLOW_URL}/metrics" "200" "Get system metrics"

# Test 15: Get configurations
test_endpoint "GET" "${WORKFLOW_URL}/configs" "200" "Get configurations"

echo "=========================================="
echo "           Test Results Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total: $((PASSED + FAILED))"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed! 🎉${NC}"
    exit 0
else
    echo -e "\n${YELLOW}Some tests failed. Check the output above for details.${NC}"
    exit 1
fi
