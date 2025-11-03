# Capacity-Based Load Balancer - Quick Reference

## 🎯 System Overview

**Type:** Capacity-based with utilization feedback controller and sigmoid soft gate

**Goal:** Maintain Level 1 at 90% of soft capacity (450/500 people) using automatic alpha1 adjustment

---

## 📊 Capacities

| Level | Soft Cap | Hard Cap | Rate Limit |
|-------|----------|----------|------------|
| **Level 1** | 500 | 550 (disabled only) | 11/min |
| **Level 2** | 3,000 | 3,000 | None |
| **Level 3** | 3,000 | 3,000 | None |

**Dwell Time:** 45 minutes (automatic expiry)

---

## 🎛️ How It Works

### 1. Feedback Controller (Every Minute)

```
Current Utilization = active_L1 / 500
Error = 0.90 - current_util
Alpha1 = alpha1 + (0.05 * error)
Alpha1 = clamp(alpha1, 0.05, 0.12)
```

**Behavior:**
- L1 < 90% utilized → Increase alpha1 → Lower cutoff → More to L1
- L1 > 90% utilized → Decrease alpha1 → Raise cutoff → Fewer to L1

### 2. Dynamic Age Cutoff

```
share_left_for_old = alpha1 - p_disabled
tau = 1 - share_left_for_old
age_cutoff = tau-quantile of recent non-disabled ages
```

**Example:**
- alpha1 = 0.08 (8%)
- p_disabled = 0.02 (2%)
- share_left = 0.06 (6%)
- tau = 0.94 (94th percentile)
- cutoff = 94th percentile age → e.g., 72 years

### 3. Sigmoid Soft Gate

```
z = (age - cutoff) / 3
p(L1) = 1 / (1 + exp(-z))
```

**Probability Zones:**
- Age ≥ cutoff + 6: ~100% → Deterministic Level 1
- Age in [cutoff - 6, cutoff + 6]: Smooth sigmoid curve
- Age ≤ cutoff - 6: ~0% → Deterministic Level 2/3

**Example (cutoff = 70):**
- Age 76: p = 98% → L1
- Age 73: p = 88% → L1
- Age 70: p = 50% → Coin flip
- Age 67: p = 12% → L2/3
- Age 64: p = 2% → L2/3

### 4. Assignment Rules

```
IF disabled:
    IF L1 < hard_cap (550) AND not rate_limited:
        → Level 1
    ELSE:
        → Overflow to Level 2/3

IF non-disabled:
    IF L1 >= soft_cap (500) OR rate_limited:
        → Level 2/3
    ELSE:
        Compute p = sigmoid(age, cutoff, band=3)
        Draw random number r
        IF r < p:
            → Level 1
        ELSE:
            → Level 2/3
```

---

## ⚙️ Configuration

### Default Values

```json
{
  "alpha1": 0.0769,
  "alpha1Min": 0.05,
  "alpha1Max": 0.12,
  "targetUtilL1": 0.90,
  "controllerGain": 0.05,
  "softGateBandYears": 3.0,
  "dwellMinutes": 45,
  "slidingWindowMinutes": 45
}
```

### Tuning Parameters

| Parameter | Range | Default | Purpose |
|-----------|-------|---------|---------|
| `alpha1` | 0.05-0.12 | 0.0769 | Initial target share for L1 |
| `targetUtilL1` | 0.70-0.98 | 0.90 | Target utilization (90%) |
| `controllerGain` | 0.01-0.20 | 0.05 | Controller sensitivity |
| `softGateBandYears` | 1-10 | 3.0 | Sigmoid transition width |

### Quick Tuning

**Problem: L1 under-utilized (<80%)**
- ↑ Increase `targetUtilL1` to 0.92
- ↑ Increase `controllerGain` to 0.07
- ↑ Increase `alpha1Max` to 0.15

**Problem: L1 over-utilized (>95%)**
- ↓ Decrease `targetUtilL1` to 0.88
- ↑ Increase `controllerGain` to 0.07
- ↓ Decrease `alpha1Min` if needed

**Problem: Alpha1 oscillates**
- ↓ Decrease `controllerGain` to 0.03
- ↑ Increase `slidingWindowMinutes` to 60

**Problem: Too many hard cutoffs**
- ↑ Increase `softGateBandYears` to 4.0 or 5.0

---

## 📈 Example Scenarios

### Scenario 1: Normal Operation

```
State:
- L1: 445/500 (89% util)
- Alpha1: 0.078
- Cutoff: 62 years

Arrival: Age 65, non-disabled
- z = (65 - 62) / 3 = 1.0
- p = 1 / (1 + exp(-1)) = 0.73
- Random: 0.34 < 0.73 ✓
- Assigned: Level 1

Controller next minute:
- Error = 0.90 - 0.89 = 0.01
- Alpha1 = 0.078 + (0.05 * 0.01) = 0.0785
- Cutoff stays similar
```

### Scenario 2: Under-Utilization

```
State:
- L1: 300/500 (60% util)
- Alpha1: 0.075
- Cutoff: 68 years

Controller response:
- Error = 0.90 - 0.60 = 0.30
- Alpha1 = 0.075 + (0.05 * 0.30) = 0.090
- Higher alpha1 → Lower cutoff
- Next minute: Cutoff drops to ~62 years
- More elderly now eligible
- Utilization rises
```

### Scenario 3: Over-Utilization

```
State:
- L1: 480/500 (96% util)
- Alpha1: 0.085
- Cutoff: 60 years

Controller response:
- Error = 0.90 - 0.96 = -0.06
- Alpha1 = 0.085 + (0.05 * -0.06) = 0.082
- Lower alpha1 → Higher cutoff
- Next minute: Cutoff rises to ~63 years
- Fewer elderly eligible
- Utilization drops
```

### Scenario 4: Disabled Surge

```
State:
- p_disabled = 0.10 (10% disabled)
- alpha1 = 0.08
- share_left_for_old = 0.08 - 0.10 = -0.02 → 0
- tau = 1.0
- cutoff = 100th percentile → maximum age

Effect:
- Only absolute oldest non-disabled get L1
- Most non-disabled → Level 2/3
- Level 1 reserved for disabled
```

### Scenario 5: Rate Limiting

```
Within 1 minute:
- 20 elderly arrivals (all eligible)
- Rate limit: 11/min

Result:
- First 11 → Level 1 (within rate)
- Remaining 9 → Overflow to Level 2/3
- Next minute: Rate resets
```

---

## 🔍 Monitoring

### Key Metrics

**L1 Utilization:**
- Green (<70%): Under-utilized
- Yellow (70-95%): Good range
- Red (>95%): Over-utilized

**Alpha1 Value:**
- Should stabilize (not oscillate)
- Typical: 0.07 - 0.09
- Drifting up: Population getting older
- Drifting down: Population getting younger

**Age Cutoff:**
- Young crowd: ~40-50 years
- Mixed crowd: ~60-70 years
- Old crowd: ~75-85 years

**Soft Gate Probabilities:**
- Most assignments should be deterministic (p > 95% or p < 5%)
- 40-60% assignments: In transition zone (expected near cutoff)

---

## 🧪 Testing Commands

### Test Controller Response

```bash
# Under-utilize L1 (send young crowd)
for i in {1..30}; do
  curl -X POST http://localhost:5000/api/LoadBalancer/arrivals/assign \
    -H "Content-Type: application/json" \
    -d "{\"age\": $((25 + RANDOM % 15)), \"isDisabled\": false}"
done

# Check alpha1 increased
curl http://localhost:5000/api/LoadBalancer/metrics | jq '.alpha1'
```

### Test Soft Gate

```bash
# Send ages near cutoff
for age in 60 62 64 66 68 70 72 74 76 78; do
  curl -X POST http://localhost:5000/api/LoadBalancer/arrivals/assign \
    -H "Content-Type: application/json" \
    -d "{\"age\": $age, \"isDisabled\": false}"
  sleep 1
done

# Check assignment distribution
```

### Test Rate Limiting

```bash
# Send 20 elderly in quick succession
for i in {1..20}; do
  curl -X POST http://localhost:5000/api/LoadBalancer/arrivals/assign \
    -H "Content-Type: application/json" \
    -d "{\"age\": 75, \"isDisabled\": false}" &
done
wait

# Check how many went to L1 (should be ~11)
curl http://localhost:5000/api/LoadBalancer/metrics | jq '.levels."1".occupancy'
```

---

## 📋 Troubleshooting

### Alpha1 Stuck at Min/Max

**Stuck at min (0.05):**
- L1 consistently over-utilized
- Population may be too old for capacity
- Solution: Increase L1 capacity or lower targetUtilL1

**Stuck at max (0.12):**
- L1 consistently under-utilized
- Population may be too young
- Solution: Increase alpha1Max or raise targetUtilL1

### Cutoff Not Adapting

**Causes:**
- Not enough non-disabled arrivals
- Sliding window too long
- All arrivals same age

**Solutions:**
- Check counts (need > 20 non-disabled for good quantiles)
- Reduce slidingWindowMinutes
- Verify age distribution

### Too Many Rate Limit Hits

**Causes:**
- Alpha1 too high for capacity
- Burst arrivals common

**Solutions:**
- Adjust alpha1Max downward
- Increase L1 soft capacity
- Accept some rate limiting (it's working!)

---

## ✨ Key Advantages

1. **Capacity Protection:** Hard limits prevent overflow
2. **Auto-Optimization:** Controller maintains target utilization
3. **Smooth Assignments:** Sigmoid eliminates hard cutoff jumps
4. **Burst Protection:** Rate limiting prevents instant crowding
5. **Adaptive:** Works with any age distribution
6. **Predictable:** Clear target and explicit limits

---

## 📞 Quick Formulas

**Utilization:**
```
util = occupancy / soft_capacity
util = occupancy / 500  (for Level 1)
```

**Sigmoid Probability:**
```
z = (age - cutoff) / band
p = 1 / (1 + exp(-z))
```

**Rate Limit:**
```
limit = floor(capacity / dwell_time)
limit = floor(500 / 45) = 11 per minute
```

**Target Occupancy:**
```
target = soft_capacity * target_util
target = 500 * 0.90 = 450 people
```

---

**Remember:** The system is self-tuning! Set your target utilization, let the controller do the rest. Monitor for stability and adjust gain/target if needed. 🎯✨
