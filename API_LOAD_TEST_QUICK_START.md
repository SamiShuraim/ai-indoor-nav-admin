# API Load Test - Quick Start Guide

## TL;DR

A new "API Load Test" page has been added to test if your backend APIs can handle 50 concurrent users and respond within the required time limits (avg < 1s, max < 3s).

## What You Need

### Frontend (✅ Complete)
Everything is already implemented and ready to use!

### Backend (⚠️ Action Required)
You need to implement ONE new endpoint:

**POST** `/api/RouteNode/navigateToLevel`

```json
Request:
{
  "currentNodeId": 19,    // ID of starting route node
  "targetLevel": 1,        // Target level from load balancer
  "floorId": 1            // Floor ID of the starting node
}

Response:
{
  // Your navigation response here
  // Could be path, directions, next node, etc.
}
```

## How to Test

### Step 1: Start the Application
```bash
npm start
```

### Step 2: Navigate to Test Page
1. Login to admin portal
2. Click "API Load Test" card on dashboard
3. Click "Run Load Test" button

### Step 3: Review Results
The test will:
- Send 50 concurrent requests
- Each request calls 2 APIs (assign + navigate)
- Display min/max/avg times for each API
- Show ✅ or ❌ based on spec compliance

## What Gets Tested

### API 1: Load Balancer Assignment
- **Endpoint**: `/api/LoadBalancer/arrivals/assign`
- **Already Exists**: ✅ Yes
- **What it does**: Assigns a level to a visitor

### API 2: Route Navigation (NEW)
- **Endpoint**: `/api/RouteNode/navigateToLevel`
- **Needs Implementation**: ⚠️ Yes
- **What it should do**: Return navigation from current node to target level

## Success Criteria

Your backend passes if:
- ✅ Both APIs average < 1000ms
- ✅ Both APIs max < 3000ms
- ✅ At least 45/50 requests succeed

## Example Backend Implementation

Here's a sample implementation structure for the new endpoint:

```python
@app.route('/api/RouteNode/navigateToLevel', methods=['POST'])
def navigate_to_level():
    data = request.json
    current_node_id = data['currentNodeId']
    target_level = data['targetLevel']
    floor_id = data['floorId']
    
    # Your navigation logic here:
    # 1. Find current node
    # 2. Find all nodes on target level
    # 3. Calculate path/route
    # 4. Return navigation instructions
    
    return {
        "path": [...],  # Your path data
        "distance": 0,
        "estimatedTime": 0
    }
```

## Test Data

The frontend randomly selects from 48 route nodes:
- **Floor 1**: Nodes 19-36 (some with level=1)
- **Floor 3**: Nodes 37-52 (some with level=2)  
- **Floor 4**: Nodes 53-67 (some with level=3)

## Common Issues

### All Requests Fail
**Problem**: Backend endpoint doesn't exist
**Solution**: Implement `/api/RouteNode/navigateToLevel` endpoint

### Slow Response Times
**Problem**: Database queries or calculations taking too long
**Solution**: Add caching, optimize queries, pre-calculate routes

### Some Requests Timeout
**Problem**: Backend can't handle 50 concurrent requests
**Solution**: Increase server resources, add connection pooling

## Files Added

```
src/
  components/
    APILoadTest.tsx          # Main test component
    APILoadTest.css          # Styling
  constants/
    api.ts                   # Added ROUTE_NODES_NAVIGATE_TO_LEVEL
    ui.ts                    # Added card text constants
App.tsx                      # Added route and navigation
API_LOAD_TEST.md            # Full documentation
API_LOAD_TEST_QUICK_START.md # This file
```

## Next Steps

1. ✅ Frontend is ready
2. ⚠️ Implement backend endpoint
3. ✅ Run the test
4. 🎯 Optimize if needed
5. ✅ Deploy when passing

## Questions?

Check the full documentation: `API_LOAD_TEST.md`
