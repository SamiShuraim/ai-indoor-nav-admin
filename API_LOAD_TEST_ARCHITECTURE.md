# API Load Test - Architecture & Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Admin Portal                            │
│                                                                   │
│  ┌──────────────┐         ┌─────────────────────────────────┐  │
│  │  Dashboard   │────────>│      API Load Test Page         │  │
│  │              │         │                                   │  │
│  │ [Card Click] │         │  • 50 Concurrent Test Executor   │  │
│  └──────────────┘         │  • Performance Metrics Calculator│  │
│                           │  • Results Display & Validation  │  │
│                           └─────────────────────────────────┘  │
│                                          │                       │
└──────────────────────────────────────────┼───────────────────────┘
                                          │
                                          │ 50 Concurrent Requests
                                          │ (Each makes 2 API calls)
                                          │
                                          ▼
        ┌─────────────────────────────────────────────────────┐
        │              Backend API Server                      │
        │                                                       │
        │  ┌────────────────────┐   ┌─────────────────────┐  │
        │  │  Load Balancer API │   │  Route Node API     │  │
        │  │  /arrivals/assign  │   │  /navigateToLevel   │  │
        │  │                    │   │                     │  │
        │  │  Returns: level    │   │  Returns: route     │  │
        │  └────────────────────┘   └─────────────────────┘  │
        │           │                         ▲                │
        └───────────┼─────────────────────────┼────────────────┘
                    │                         │
                    │  level assigned         │  currentNodeId,
                    └─────────────────────────┘  targetLevel, floorId
```

## Request Flow

### Single Request Flow

```
User clicks "Run Load Test"
        │
        ▼
┌────────────────────────────────────────────────────────────┐
│  Test Controller                                            │
│  • Creates 50 concurrent request promises                   │
│  • Tracks progress                                          │
└────────────────────────────────────────────────────────────┘
        │
        ├─── Request 1 ───┐
        ├─── Request 2 ───┤
        ├─── Request 3 ───┤
        ├─── ...          ├──> Each Request:
        ├─── Request 48 ──┤    
        ├─── Request 49 ──┤    ┌─────────────────────────────┐
        └─── Request 50 ──┘    │ Step 1: Assign Level        │
                               │ POST /arrivals/assign       │
                               │ ⏱️ Track time (assignTime)  │
                               │ 📦 Get level                │
                               └──────────────┬──────────────┘
                                             │
                                             ▼
                               ┌─────────────────────────────┐
                               │ Step 2: Navigate to Level   │
                               │ POST /navigateToLevel       │
                               │ ⏱️ Track time (navigateTime)│
                               │ 📦 Get route                │
                               └──────────────┬──────────────┘
                                             │
                                             ▼
                               ┌─────────────────────────────┐
                               │ Calculate Result            │
                               │ • Total time                │
                               │ • Success/failure status    │
                               │ • Error if failed           │
                               └─────────────────────────────┘
```

## Data Flow

### 1. Test Initialization
```
User Action
    ↓
setIsRunning(true)
setResults([])
setSummary(null)
setProgress(0)
    ↓
Create 50 promises
```

### 2. Single Request Data Flow
```
Request Start
    ↓
Step 1: Assign API
    Input:  { age: 0, isDisabled: true }
    Output: { level: N, visitorId: "...", decision: {...} }
    ↓
Random Node Selection
    Input:  ROUTE_NODES array (48 nodes)
    Output: { id, floor_id, level }
    ↓
Step 2: Navigate API  
    Input:  { currentNodeId, targetLevel, floorId }
    Output: { /* route data */ }
    ↓
Result Aggregation
    Output: {
        requestNumber,
        assignTime,
        navigateTime,
        totalTime,
        success,
        assignedLevel,
        error?
    }
```

### 3. Results Processing
```
All 50 Requests Complete
    ↓
Filter successful results
    ↓
Calculate Metrics for Each API:
    • Min time: Math.min(...times)
    • Max time: Math.max(...times)
    • Avg time: sum(times) / count
    ↓
Validate Against Specs:
    • assignPassesSpec = (avg < 1000ms) && (max < 3000ms)
    • navigatePassesSpec = (avg < 1000ms) && (max < 3000ms)
    ↓
Display Results
    • Summary cards
    • Pass/fail indicators
    • Detailed table
```

## Component Structure

```
APILoadTest.tsx
│
├── State Management
│   ├── isRunning: boolean
│   ├── results: TestResult[]
│   ├── summary: TestSummary | null
│   └── progress: number
│
├── Functions
│   ├── getRandomNode(): RouteNode
│   ├── runSingleTest(n): Promise<TestResult>
│   ├── calculateSummary(results): TestSummary
│   ├── runLoadTest(): Promise<void>
│   ├── formatTime(ms): string
│   └── getStatusIcon(passes): string
│
└── UI Components
    ├── Header (Back button, Title)
    ├── Test Info (Specifications)
    ├── Test Controls (Run button, Progress bar)
    └── Test Results
        ├── Summary Cards
        ├── API Result Cards (Assign, Navigate, Total)
        └── Detailed Results Table
```

## Type Definitions

```typescript
interface RouteNode {
  id: number
  floor_id: number
  level: number | null
}

interface TestResult {
  requestNumber: number
  assignTime: number
  navigateTime: number
  totalTime: number
  success: boolean
  error?: string
  assignedLevel?: number
  visitorId?: string
}

interface TestSummary {
  assignMin: number
  assignMax: number
  assignAvg: number
  navigateMin: number
  navigateMax: number
  navigateAvg: number
  totalMin: number
  totalMax: number
  totalAvg: number
  successCount: number
  failureCount: number
  assignPassesSpec: boolean
  navigatePassesSpec: boolean
}
```

## Constants

```typescript
CONCURRENT_USERS = 50
SPEC_AVG_MS = 1000      // 1 second
SPEC_MAX_MS = 3000      // 3 seconds
ROUTE_NODES = 48 nodes   // Predefined test data
```

## Integration Points

### 1. App.tsx
```typescript
Routes:
  /api-load-test → <APILoadTest onBack={handleNavigateToDashboard} />

Navigation:
  handleNavigateToAPILoadTest() → navigate('/api-load-test')
```

### 2. Dashboard.tsx
```typescript
Props:
  onNavigateToAPILoadTest: () => void

Handler:
  handleAPILoadTestClick() → calls onNavigateToAPILoadTest()

UI:
  Card with title "API Load Test"
```

### 3. API Constants
```typescript
ROUTE_NODES_NAVIGATE_TO_LEVEL: '/api/RouteNode/navigateToLevel'
```

### 4. UI Constants
```typescript
CARD_API_LOAD_TEST_TITLE: 'API Load Test'
CARD_API_LOAD_TEST_DESC: 'Test API response times with 50 concurrent users'
```

## Performance Considerations

### Frontend
- ✅ Efficient state updates
- ✅ Progress tracking without blocking UI
- ✅ Memory-efficient result storage
- ✅ High-precision timing with performance.now()

### Backend Requirements
- ⚠️ Must handle 50 concurrent connections
- ⚠️ Database connection pooling recommended
- ⚠️ Query optimization critical
- ⚠️ Consider caching for frequently accessed data

## Error Handling

```
Request Level:
  ├── Network errors caught
  ├── HTTP errors detected (response.ok)
  ├── JSON parsing errors caught
  └── Individual request failures don't stop test

Test Level:
  ├── All errors logged to result.error
  ├── Test continues with remaining requests
  └── Summary calculated from successful requests only

Display Level:
  ├── Failed requests shown in red
  ├── Error messages displayed in table
  └── Overall success/failure count shown
```

## Testing Methodology

### Why 50 Concurrent Users?
- Represents realistic peak load
- Tests database connection limits
- Validates server resource allocation
- Industry standard for small-to-medium apps

### Why Two APIs?
- Tests complete user workflow
- Identifies bottlenecks (assign vs navigate)
- Validates inter-service communication
- Realistic usage pattern

### Why These Specs?
- **< 1s average**: Good user experience
- **< 3s maximum**: Acceptable worst case
- **50 users**: Minimum production requirement

## Success Metrics

### Green (Passing)
```
✅ Average < 1000ms
✅ Max < 3000ms
✅ Success rate > 90%
```

### Yellow (Warning)
```
⚠️ Average 1000-1500ms
⚠️ Max 3000-4000ms
⚠️ Success rate 80-90%
```

### Red (Failing)
```
❌ Average > 1500ms
❌ Max > 4000ms
❌ Success rate < 80%
```
