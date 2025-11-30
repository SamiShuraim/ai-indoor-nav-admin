# API Load Test Documentation

## Overview

The API Load Test page is designed to test API response times and concurrent user load for the indoor navigation system. It validates that the backend meets the performance specifications for production use.

## Test Specifications

### Performance Requirements
- **Average Response Time**: < 1 second
- **Worst Case (Max) Response Time**: < 3 seconds
- **Concurrent Users**: 50 simultaneous users

## How It Works

### Test Process
1. **50 Concurrent Requests**: The test sends 50 requests simultaneously, simulating 50 concurrent users
2. **Two-Step Process**: Each user request involves two API calls:
   - **Step 1**: Call `/api/LoadBalancer/arrivals/assign` to get a level assignment
   - **Step 2**: Call `/api/RouteNode/navigateToLevel` to get navigation from a random node to the assigned level

### APIs Tested

#### 1. Load Balancer Assign API
- **Endpoint**: `/api/LoadBalancer/arrivals/assign`
- **Method**: POST
- **Payload**:
  ```json
  {
    "age": 0,
    "isDisabled": true
  }
  ```
- **Response**: Returns the assigned level for the user

#### 2. Route Navigation API
- **Endpoint**: `/api/RouteNode/navigateToLevel`
- **Method**: POST
- **Payload**:
  ```json
  {
    "currentNodeId": <randomly selected node ID>,
    "targetLevel": <level from assign response>,
    "floorId": <floor ID of the selected node>
  }
  ```
- **Response**: Returns navigation instructions

## Test Results

### Metrics Displayed

For each API endpoint, the following metrics are calculated and displayed:

1. **Minimum Response Time**: Fastest response time across all 50 requests
2. **Maximum Response Time**: Slowest response time (worst case)
3. **Average Response Time**: Mean response time across all requests

### Pass/Fail Criteria

Each API is evaluated against the specifications:
- ✅ **PASS**: Both average < 1000ms AND max < 3000ms
- ❌ **FAIL**: Either average ≥ 1000ms OR max ≥ 3000ms

### Combined Total Time

The page also displays the combined time (assign + navigate) for:
- Min total time
- Max total time
- Average total time

### Detailed Results Table

A detailed table shows individual results for all 50 requests, including:
- Request number
- Success/failure status
- Assign API response time
- Navigate API response time
- Total time
- Assigned level
- Error message (if failed)

## Accessing the Test Page

1. Log in to the Admin Portal
2. Click on the **"API Load Test"** card from the Dashboard
3. Click the **"Run Load Test"** button to start the test
4. Wait for the test to complete (progress bar shows completion status)
5. Review the results and determine if the APIs meet specifications

## Interpreting Results

### Success Indicators
- High success count (50/50 is ideal)
- Green checkmarks (✅) on both API cards
- Average times well below 1000ms
- Maximum times well below 3000ms

### Performance Issues
- Red X marks (❌) indicate spec violations
- High failure count suggests reliability issues
- Max times approaching 3000ms suggest capacity concerns
- Large variance between min and max suggests inconsistent performance

## Technical Details

### Route Nodes Used for Testing
The test uses 48 predefined route nodes across multiple floors (1, 3, and 4) with various level assignments. Each request randomly selects a node to simulate realistic navigation scenarios.

### Concurrent Execution
All 50 requests are initiated simultaneously using JavaScript Promises, accurately simulating concurrent user load on the backend.

## Troubleshooting

### Common Issues

1. **All requests fail**: 
   - Check backend server is running
   - Verify authentication token is valid
   - Check API endpoints are accessible

2. **High failure rate**:
   - Backend may be overloaded
   - Database connection issues
   - Check server logs for errors

3. **Slow response times**:
   - Database queries may need optimization
   - Insufficient server resources
   - Network latency issues

## Future Enhancements

Potential improvements to the test page:
- Configurable number of concurrent users
- Different age and disability profiles
- Historical test results tracking
- Continuous load testing mode
- Export results to CSV/JSON
- Graph visualization of response times
