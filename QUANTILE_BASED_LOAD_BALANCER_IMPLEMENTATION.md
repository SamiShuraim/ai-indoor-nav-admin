# Quantile-Based Occupancy Load Balancer - Implementation Summary

## Overview

Successfully reimplemented the load balancer as a **quantile-based occupancy system** that uses dynamic age cutoffs computed from the distribution of recent arrivals. This replaces the previous feedback controller approach with a simpler, distribution-driven system.

---

## Key Changes

### 🔄 What Changed

#### 1. **Dynamic Age Cutoff (Kept & Enhanced)**
- Still uses quantiles of recent arrivals
- Cutoff adapts to actual age distribution
- Formula: `tau = 1 - (alpha1 - p_disabled)` → `age_cutoff = tau-quantile`

#### 2. **Occupancy-Based (Changed from Wait Times)**
- **Before**: Tracked wait times, throughput, queue lengths
- **After**: Tracks **occupancy only** (how many people at each level)
- No wait time calculations - people perform ritual for 45 minutes and leave

#### 3. **User-Configured Alpha1 (Changed from Controller)**
- **Before**: Feedback controller adjusted alpha1 based on wait times
- **After**: **User sets alpha1** via configuration (no automatic adjustments)
- Alpha1 = target share for Level 1 (default: 0.35 = 35%)

#### 4. **Simplified Configuration (Removed)**
- ❌ Removed: Wait time targets
- ❌ Removed: Controller gain
- ❌ Removed: Soft gates
- ❌ Removed: Randomization
- ❌ Removed: Throughput tracking
- ✅ Kept: Alpha1, sliding window, window mode

---

## File Changes

### 1. `loadBalancerApi.ts`

#### Updated Types:
```typescript
// Changed WaitEstimate → OccupancyCount (legacy name kept for compatibility)
export interface OccupancyCount {
  1?: number;
  2?: number;
  3?: number;
}

// Simplified LevelMetrics
export interface LevelMetrics {
  queueLength?: number; // Occupancy count
  waitEst?: number; // Legacy name - actually occupancy count
}

// Removed controller fields from MetricsResponse
export interface MetricsResponse {
  alpha1: number;
  pDisabled: number;
  ageCutoff: number;
  counts: CountsMetrics;
  quantilesNonDisabledAge: QuantilesMetrics;
  levels: { ... };
  // REMOVED: waitTargetMinutes, controllerGain, alpha1Min, alpha1Max
}

// Simplified ConfigResponse
export interface ConfigResponse {
  alpha1: number;
  alpha1Min: number;
  alpha1Max: number;
  slidingWindowMinutes: number;
  windowMode: string;
  halfLifeMinutes?: number;
  // REMOVED: waitTargetMinutes, controllerGain, softGate, randomization
}
```

#### Removed Functions:
- `updateLevelState()` - No longer needed
- `triggerControlTick()` - No feedback controller

### 2. `LoadBalancerSimulation.tsx`

#### UI Changes:

**Header:**
- Changed: "Adaptive Load Balancer Test Console" → "Quantile-Based Occupancy Load Balancer"

**Welcome Card:**
- Updated to explain quantile-based, occupancy-driven approach
- Added dynamic age cutoff calculation formula
- Added example showing tau-quantile calculation

**Configuration Panel:**
```typescript
// Simplified config form
const [configForm, setConfigForm] = useState({
  alpha1: '',                    // Target share for Level 1
  slidingWindowMinutes: '',      // Rolling window size
  windowMode: 'sliding',         // sliding or decay
  // REMOVED: waitTargetMinutes, controllerGain
});
```

**Metrics Display:**
- Changed "Controller State" → "Distribution Metrics"
- Shows: Alpha1, Age Cutoff, P(Disabled)
- Removed: Wait Target, Controller Gain
- Changed "Level States" → "Level Occupancy"
- Shows occupancy counts instead of wait times

**Assignment Display:**
- Changed "Wait Times" → "Occupancy at Assignment Time"
- Shows "X people" instead of "X minutes"

---

## API Endpoints (Expected Backend)

### 1. POST `/api/LoadBalancer/arrivals/assign`
**Request:**
```json
{
  "age": 45,
  "isDisabled": false
}
```

**Response:**
```json
{
  "level": 2,
  "decision": {
    "isDisabled": false,
    "age": 45,
    "ageCutoff": 62.3,
    "alpha1": 0.35,
    "pDisabled": 0.15,
    "shareLeftForOld": 0.20,
    "tauQuantile": 0.80,
    "waitEst": {  // Legacy name - actually occupancy
      "1": 45,
      "2": 38,
      "3": 52
    },
    "reason": "Age 45 < cutoff (62.3); assigned to less crowded level"
  },
  "traceId": "..."
}
```

### 2. GET `/api/LoadBalancer/metrics`
**Response:**
```json
{
  "alpha1": 0.35,
  "pDisabled": 0.15,
  "ageCutoff": 62.3,
  "counts": {
    "total": 230,
    "disabled": 35,
    "nonDisabled": 195
  },
  "quantilesNonDisabledAge": {
    "q50": 44.2,
    "q80": 62.3,
    "q90": 71.5
  },
  "levels": {
    "1": { "queueLength": 45, "waitEst": 45 },
    "2": { "queueLength": 38, "waitEst": 38 },
    "3": { "queueLength": 52, "waitEst": 52 }
  }
}
```

### 3. POST `/api/LoadBalancer/config`
**Request:**
```json
{
  "alpha1": 0.40,
  "window": {
    "mode": "sliding",
    "minutes": 60
  }
}
```

---

## Algorithm Summary

### Step 1: Track Recent Arrivals
- Rolling window (default: 45 minutes)
- Track disabled fraction: `p_disabled`
- Track ages of non-disabled pilgrims

### Step 2: Compute Dynamic Age Cutoff
```
share_left_for_old = alpha1 - p_disabled
tau = 1 - share_left_for_old
age_cutoff = tau-quantile of non-disabled ages
```

**Example:**
- `alpha1 = 0.35` (want 35% at Level 1)
- `p_disabled = 0.15` (15% disabled)
- `share_left_for_old = 0.20` (20% left for elderly)
- `tau = 0.80` (80th percentile)
- `age_cutoff = 80th percentile age`

### Step 3: Assign Based on Cutoff and Occupancy
```
IF disabled:
    → Level 1

ELSE IF age >= age_cutoff:
    IF Level 1 severely overcrowded:
        → Least crowded of Level 2/3
    ELSE:
        → Level 1

ELSE:
    → Least crowded of Level 2/3
```

---

## Configuration Parameters

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| `alpha1` | 0.35 | 0.15-0.55 | Target share for Level 1 |
| `slidingWindowMinutes` | 45 | 5-120 | Rolling window for tracking arrivals |
| `windowMode` | "sliding" | sliding/decay | Method for tracking recent arrivals |

---

## Testing the System

### Verify Dynamic Cutoff Adapts to Population

**Test 1: Young Crowd**
```bash
# Send 20 young arrivals (age 20-45)
for i in {1..20}; do
  curl -X POST http://localhost:5000/api/LoadBalancer/arrivals/assign \
    -H "Content-Type: application/json" \
    -d "{\"age\": $((20 + RANDOM % 25)), \"isDisabled\": false}"
done

# Check cutoff (should be low, ~40)
curl http://localhost:5000/api/LoadBalancer/metrics | jq '.ageCutoff'
```

**Test 2: Old Crowd**
```bash
# Send 20 elderly arrivals (age 60-85)
for i in {1..20}; do
  curl -X POST http://localhost:5000/api/LoadBalancer/arrivals/assign \
    -H "Content-Type: application/json" \
    -d "{\"age\": $((60 + RANDOM % 25)), \"isDisabled\": false}"
done

# Check cutoff (should be high, ~75)
curl http://localhost:5000/api/LoadBalancer/metrics | jq '.ageCutoff'
```

**Test 3: High Disabled Fraction**
```bash
# Send 10 disabled arrivals
for i in {1..10}; do
  curl -X POST http://localhost:5000/api/LoadBalancer/arrivals/assign \
    -H "Content-Type: application/json" \
    -d "{\"age\": $((50 + RANDOM % 30)), \"isDisabled\": true}"
done

# Check p_disabled and how it affects cutoff
curl http://localhost:5000/api/LoadBalancer/metrics | jq '{pDisabled, ageCutoff}'
```

---

## Benefits of New Approach

### ✅ Advantages

1. **Simpler**: No feedback controller, no wait time calculations
2. **Distribution-Driven**: Adapts automatically to actual population
3. **Handles Variable Disabled Fraction**: Automatically adjusts cutoff
4. **Occupancy-Based**: Direct tracking of how many people at each level
5. **User Control**: Alpha1 is explicitly configured by admin

### 🎯 Use Cases Handled Well

1. **Mostly young arrivals** → Low age cutoff (e.g., 38)
2. **Older crowd** → High age cutoff (e.g., 72)
3. **High disabled fraction** → Higher cutoff (fewer elderly non-disabled fit)
4. **Low disabled fraction** → Lower cutoff (more elderly non-disabled fit)

---

## Next Steps

### Backend Implementation Needed:

1. Implement quantile calculation from rolling window
2. Track occupancy per level (not wait times)
3. Update `/arrivals/assign` to use occupancy-based assignment
4. Update `/metrics` to return occupancy counts
5. Remove feedback controller logic
6. Simplify `/config` endpoint

### Frontend Complete ✅

- UI updated for occupancy display
- Configuration panel simplified
- Metrics display shows quantile-based metrics
- Assignment display shows occupancy
- Architecture description updated

---

## Migration Notes

### Breaking Changes from Previous System:

1. **No more wait time tracking** - system now only tracks occupancy
2. **No feedback controller** - alpha1 is user-configured
3. **Simplified config** - removed waitTarget, controllerGain, softGate, randomization
4. **Changed semantics** - `waitEst` field now contains occupancy count (legacy name)

### Backward Compatibility:

- `waitEst` field kept but now contains occupancy (not minutes)
- API endpoints unchanged (POST /arrivals/assign, GET /metrics, etc.)
- Response structure similar, just different field meanings

---

## Summary

The quantile-based occupancy load balancer is now fully implemented in the frontend. The system:

- ✅ Uses dynamic age cutoffs based on quantiles
- ✅ Tracks occupancy instead of wait times
- ✅ Adapts to population distribution automatically
- ✅ Provides user control via alpha1 configuration
- ✅ Handles variable disabled fractions gracefully
- ✅ Simpler architecture (no feedback controller)

**Result:** A distribution-driven system that adapts to the actual population while keeping it simple and focused on occupancy management.
