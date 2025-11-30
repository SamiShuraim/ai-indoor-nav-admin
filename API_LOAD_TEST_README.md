# API Load Test Feature - Complete Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Implementation Status](#implementation-status)
4. [Usage Guide](#usage-guide)
5. [Technical Details](#technical-details)
6. [Troubleshooting](#troubleshooting)
7. [Documentation](#documentation)

---

## 🎯 Overview

The API Load Test feature tests whether your backend can handle **50 concurrent users** with response times meeting production specifications:
- **Average Response Time**: < 1 second
- **Maximum Response Time**: < 3 seconds

### What It Tests
1. **Load Balancer Assignment API** - Assigns visitors to levels
2. **Route Navigation API** - Generates routes to assigned levels

---

## 🚀 Quick Start

### For Frontend Developers
✅ **Everything is ready!** Just run the app:

```bash
npm install
npm start
```

Navigate to: Dashboard → API Load Test → Run Load Test

### For Backend Developers
⚠️ **Action Required**: Implement this endpoint:

**POST** `/api/RouteNode/navigateToLevel`

```json
{
  "currentNodeId": 19,
  "targetLevel": 1,
  "floorId": 1
}
```

See [Backend Implementation](#backend-implementation) section below.

---

## ✅ Implementation Status

### Frontend Components (Complete)
| Component | Status | Description |
|-----------|--------|-------------|
| APILoadTest.tsx | ✅ | Main test component |
| APILoadTest.css | ✅ | Styling |
| App.tsx | ✅ | Route integration |
| Dashboard.tsx | ✅ | Navigation button |
| api.ts | ✅ | API constants |
| ui.ts | ✅ | UI text constants |

### Backend APIs
| API | Status | Notes |
|-----|--------|-------|
| `/api/LoadBalancer/arrivals/assign` | ✅ | Already exists |
| `/api/RouteNode/navigateToLevel` | ⚠️ | Needs implementation |

### Build Status
- ✅ TypeScript compilation: Passed
- ✅ Build: Successful
- ✅ Linting: No errors
- ✅ Dependencies: All installed

---

## 📖 Usage Guide

### Step-by-Step Instructions

#### 1. Start the Application
```bash
npm start
```

#### 2. Access the Test Page
1. Open browser to `http://localhost:3000`
2. Login to admin portal
3. Click **"API Load Test"** card on dashboard

#### 3. Run the Test
1. Review test specifications displayed on the page
2. Click **"Run Load Test"** button
3. Wait for progress bar to reach 100%
4. Review results

#### 4. Interpret Results

**Success Indicators:**
- ✅ Green cards with checkmarks
- Average times < 1000ms
- Max times < 3000ms
- High success rate (≥45/50)

**Failure Indicators:**
- ❌ Red cards with X marks
- Average times ≥ 1000ms
- Max times ≥ 3000ms
- Low success rate (<45/50)

---

## 🔧 Technical Details

### Test Process

```
For each of 50 concurrent users:
  1. Call POST /api/LoadBalancer/arrivals/assign
     - Body: { age: 0, isDisabled: true }
     - Track response time
     - Save assigned level
  
  2. Select random route node
     - From 48 predefined nodes
     - Across floors 1, 3, and 4
  
  3. Call POST /api/RouteNode/navigateToLevel
     - Body: { currentNodeId, targetLevel, floorId }
     - Track response time
     - Validate success
  
  4. Record results
     - Individual times
     - Success/failure status
     - Error messages if any
```

### Performance Metrics

For each API endpoint, the test calculates:

| Metric | Formula | Specification |
|--------|---------|---------------|
| **Minimum** | `Math.min(...times)` | Informational |
| **Maximum** | `Math.max(...times)` | Must be < 3000ms |
| **Average** | `sum(times) / count` | Must be < 1000ms |

### Route Nodes Data

The test uses 48 predefined route nodes:

```javascript
Floor 1 (Nodes 19-36):
  - Levels: null, 1

Floor 3 (Nodes 37-52):
  - Levels: null, 2

Floor 4 (Nodes 53-67):
  - Levels: null, 3
```

---

## 🛠️ Backend Implementation

### Required Endpoint

Implement this endpoint in your backend:

```python
# Python/Flask Example
@app.route('/api/RouteNode/navigateToLevel', methods=['POST'])
def navigate_to_level():
    data = request.json
    
    current_node_id = data['currentNodeId']
    target_level = data['targetLevel']
    floor_id = data['floorId']
    
    # Your navigation logic:
    # 1. Find current node from database
    # 2. Find target nodes on target level
    # 3. Calculate shortest path (A*, Dijkstra, etc.)
    # 4. Return navigation instructions
    
    return jsonify({
        "path": [/* array of node IDs */],
        "distance": 0.0,
        "estimatedTime": 0,
        "instructions": [/* turn-by-turn */]
    })
```

```javascript
// Node.js/Express Example
app.post('/api/RouteNode/navigateToLevel', async (req, res) => {
  const { currentNodeId, targetLevel, floorId } = req.body;
  
  // Your navigation logic
  const currentNode = await findNode(currentNodeId);
  const targetNodes = await findNodesByLevel(targetLevel);
  const path = calculatePath(currentNode, targetNodes);
  
  res.json({
    path: path,
    distance: calculateDistance(path),
    estimatedTime: estimateTime(path),
    instructions: generateInstructions(path)
  });
});
```

### Performance Optimization Tips

1. **Database Queries**
   - Use connection pooling (min 50 connections)
   - Add indexes on frequently queried columns
   - Cache node data in memory if possible

2. **Path Calculation**
   - Pre-calculate common routes
   - Use spatial indexes for geographic queries
   - Implement caching layer (Redis)

3. **Server Configuration**
   - Scale horizontally if needed
   - Use load balancer for multiple instances
   - Monitor memory and CPU usage

---

## 🐛 Troubleshooting

### Common Issues

#### All Requests Fail
**Symptoms:**
- 0/50 success rate
- Error messages in all rows

**Causes & Solutions:**
| Cause | Solution |
|-------|----------|
| Backend not running | Start backend server |
| Endpoint not implemented | Implement `/navigateToLevel` |
| CORS issues | Configure CORS headers |
| Authentication failing | Check JWT token validity |

#### Slow Response Times
**Symptoms:**
- Average > 1000ms
- Maximum > 3000ms

**Causes & Solutions:**
| Cause | Solution |
|-------|----------|
| Unoptimized queries | Add database indexes |
| No connection pooling | Configure pool (50+ connections) |
| Synchronous operations | Use async/await |
| No caching | Implement Redis cache |

#### Intermittent Failures
**Symptoms:**
- Success rate 60-80%
- Random timeouts

**Causes & Solutions:**
| Cause | Solution |
|-------|----------|
| Connection limit reached | Increase max connections |
| Memory issues | Scale up server resources |
| Deadlocks | Review transaction handling |
| Rate limiting | Adjust rate limit settings |

### Debug Mode

Add console logs to track request flow:

```typescript
// In APILoadTest.tsx, add logging:
console.log('Request', requestNumber, {
  assignTime,
  navigateTime,
  totalTime,
  success,
  error
});
```

---

## 📚 Documentation

### File Structure
```
/workspace/
├── src/
│   ├── components/
│   │   ├── APILoadTest.tsx        # Main component
│   │   └── APILoadTest.css        # Styling
│   ├── constants/
│   │   ├── api.ts                 # API endpoints
│   │   └── ui.ts                  # UI text
│   └── App.tsx                     # Route configuration
│
├── API_LOAD_TEST.md               # Full documentation
├── API_LOAD_TEST_QUICK_START.md   # Quick reference
├── API_LOAD_TEST_ARCHITECTURE.md  # Technical architecture
├── API_LOAD_TEST_IMPLEMENTATION_SUMMARY.md
└── API_LOAD_TEST_README.md        # This file
```

### Additional Documentation

| Document | Purpose |
|----------|---------|
| [API_LOAD_TEST.md](./API_LOAD_TEST.md) | Complete feature documentation |
| [API_LOAD_TEST_QUICK_START.md](./API_LOAD_TEST_QUICK_START.md) | TL;DR guide |
| [API_LOAD_TEST_ARCHITECTURE.md](./API_LOAD_TEST_ARCHITECTURE.md) | System design & flow |
| [API_LOAD_TEST_IMPLEMENTATION_SUMMARY.md](./API_LOAD_TEST_IMPLEMENTATION_SUMMARY.md) | Changes made |

---

## 🎨 UI Components

### Test Page Sections

1. **Header**
   - Back to Dashboard button
   - Page title

2. **Test Information**
   - Response time requirements
   - Concurrent load specifications

3. **Test Controls**
   - Run Test button
   - Progress bar (during execution)

4. **Results Display**
   - Overall statistics (success/failure count)
   - Per-API metrics cards (Assign, Navigate)
   - Combined total time card
   - Detailed results table

### Color Coding

| Color | Meaning | When Applied |
|-------|---------|--------------|
| Green | Passing | Both avg < 1s AND max < 3s |
| Red | Failing | Either avg ≥ 1s OR max ≥ 3s |
| Blue | Info | Combined totals (no spec) |

---

## 🔐 Security Considerations

- ✅ All requests require authentication
- ✅ JWT token automatically included
- ✅ No sensitive data in request bodies
- ✅ Error messages sanitized

---

## 📊 Example Results

### Passing Test
```
API Load Test Results

Overall Statistics
Success: 50 / 50
Failures: 0

✅ Assign API (/api/LoadBalancer/arrivals/assign)
   Min:     123ms
   Max:     456ms
   Average: 234ms
   ✓ Average < 1000ms: PASS
   ✓ Max < 3000ms: PASS

✅ Navigate API (/api/RouteNode/navigateToLevel)
   Min:     234ms
   Max:     678ms
   Average: 345ms
   ✓ Average < 1000ms: PASS
   ✓ Max < 3000ms: PASS
```

### Failing Test
```
API Load Test Results

Overall Statistics
Success: 48 / 50
Failures: 2

❌ Assign API (/api/LoadBalancer/arrivals/assign)
   Min:     1234ms
   Max:     3456ms
   Average: 1567ms
   ✗ Average < 1000ms: FAIL
   ✗ Max < 3000ms: FAIL

✅ Navigate API (/api/RouteNode/navigateToLevel)
   Min:     234ms
   Max:     678ms
   Average: 345ms
   ✓ Average < 1000ms: PASS
   ✓ Max < 3000ms: PASS
```

---

## 🚦 Next Steps

1. ✅ Frontend implementation (Complete)
2. ⚠️ Backend endpoint implementation (Pending)
3. 🎯 Run initial test
4. 🔧 Optimize based on results
5. ✅ Deploy to production

---

## 💡 Tips for Success

1. **Test Early**: Run tests frequently during development
2. **Optimize Gradually**: Start with working code, optimize later
3. **Monitor Resources**: Watch server CPU, memory, and database connections
4. **Cache Intelligently**: Cache static data like route nodes
5. **Scale Smart**: Add resources only where bottlenecks exist

---

## 📞 Support

For questions or issues:
1. Check [Troubleshooting](#troubleshooting) section
2. Review [API_LOAD_TEST.md](./API_LOAD_TEST.md)
3. Check server logs for backend errors
4. Review browser console for frontend errors

---

## ✨ Feature Highlights

- 🚀 **Fast**: Tests complete in seconds
- 📊 **Comprehensive**: Detailed metrics per API
- 🎯 **Accurate**: High-precision timing
- 💪 **Reliable**: Handles partial failures gracefully
- 🎨 **Visual**: Clear pass/fail indicators
- 📱 **Responsive**: Works on all screen sizes

---

**Ready to test your APIs? Let's make sure they're production-ready! 🚀**
