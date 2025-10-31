# Runtime Error Fix - Null Safety for Backend Compatibility

## Issue

Runtime error when displaying assignment results:
```
ERROR: can't access property 1, lastAssignment.decision.waitEst is undefined
```

## Root Cause

The frontend was trying to access `lastAssignment.decision.waitEst[1]` without checking if `waitEst` exists. This happens when the backend hasn't been updated yet to return the new quantile-based response format.

## Solution

Added comprehensive null safety checks throughout the UI to handle missing or undefined fields gracefully.

---

## Changes Made

### 1. **Updated Type Definitions** (`loadBalancerApi.ts`)

Made optional fields that the backend might not return yet:

```typescript
export interface AssignmentDecision {
  isDisabled: boolean;
  age: number;
  ageCutoff: number;
  alpha1: number;
  pDisabled?: number;           // Optional
  shareLeftForOld?: number;     // Optional
  tauQuantile?: number;         // Optional
  waitEst?: OccupancyCount;     // Optional
  reason: string;
}

export interface MetricsResponse {
  alpha1?: number;              // Optional
  pDisabled?: number;           // Optional
  ageCutoff?: number;           // Optional
  counts?: CountsMetrics;       // Optional
  quantilesNonDisabledAge?: QuantilesMetrics;  // Optional
  levels?: { ... };             // Optional
}
```

### 2. **Added Null Checks in UI** (`LoadBalancerSimulation.tsx`)

#### Assignment Display:
```typescript
// Check if waitEst exists before accessing properties
{lastAssignment.decision.waitEst && (
  <div className="wait-times">
    <h4>Occupancy at Assignment Time:</h4>
    {lastAssignment.decision.waitEst[1] != null && (
      <div className="wait-item">
        <span>L1: {lastAssignment.decision.waitEst[1]} people</span>
      </div>
    )}
    // ... more levels
  </div>
)}
```

#### Assignment Details:
```typescript
// Safe access with fallbacks
<div className="info-row">
  <span className="info-label">Age Cutoff:</span>
  <span className="info-value">
    {lastAssignment.decision.ageCutoff != null 
      ? `${lastAssignment.decision.ageCutoff.toFixed(1)} years` 
      : 'N/A'}
  </span>
</div>

// Conditional rendering for optional fields
{lastAssignment.decision.pDisabled != null && (
  <div className="info-row">
    <span className="info-label">P(Disabled):</span>
    <span className="info-value">{(lastAssignment.decision.pDisabled * 100).toFixed(1)}%</span>
  </div>
)}
```

#### Metrics Display:
```typescript
// Distribution Metrics
<div className="metric-value">
  {metrics.alpha1 != null ? `${(metrics.alpha1 * 100).toFixed(1)}%` : 'N/A'}
</div>

// Arrival Counts - Conditional rendering
{metrics.counts && (
  <div className="metrics-card">
    <h3>👥 Arrival Counts (Rolling Window)</h3>
    <div className="metrics-grid">
      <div className="metric-item">
        <div className="metric-value">{metrics.counts.total || 0}</div>
      </div>
    </div>
  </div>
)}

// Quantiles - Check multiple conditions
{metrics.quantilesNonDisabledAge && metrics.counts && metrics.counts.nonDisabled > 0 ? (
  // Show quantiles
) : (
  <div className="no-data">No non-disabled arrivals yet</div>
)}

// Level Occupancy - Conditional rendering
{metrics.levels && (
  <div className="metrics-card">
    <h3>🏛️ Level Occupancy</h3>
    {/* ... level cards */}
  </div>
)}
```

---

## Benefits

### 1. **Backward Compatibility**
- Frontend works with old backend (missing fields shown as "N/A")
- Frontend works with new backend (shows all fields)

### 2. **Graceful Degradation**
- No runtime errors if fields are missing
- UI adapts to available data
- Clear "N/A" or "No data" messages when data unavailable

### 3. **Progressive Enhancement**
- As backend gets updated, new fields automatically appear
- No frontend changes needed when backend adds fields

---

## Testing

### Test with Missing Fields:
```javascript
// Backend returns minimal response
{
  "level": 2,
  "decision": {
    "age": 45,
    "ageCutoff": 62.3,
    "alpha1": 0.35,
    "reason": "Age below cutoff"
    // Missing: pDisabled, shareLeftForOld, tauQuantile, waitEst
  }
}
```
**Result:** ✅ UI shows available data, displays "N/A" for missing fields

### Test with Complete Fields:
```javascript
// Backend returns full response
{
  "level": 2,
  "decision": {
    "age": 45,
    "ageCutoff": 62.3,
    "alpha1": 0.35,
    "pDisabled": 0.15,
    "shareLeftForOld": 0.20,
    "tauQuantile": 0.80,
    "waitEst": { "1": 45, "2": 38, "3": 52 },
    "reason": "Age below cutoff"
  }
}
```
**Result:** ✅ UI shows all fields correctly

---

## Error Resolution

### Before Fix:
```
❌ Runtime Error: can't access property 1, lastAssignment.decision.waitEst is undefined
❌ Page crashes
❌ User sees error screen
```

### After Fix:
```
✅ No runtime errors
✅ UI renders successfully
✅ Missing fields show as "N/A"
✅ User sees functional interface
```

---

## Code Quality

- ✅ **No linter errors**
- ✅ **TypeScript type-safe**
- ✅ **Consistent null checking pattern**
- ✅ **User-friendly fallback messages**

---

## Summary

Fixed runtime errors by adding comprehensive null safety checks throughout the UI. The frontend now gracefully handles both old and new backend response formats, preventing crashes and providing clear feedback when data is unavailable.

**Key Pattern:**
```typescript
// Always check before accessing nested properties
{object?.property && (
  <div>
    {object.property.nestedValue != null 
      ? displayValue(object.property.nestedValue)
      : 'N/A'}
  </div>
)}
```

This ensures the quantile-based load balancer UI works reliably regardless of backend implementation status.
