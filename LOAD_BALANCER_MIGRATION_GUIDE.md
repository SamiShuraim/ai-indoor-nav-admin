# Load Balancer Migration Guide
## From Feedback Controller to Quantile-Based Occupancy

---

## 🔄 System Comparison

| Feature | OLD (Feedback Controller) | NEW (Quantile-Based) |
|---------|---------------------------|----------------------|
| **Core Metric** | Wait time (minutes) | Occupancy (people count) |
| **Alpha1 Control** | Automatic (controller adjusts) | User-configured (manual) |
| **Age Cutoff** | Dynamic via quantiles ✓ | Dynamic via quantiles ✓ |
| **Wait Time Tracking** | Yes (calculated) | No (not needed) |
| **Throughput Tracking** | Yes | No |
| **Feedback Controller** | Yes (PID-like) | No (removed) |
| **Soft Gates** | Yes (configurable) | No (removed) |
| **Randomization** | Yes (configurable) | No (removed) |
| **Configuration Complexity** | High (7+ parameters) | Low (3 parameters) |
| **Backend Complexity** | High | Low |

---

## 📊 Configuration Changes

### OLD Configuration
```json
{
  "alpha1": 0.35,              // Auto-adjusted by controller
  "alpha1Min": 0.15,           // Controller bounds
  "alpha1Max": 0.55,           // Controller bounds
  "waitTargetMinutes": 12,     // Target wait time
  "controllerGain": 0.03,      // Controller sensitivity
  "window": {
    "mode": "sliding",
    "minutes": 45
  },
  "softGate": {                // Fuzzy age boundary
    "enabled": true,
    "bandYears": 5
  },
  "randomization": {           // Exploration
    "enabled": true,
    "rate": 0.05
  }
}
```

### NEW Configuration
```json
{
  "alpha1": 0.35,              // User sets target (not auto-adjusted)
  "alpha1Min": 0.15,           // Min allowed
  "alpha1Max": 0.55,           // Max allowed
  "slidingWindowMinutes": 45,  // Rolling window size
  "windowMode": "sliding",     // sliding or decay
  "halfLifeMinutes": 45        // For decay mode (optional)
}
```

### What's Removed?
- ❌ `waitTargetMinutes` - No wait times tracked
- ❌ `controllerGain` - No feedback controller
- ❌ `softGate` - Removed complexity
- ❌ `randomization` - Removed exploration

---

## 🔧 API Changes

### Assignment Response

**OLD:**
```json
{
  "level": 2,
  "decision": {
    "age": 45,
    "ageCutoff": 62.3,
    "alpha1": 0.347,           // Controller-adjusted
    "waitEst": {
      "1": 14.5,               // MINUTES
      "2": 10.2,               // MINUTES
      "3": 12.8                // MINUTES
    },
    "reason": "Age below cutoff, Level 2 has lowest wait time"
  }
}
```

**NEW:**
```json
{
  "level": 2,
  "decision": {
    "age": 45,
    "ageCutoff": 62.3,
    "alpha1": 0.35,            // User-configured
    "pDisabled": 0.15,         // Added
    "shareLeftForOld": 0.20,   // Added
    "tauQuantile": 0.80,       // Added
    "waitEst": {               // Legacy name
      "1": 45,                 // PEOPLE COUNT
      "2": 38,                 // PEOPLE COUNT
      "3": 52                  // PEOPLE COUNT
    },
    "reason": "Age 45 < cutoff (62.3); assigned to less crowded level"
  }
}
```

### Metrics Response

**OLD:**
```json
{
  "alpha1": 0.347,                    // Controller-adjusted
  "alpha1Min": 0.15,
  "alpha1Max": 0.55,
  "waitTargetMinutes": 12,            // Target
  "controllerGain": 0.03,             // Controller param
  "pDisabled": 0.15,
  "ageCutoff": 62.3,
  "levels": {
    "1": {
      "waitEst": 14.5,                // MINUTES
      "queueLen": 87,
      "throughputPerMin": 6.2
    }
  }
}
```

**NEW:**
```json
{
  "alpha1": 0.35,                     // User-configured
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
    "1": {
      "queueLength": 45,              // PEOPLE COUNT
      "waitEst": 45                   // PEOPLE COUNT (legacy name)
    }
  }
}
```

---

## 🎯 Algorithm Changes

### OLD Algorithm

```python
# Every minute (background controller):
1. Calculate wait times from queue lengths and throughput
2. Compute error: max_wait - wait_target
3. Adjust alpha1: alpha1 -= gain * error
4. Clamp alpha1 to [alpha1Min, alpha1Max]
5. Compute age cutoff from quantiles

# On arrival:
6. Apply soft gate (fuzzy boundary)
7. Apply randomization (5% random assignments)
8. Check age vs cutoff
9. Assign based on wait times
```

### NEW Algorithm

```python
# On arrival only:
1. Compute p_disabled from rolling window
2. share_left_for_old = alpha1 - p_disabled
3. tau = 1 - share_left_for_old
4. age_cutoff = tau-quantile of non-disabled ages

5. IF disabled:
     → Level 1
   ELSE IF age >= age_cutoff:
     IF Level 1 overcrowded:
       → Least crowded of Level 2/3
     ELSE:
       → Level 1
   ELSE:
     → Least crowded of Level 2/3
```

**Key Difference:** New system is **stateless** except for rolling window. No controller state, no background processes.

---

## 📈 Behavior Changes

### Alpha1 Adjustment

**OLD:**
```
System automatically adjusts alpha1 every minute based on wait times.
Admin sets initial value, but controller changes it.
```

**NEW:**
```
Admin sets alpha1, it stays at that value.
No automatic adjustments.
Want to change it? Update config manually.
```

### Response to Crowding

**OLD:**
```
High wait times at Level 1 → Controller lowers alpha1 → Higher age cutoff
Feedback loop: wait times → alpha1 → assignments → wait times
```

**NEW:**
```
High occupancy at Level 1 → Direct assignment to less crowded level
No feedback loop, just instant decision based on current occupancy
```

### Handling Disabled Surges

**OLD:**
```
Many disabled arrive → Level 1 wait time increases
→ Controller lowers alpha1 over time (slow response)
→ Eventually fewer elderly non-disabled assigned
```

**NEW:**
```
Many disabled arrive → p_disabled increases
→ Age cutoff immediately rises (instant response)
→ Fewer elderly non-disabled assigned right away
```

---

## 🔍 Debugging Differences

### OLD System

```bash
# Check if controller is working
curl /api/LoadBalancer/metrics | jq '{
  alpha1,
  waitTarget,
  level1Wait: .levels."1".waitEst,
  controllerGain
}'

# Questions to ask:
# - Is alpha1 adjusting? (should change over time)
# - Are wait times near target? (12 minutes)
# - Is controller gain too high/low?
```

### NEW System

```bash
# Check quantile calculation
curl /api/LoadBalancer/metrics | jq '{
  alpha1,
  pDisabled,
  ageCutoff,
  quantiles: .quantilesNonDisabledAge
}'

# Questions to ask:
# - Is age cutoff reasonable for recent arrivals?
# - Does tau-quantile math check out?
# - Is p_disabled correct?
```

---

## 🚨 Breaking Changes

### 1. Semantics Changed

**`waitEst` field:**
- OLD: Wait time in minutes
- NEW: Occupancy count (people)

### 2. Removed Fields

**From Config:**
- `waitTargetMinutes`
- `controllerGain`
- `softGate`
- `randomization`

**From Metrics:**
- `waitTargetMinutes`
- `controllerGain`
- `throughputPerMin`
- `alpha1Min`, `alpha1Max` (moved to config response only)

### 3. Removed Endpoints

- `POST /api/LoadBalancer/levels/state` (no longer needed)
- `POST /api/LoadBalancer/control/tick` (no controller)

### 4. Behavior Changes

- Alpha1 no longer auto-adjusts
- No soft gate or randomization
- Decisions based on occupancy, not wait times

---

## 🔄 Migration Checklist

### Backend

- [ ] Remove wait time calculation logic
- [ ] Remove throughput tracking
- [ ] Remove feedback controller
- [ ] Change `waitEst` to store occupancy count
- [ ] Update `/metrics` response format
- [ ] Update `/config` response format
- [ ] Remove `/levels/state` endpoint
- [ ] Remove `/control/tick` endpoint
- [ ] Simplify assignment logic (no soft gate/randomization)

### Frontend ✅ (Completed)

- [x] Update LoadBalancerSimulation.tsx UI
- [x] Change "wait time" to "occupancy"
- [x] Remove controller-related fields
- [x] Update configuration form
- [x] Update metrics display
- [x] Update assignment display

### Testing

- [ ] Test quantile calculation
- [ ] Test dynamic age cutoff adaptation
- [ ] Test occupancy-based assignment
- [ ] Test config updates
- [ ] Test high disabled fraction scenario
- [ ] Test population changes (young → old)

### Documentation

- [x] Implementation summary
- [x] Quick start guide
- [x] Migration guide
- [ ] API documentation update
- [ ] Backend implementation guide

---

## 💡 Conceptual Shift

### OLD Mindset
"System automatically finds optimal alpha1 by minimizing wait times through feedback control."

### NEW Mindset
"User sets target share (alpha1), system adapts age cutoff to achieve it based on actual population distribution."

### Why the Change?

1. **Simplicity**: No complex controller tuning
2. **Predictability**: Alpha1 doesn't change unexpectedly
3. **Transparency**: Easy to understand and explain
4. **Direct Control**: Admins control the target directly
5. **Lower Complexity**: Fewer moving parts, easier to debug

---

## 📚 Key Takeaways

### OLD System (Feedback Controller)
- ✓ Automatic alpha1 adjustment
- ✗ Complex (controller, soft gates, randomization)
- ✗ Requires wait time calculations
- ✗ Slow to adapt to disabled surges
- ✗ Harder to debug

### NEW System (Quantile-Based Occupancy)
- ✓ Simple and transparent
- ✓ Instant adaptation to population changes
- ✓ Direct user control
- ✓ No wait time calculations needed
- ✓ Easy to understand and debug
- ✗ Manual alpha1 tuning required

---

## 🎓 For More Information

- **Implementation Details**: See `QUANTILE_BASED_LOAD_BALANCER_IMPLEMENTATION.md`
- **Quick Start**: See `QUANTILE_LOAD_BALANCER_QUICK_START.md`
- **Original Spec**: See top of this workspace (user's message)

---

**Bottom Line:** The new system is simpler, more transparent, and adapts automatically to population distribution. Trade-off: You manually set alpha1 instead of automatic tuning. Most use cases will find the new system easier to operate and understand.
