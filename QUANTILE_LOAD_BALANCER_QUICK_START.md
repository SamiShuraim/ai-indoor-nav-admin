# Quantile-Based Load Balancer - Quick Start Guide

## 🚀 Overview

This is a **distribution-driven occupancy load balancer** that uses quantiles to compute dynamic age cutoffs. NO wait times, NO feedback controller - just simple, adaptive occupancy management.

---

## 📊 How It Works (In 3 Steps)

### Step 1: Track Recent Arrivals
Keep a rolling window (default 45 min) of arrivals:
- Count disabled vs non-disabled
- Track ages of non-disabled pilgrims

### Step 2: Compute Age Cutoff
```
share_left_for_old = alpha1 - p_disabled
tau = 1 - share_left_for_old
age_cutoff = tau-quantile of non-disabled ages
```

**Example:**
- Want 35% at Level 1 (alpha1 = 0.35)
- 15% are disabled (p_disabled = 0.15)
- → 20% of non-disabled should go to Level 1
- → Use 80th percentile as cutoff

### Step 3: Assign to Levels
```
Disabled           → Level 1
Age ≥ cutoff       → Level 1 (if not overcrowded)
Age < cutoff       → Least crowded of Level 2/3
```

---

## ⚙️ Configuration

### Alpha1 (Target Share for Level 1)

**Default:** 0.35 (35%)  
**Range:** 0.15 - 0.55

**What it does:**
- Higher alpha1 → More people to Level 1 → Lower age cutoff
- Lower alpha1 → Fewer people to Level 1 → Higher age cutoff

**Examples:**
- `alpha1 = 0.25` (25%) → Only most elderly get Level 1
- `alpha1 = 0.35` (35%) → Balanced (recommended)
- `alpha1 = 0.45` (45%) → More elderly get Level 1

### Sliding Window

**Default:** 45 minutes  
**Range:** 5 - 120 minutes

**What it does:**
- Determines how much history to consider
- Shorter window → Responds faster to changes
- Longer window → More stable cutoff

### Window Mode

**Options:** `sliding` or `decay`

**Sliding:** Hard cutoff at window boundary  
**Decay:** Exponential decay (recent arrivals weighted more)

---

## 🎯 Example Scenarios

### Scenario 1: Young Crowd (Morning Rush)
```
Recent arrivals: ages 20-40
80th percentile: age 38
→ Age cutoff: 38
→ Anyone 38+ goes to Level 1
```

### Scenario 2: Older Crowd (Afternoon)
```
Recent arrivals: ages 50-80
80th percentile: age 72
→ Age cutoff: 72
→ Only 72+ go to Level 1
```

### Scenario 3: High Disabled Fraction
```
40% of arrivals are disabled
alpha1 = 0.35 → want 35% at Level 1
→ Only 35% - 40% = -5% left (capped at 0%)
→ Age cutoff = max age (100th percentile)
→ Level 1 filled with disabled, almost no elderly
```

### Scenario 4: Low Disabled Fraction
```
5% of arrivals are disabled
alpha1 = 0.35 → want 35% at Level 1
→ 35% - 5% = 30% left for elderly
→ tau = 70th percentile
→ More elderly non-disabled get Level 1
```

---

## 🧪 Testing

### Test Dynamic Adaptation

```bash
# Test 1: Send young arrivals
for i in {1..20}; do
  curl -X POST http://localhost:5000/api/LoadBalancer/arrivals/assign \
    -H "Content-Type: application/json" \
    -d "{\"age\": $((25 + RANDOM % 20)), \"isDisabled\": false}"
done

# Check cutoff (should be ~40)
curl http://localhost:5000/api/LoadBalancer/metrics | jq '.ageCutoff'

# Test 2: Send elderly arrivals
for i in {1..20}; do
  curl -X POST http://localhost:5000/api/LoadBalancer/arrivals/assign \
    -H "Content-Type: application/json" \
    -d "{\"age\": $((65 + RANDOM % 20)), \"isDisabled\": false}"
done

# Check cutoff (should be ~75)
curl http://localhost:5000/api/LoadBalancer/metrics | jq '.ageCutoff'
```

### Test Configuration Changes

```bash
# Change alpha1 to 0.40 (40% target for Level 1)
curl -X POST http://localhost:5000/api/LoadBalancer/config \
  -H "Content-Type: application/json" \
  -d '{"alpha1": 0.40}'

# Check new cutoff (should be lower)
curl http://localhost:5000/api/LoadBalancer/metrics | jq '{alpha1, ageCutoff}'
```

---

## 📈 Monitoring

### Key Metrics to Watch

**Age Cutoff:**
- Shows current threshold for Level 1 assignment
- Changes dynamically based on recent arrivals
- `-∞` means no data yet (cold start)

**P(Disabled):**
- Fraction of disabled in recent arrivals
- Higher values → higher age cutoff

**Occupancy:**
- Current count at each level
- Used for load balancing decisions

**Quantiles:**
- 50th (median), 80th, 90th percentiles
- Shows age distribution of non-disabled arrivals

---

## 🔧 Tuning Tips

### If Level 1 Too Crowded:
1. **Lower alpha1** (e.g., 0.35 → 0.30)
   - Raises age cutoff
   - Fewer people assigned to Level 1

### If Level 1 Too Empty:
1. **Raise alpha1** (e.g., 0.35 → 0.40)
   - Lowers age cutoff
   - More people assigned to Level 1

### If Cutoff Too Volatile:
1. **Increase window** (e.g., 45 → 60 minutes)
   - More stable cutoff
   - Slower to adapt
2. **Use decay mode**
   - Smoother transitions
   - Recent data weighted more

### If Cutoff Too Slow to Adapt:
1. **Decrease window** (e.g., 45 → 30 minutes)
   - Faster response to changes
   - More volatile cutoff

---

## ❓ FAQ

**Q: Why does the cutoff show as "N/A"?**  
A: Not enough data yet. Need at least a few non-disabled arrivals to compute quantiles.

**Q: Why did the cutoff suddenly jump?**  
A: Old data fell out of the sliding window. The age distribution of recent arrivals changed significantly.

**Q: What if more than alpha1 people are disabled?**  
A: Level 1 gets filled with disabled. Age cutoff rises to maximum (100th percentile). Almost no elderly non-disabled get Level 1.

**Q: Can I change alpha1 dynamically?**  
A: Yes! Update config via POST `/api/LoadBalancer/config`. Takes effect immediately.

**Q: What happens in a cold start (no history)?**  
A: Age cutoff is `-∞`, so all disabled go to Level 1, all others distributed between 2/3 based on occupancy.

---

## 🎓 Key Concepts

### Quantile
The tau-quantile is the value below which tau% of data falls.
- 80th percentile (tau=0.8) → 80% of values are below this

### Share Left for Old
```
share_left_for_old = alpha1 - p_disabled
```
After allocating space for disabled, how much of Level 1 capacity is left for elderly non-disabled?

### Tau (Threshold Percentile)
```
tau = 1 - share_left_for_old
```
If we want 20% of non-disabled to go to Level 1, we need the 80th percentile as cutoff (tau=0.8).

### Occupancy
Current count of people at each level. NOT wait time.

---

## ✨ Advantages

1. **Self-Adapting**: No manual tuning needed for different populations
2. **Simple**: No feedback controllers, no wait time calculations
3. **Fair**: Based on actual age distribution, not fixed thresholds
4. **Transparent**: Easy to understand and explain
5. **Robust**: Handles varying disabled fractions automatically

---

## 🚨 Important Notes

- **Not wait times**: The system tracks occupancy (people count), not minutes
- **No queue management**: People perform ritual for 45 min and leave automatically
- **User controls alpha1**: No automatic adjustments like previous feedback controller
- **Legacy fields**: `waitEst` in responses actually contains occupancy count

---

## 📞 Support

For questions or issues:
1. Check metrics: `GET /api/LoadBalancer/metrics`
2. Verify config: `GET /api/LoadBalancer/config`
3. Review assignment decisions in response `reason` field

---

**Remember:** This is a **distribution-driven** system. It adapts to the actual population automatically. Just set alpha1 to your target share for Level 1, and let the quantiles do the work! 📊✨
