# Capacity-Based Load Balancer - Frontend Implementation

## Overview

Successfully updated the frontend to support the **capacity-based load balancer** with:
- Hard capacity limits for each level
- Utilization-based feedback controller
- Sigmoid soft gate for smooth probabilistic transitions
- Rate limiting
- 45-minute dwell time with automatic expiry

---

## Key Changes from Previous System

### What Changed

| Feature | Previous (Quantile-Only) | Current (Capacity-Based) |
|---------|-------------------------|--------------------------|
| **Capacity Management** | No capacity limits | Hard limits: L1=500/550, L2/L3=3000 |
| **Feedback Controller** | None (user-configured alpha1) | Auto-adjusts alpha1 to target 90% L1 utilization |
| **Assignment Logic** | Hard cutoff | Sigmoid soft gate (smooth probability) |
| **Rate Limiting** | None | 11 per minute for Level 1 |
| **Dwell Time** | Not tracked | 45 minutes with auto-expiry |
| **Alpha1 Range** | 0.15 - 0.55 (35% default) | 0.05 - 0.12 (7.69% default) |
| **Target Metric** | None | 90% utilization of L1 soft capacity |

---

## System Architecture

### Capacity Model

```
Level 1:
  - Soft Cap: 500 people (target utilization)
  - Hard Cap: 550 people (disabled overflow only)
  - Rate Limit: 11 per minute (floor(500/45))

Level 2: 3,000 people
Level 3: 3,000 people

Dwell Time: 45 minutes (automatic expiry)
```

### Feedback Controller

Runs every minute:
```
Current Utilization = active_L1 / L1_soft_cap
Error = target_util (0.90) - current_util
Alpha1_new = alpha1_old + gain * error
Alpha1_clamped = clamp(alpha1_new, max(alpha1_min, p_disabled), alpha1_max)
```

**Behavior:**
- L1 under-utilized (< 90%) → increase alpha1 → lower age cutoff → more to L1
- L1 over-utilized (> 90%) → decrease alpha1 → raise age cutoff → fewer to L1

### Soft Gate (Sigmoid Function)

```
z = (age - age_cutoff) / band_width
p(Level1) = 1 / (1 + exp(-z))

Where:
- band_width = 3 years (default)
- age_cutoff = tau-quantile of recent non-disabled ages
- tau = 1 - (alpha1 - p_disabled)
```

**Zones:**
- `age >= cutoff + 6`: Deterministic → Level 1 (probability ≈ 100%)
- `age in [cutoff - 6, cutoff + 6]`: Probabilistic → Sigmoid curve
- `age <= cutoff - 6`: Deterministic → Level 2/3 (probability ≈ 0%)

---

## API Type Changes

### New Types

```typescript
export interface CapacityInfo {
  l1CapSoft: number;
  l1CapHard: number;
  l2Cap: number;
  l3Cap: number;
}
```

### Updated AssignmentDecision

```typescript
export interface AssignmentDecision {
  isDisabled: boolean;
  age: number;
  ageCutoff: number;
  alpha1: number;
  pDisabled?: number;
  shareLeftForOld?: number;
  tauQuantile?: number;
  occupancy?: OccupancyCount;  // NEW: Current occupancy
  waitEst?: OccupancyCount;    // Legacy name
  reason: string;               // Now includes soft gate probability
}
```

### Updated LevelMetrics

```typescript
export interface LevelMetrics {
  occupancy?: number;       // NEW: Current occupancy count
  capacity?: number;        // NEW: Capacity limit
  utilization?: number;     // NEW: Utilization (0-1)
  queueLength?: number;     // Legacy
  waitEst?: number;         // Legacy
}
```

### Updated MetricsResponse

```typescript
export interface MetricsResponse {
  alpha1?: number;
  targetUtilL1?: number;    // NEW: Target utilization (0.90)
  pDisabled?: number;
  ageCutoff?: number;
  counts?: CountsMetrics;
  quantilesNonDisabledAge?: QuantilesMetrics;
  capacity?: CapacityInfo;  // NEW: Capacity limits
  levels?: {
    1?: LevelMetrics;
    2?: LevelMetrics;
    3?: LevelMetrics;
  };
}
```

### Updated ConfigResponse

```typescript
export interface ConfigResponse {
  alpha1: number;
  alpha1Min: number;
  alpha1Max: number;
  targetUtilL1: number;         // NEW: Target utilization
  controllerGain: number;       // NEW: Feedback gain
  softGateBandYears: number;    // NEW: Sigmoid width
  dwellMinutes: number;         // NEW: Dwell time
  slidingWindowMinutes: number;
  windowMode: string;
  halfLifeMinutes?: number;
  capacity: CapacityInfo;       // NEW: Capacity info
}
```

---

## UI Changes

### 1. Header & Welcome Card

**Title:** "Capacity-Based Load Balancer with Soft Gate"

**Features Explained:**
- 🎯 Capacity-Based: Hard limits protect each level
- 🎛️ Utilization Controller: Auto-adjusts to target 90% L1 utilization
- 📈 Sigmoid Soft Gate: Smooth probability curve
- ⚡ Rate Limited: Max 11 per minute to L1

**System Flow:**
```
1. Controller adjusts alpha1 based on L1 utilization
2. Age cutoff = tau-quantile
3. Sigmoid: p(L1) = 1 / (1 + exp(-(age - cutoff) / 3))
4. Assign based on probability, capacity, rate limit
```

### 2. Configuration Panel

**Editable Fields:**
- Alpha1 (Initial Target): 0.05 - 0.12 (controller will adjust)
- Target L1 Utilization: 0.70 - 0.98 (default: 0.90)
- Controller Gain: 0.01 - 0.20 (default: 0.05)
- Soft Gate Band: 1 - 10 years (default: 3.0)
- Sliding Window: minutes for tracking arrivals
- Window Mode: sliding or decay

**Display Fields:**
- Alpha1 (Current): Shows controller-adjusted value (2 decimal places)
- Alpha1 Range: Min - Max
- Target L1 Utilization: Percentage
- Controller Gain: Sensitivity
- Soft Gate Band: Sigmoid width
- Dwell Time: 45 minutes
- Window Mode: sliding/decay with minutes
- L1 Capacity: Soft / Hard
- L2/L3 Capacity: Each level

### 3. Metrics Display

#### Controller State
- **Alpha1 (Current):** Auto-adjusted by controller
- **Target L1 Utilization:** Controller target (typically 90%)
- **Age Cutoff:** Dynamic cutoff from quantiles
- **P(Disabled):** Fraction of disabled arrivals

#### Capacity Limits
- **Level 1 (Soft / Hard):** 500 / 550
- **Level 2:** 3,000
- **Level 3:** 3,000

#### Level Occupancy & Utilization
For each level:
- **Occupancy:** Current people count with color coding
- **Capacity:** Capacity limit
- **Utilization:** Percentage with color coding
  - < 70%: Green (good)
  - 70-95%: Yellow (warning)
  - > 95%: Red (danger)
- **Purpose:** 
  - L1: "Disabled + Elderly (soft gate)"
  - L2/L3: "General (balanced)"

### 4. Assignment Display

Shows occupancy at assignment time from either:
- `decision.occupancy` (new field)
- `decision.waitEst` (legacy field)

**Reason Field Examples:**
- "soft-gate pass (p=0.845, r=0.234)"
- "Age 65, cutoff 62.3, capacity OK"
- "Rate limited, assigned to Level 2"

---

## Configuration Examples

### Conservative (High Utilization)

```json
{
  "alpha1": 0.06,
  "targetUtilL1": 0.95,
  "controllerGain": 0.03,
  "softGateBandYears": 2.0
}
```
- Tight control
- High L1 utilization target
- Slower controller response
- Narrower soft gate (steeper probability curve)

### Balanced (Recommended)

```json
{
  "alpha1": 0.0769,
  "targetUtilL1": 0.90,
  "controllerGain": 0.05,
  "softGateBandYears": 3.0
}
```
- Default settings
- 90% target utilization
- Moderate controller response
- Standard soft gate width

### Aggressive (More L1 Assignments)

```json
{
  "alpha1": 0.10,
  "targetUtilL1": 0.85,
  "controllerGain": 0.08,
  "softGateBandYears": 4.0
}
```
- Higher alpha1 start
- Lower utilization target (more headroom)
- Faster controller response
- Wider soft gate (smoother transitions)

---

## Testing Scenarios

### 1. Under-Utilization

**Initial State:**
```
L1: 300/500 (60% utilization)
Alpha1: 0.075
Cutoff: 68 years
```

**Expected Behavior:**
- Controller increases alpha1 → 0.078
- Age cutoff drops → 65 years
- More elderly assigned to L1
- Utilization rises toward 90%

### 2. Over-Utilization

**Initial State:**
```
L1: 480/500 (96% utilization)
Alpha1: 0.085
Cutoff: 60 years
```

**Expected Behavior:**
- Controller decreases alpha1 → 0.082
- Age cutoff rises → 63 years
- Fewer elderly assigned to L1
- Utilization drops toward 90%

### 3. Soft Gate Behavior

**Scenario:**
```
Age cutoff: 70 years
Soft gate band: 3 years
```

**Probabilities:**
- Age 76: p ≈ 98% (deterministic → L1)
- Age 73: p ≈ 88% (high probability)
- Age 70: p = 50% (exactly at cutoff)
- Age 67: p ≈ 12% (low probability)
- Age 64: p ≈ 2% (deterministic → L2/3)

### 4. Rate Limiting

**Test:**
- Send 20 elderly arrivals in quick succession
- Expected: Only 11 go to L1 in first minute
- Remaining 9 overflow to L2/3
- Next minute: Rate limit resets

### 5. Capacity Hard Limit

**Test:**
- L1 at 549 occupancy (near hard cap)
- Disabled arrival comes
- Expected: Goes to L1 (under hard cap)
- Non-disabled elderly: Overflow to L2/3

---

## Benefits of Capacity-Based System

### 1. **Protection from Overflow**
- Hard capacity limits prevent overloading
- Rate limiting prevents burst crowding
- Guaranteed disabled access (up to hard cap)

### 2. **Optimal Utilization**
- Feedback controller maintains target utilization
- Adapts automatically to demand changes
- Balances between under/over-utilization

### 3. **Smooth Transitions**
- Sigmoid soft gate eliminates hard cutoff jumps
- Probabilistic assignment reduces age boundary issues
- Natural feeling for users

### 4. **Adaptive to Population**
- Age cutoff still adapts via quantiles
- Handles young crowds, old crowds, mixed
- Responds to varying disabled fractions

### 5. **Predictable Behavior**
- Target utilization is clear (90%)
- Capacity limits are explicit
- Controller behavior is transparent

---

## Monitoring & Tuning

### Key Metrics to Watch

**1. L1 Utilization:**
- Target: 90% of soft capacity (450/500)
- If consistently high (>95%): Decrease target or increase capacity
- If consistently low (<80%): Increase target or adjust alpha1 range

**2. Alpha1 Drift:**
- Should stabilize around a value
- If drifting up: System needs higher cutoff (population is old)
- If drifting down: System needs lower cutoff (population is young)
- If oscillating: Reduce controller gain

**3. Soft Gate Effectiveness:**
- Check reason field in assignments
- High probability passes: Good (deterministic zone)
- Many 40-60% passes: In transition zone (expected)
- If too many near 50%: Consider adjusting band width

**4. Rate Limit Hits:**
- Occasional hits: Normal (burst protection working)
- Frequent hits: May need higher alpha1_max or capacity

### Tuning Guidelines

**Problem: L1 consistently under-utilized**

Solutions:
1. Increase `targetUtilL1` (e.g., 0.90 → 0.92)
2. Increase `controllerGain` for faster response
3. Increase `alpha1Max` to allow higher targets

**Problem: L1 consistently over-utilized**

Solutions:
1. Decrease `targetUtilL1` (e.g., 0.90 → 0.88)
2. Increase `controllerGain` for faster correction
3. Decrease `alpha1Min` if needed

**Problem: Alpha1 oscillates**

Solutions:
1. Decrease `controllerGain` (e.g., 0.05 → 0.03)
2. Increase `slidingWindowMinutes` for smoother data
3. Adjust `targetUtilL1` if target is unrealistic

**Problem: Too many hard cutoff rejections**

Solutions:
1. Increase `softGateBandYears` (e.g., 3.0 → 4.0)
2. Verify age distribution in recent arrivals
3. Check if alpha1 range is appropriate

---

## Migration from Previous System

### Breaking Changes

1. **Alpha1 semantics changed:**
   - Old: Target share for L1 (35% typical)
   - New: Much lower values (7-8% typical)
   - Controller auto-adjusts based on utilization

2. **New configuration fields required:**
   - `targetUtilL1`
   - `controllerGain`
   - `softGateBandYears`
   - `dwellMinutes`
   - `capacity` object

3. **Assignment reasons changed:**
   - Now includes soft gate probabilities
   - Format: "soft-gate pass (p=0.845, r=0.234)"

### Data Migration

**Old Config:**
```json
{
  "alpha1": 0.35,
  "alpha1Min": 0.15,
  "alpha1Max": 0.55,
  "slidingWindowMinutes": 45
}
```

**New Config:**
```json
{
  "alpha1": 0.0769,
  "alpha1Min": 0.05,
  "alpha1Max": 0.12,
  "targetUtilL1": 0.90,
  "controllerGain": 0.05,
  "softGateBandYears": 3.0,
  "dwellMinutes": 45,
  "slidingWindowMinutes": 45,
  "capacity": {
    "l1CapSoft": 500,
    "l1CapHard": 550,
    "l2Cap": 3000,
    "l3Cap": 3000
  }
}
```

---

## Quality Assurance

### ✅ Completed

- [x] API types updated for capacity system
- [x] UI updated for utilization controller
- [x] Configuration panel includes all new fields
- [x] Metrics display shows capacity and utilization
- [x] Level cards show utilization percentages
- [x] Assignment display handles new occupancy field
- [x] Backward compatibility with legacy fields
- [x] Null safety for all optional fields
- [x] No linter errors
- [x] TypeScript type-safe

### Testing Checklist

- [ ] Verify alpha1 auto-adjusts based on utilization
- [ ] Test soft gate probability curve (ages near cutoff)
- [ ] Verify rate limiting (11 per minute to L1)
- [ ] Test capacity hard limits (overflow behavior)
- [ ] Verify 45-minute dwell time and expiry
- [ ] Test controller convergence to target utilization
- [ ] Verify disabled always go to L1 (up to hard cap)
- [ ] Test sigmoid transition zones

---

## Summary

Successfully transformed the frontend to support the **capacity-based load balancer** system. Key improvements:

1. ✅ **Capacity Protection:** Hard limits and rate limiting
2. ✅ **Utilization Control:** Feedback controller targets 90%
3. ✅ **Smooth Transitions:** Sigmoid soft gate
4. ✅ **Dwell Time Management:** 45-minute automatic expiry
5. ✅ **Complete UI:** All metrics, config, and displays updated
6. ✅ **Backward Compatible:** Handles legacy field names
7. ✅ **Type-Safe:** Full TypeScript coverage

The system now provides **robust capacity management** with **adaptive control** while maintaining **smooth probabilistic assignment** behavior. 🎯📊✨
