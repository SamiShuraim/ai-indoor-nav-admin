# How to Test the Adaptive Load Balancer

## Understanding the Two-Part System

The adaptive load balancer has **two independent data flows** that work together:

### 1. **Arrival Assignments** (What You Click)
When you click test buttons to assign pilgrims:
- Updates **rolling statistics**: `p_disabled`, age quantiles, arrival counts
- Calculates **dynamic age cutoff** based on percentiles
- Routes pilgrim to appropriate level
- **Does NOT change wait times automatically**

### 2. **Level State Updates** (Simulated Sensor Data)
In production, sensors/cameras measure actual wait times at each level:
- **Wait times** (minutes waiting in queue)
- **Queue lengths** (number of people)
- **Throughput** (people per minute)

The **feedback controller** uses these wait times to adjust `alpha1`:
- If Level 1 wait > 12 min → Decrease alpha1 (send fewer to Level 1)
- If Level 1 wait < 12 min → Increase alpha1 (send more to Level 1)

## Why Wait Times Don't Auto-Update

The backend is designed to receive wait time data from **external sensors** (cameras, queue monitors, etc.). The assignment endpoint only:
1. Records the arrival
2. Applies routing logic
3. Returns the assignment

It does **NOT** simulate queue dynamics or wait times. This is intentional - in production, real sensors provide this data.

## Testing the Feedback Controller

### Method 1: Quick Simulation (Recommended)

1. **Assign Pilgrims**
   - Click various test buttons (disabled, elderly, young)
   - Or use batch scenarios for faster testing
   - Watch the assignment counts increase

2. **Simulate Wait Times**
   - Click the **"🎭 Simulate Wait Times"** button
   - This calculates wait times based on assignments:
     - Level 1: `8 + (assignments × 0.3)` minutes
     - Level 2/3: `10 + (assignments × 0.15)` minutes
   - Wait times appear in metrics display

3. **Trigger Controller**
   - Click **"🔄 Trigger Controller Tick"**
   - Watch Alpha1 adjust based on Level 1 wait time
   - If wait > 12 min: Alpha1 decreases
   - If wait < 12 min: Alpha1 increases

4. **Observe Changes**
   - Age cutoff adjusts as Alpha1 changes
   - Future assignments route differently
   - System adapts to congestion

### Method 2: Manual State Updates

1. **Assign some pilgrims** to get baseline data

2. **Manually set wait times** in "Update Level State" section:
   ```
   Level 1 Wait: 15.0 (above target of 12)
   Level 2 Wait: 14.0
   Level 3 Wait: 13.5
   ```

3. **Click "Update Level State"** to send to backend

4. **Trigger Controller Tick** to see Alpha1 decrease

5. **Set lower wait time** for Level 1:
   ```
   Level 1 Wait: 9.0 (below target of 12)
   ```

6. **Trigger Controller Tick** to see Alpha1 increase

## Example Test Scenarios

### Scenario 1: Level 1 Overload

**Goal**: Make Level 1 too busy, watch controller reduce alpha1

```
1. Assign 20 disabled elderly (all go to Level 1)
2. Simulate wait times
   → Level 1 wait: ~14 min (above target)
3. Trigger controller tick
   → Alpha1 decreases (e.g., 0.35 → 0.32)
4. Age cutoff increases (less room for elderly)
5. Assign more pilgrims
   → More elderly now go to Level 2/3
```

### Scenario 2: Level 1 Under-Utilized

**Goal**: Make Level 1 empty, watch controller increase alpha1

```
1. Assign 30 young pilgrims (all go to Level 2/3)
2. Simulate wait times
   → Level 1 wait: ~8 min (below target)
   → Level 2/3 wait: ~14 min
3. Trigger controller tick
   → Alpha1 increases (e.g., 0.35 → 0.38)
4. Age cutoff decreases (more room for elderly)
5. Assign elderly pilgrims
   → More go to Level 1 now
```

### Scenario 3: Mixed Load Balancing

**Goal**: Test system adaptability

```
1. Use "Mixed Group" batch (5 disabled + 3 elderly + 7 young)
2. Simulate wait times
3. Trigger controller tick
4. Observe balanced assignments
5. Use "Disabled Wave" (20 disabled)
6. Simulate wait times again
   → Level 1 wait increases
7. Trigger controller tick
   → Alpha1 decreases
   → P(Disabled) increases
   → Age cutoff increases automatically
8. Assign elderly (70y)
   → Now routes to Level 2/3 instead of Level 1
```

### Scenario 4: Testing Edge Cases

**Goal**: Verify priority rules hold

```
1. Set Level 1 wait to 20 min (very high)
2. Trigger controller tick
   → Alpha1 drops to minimum
3. Assign disabled pilgrims
   → Still go to Level 1 (disabled always priority)
4. Assign young pilgrims
   → Go to less busy of Level 2/3
5. Assign very elderly (85y)
   → May go to Level 2/3 if above cutoff
```

## Interpreting Metrics

### Controller State
- **Alpha1**: Target fraction for Level 1 (e.g., 0.35 = 35%)
- **Age Cutoff**: Dynamic threshold (e.g., 67.3 years)
  - Above cutoff → Level 1 (if capacity)
  - Below cutoff → Level 2/3
- **P(Disabled)**: Fraction of disabled arrivals (e.g., 0.21 = 21%)

### Quantiles (Non-Disabled Ages)
- **50th Percentile**: Median age
- **80th Percentile**: Used for cutoff calculation
- **90th Percentile**: Shows age distribution

### Level States
- **Wait Time**: Minutes in queue
  - 🟢 Green: ≤ target (12 min)
  - 🟡 Yellow: ≤ 1.2× target (14.4 min)
  - 🔴 Red: > 1.2× target
- **Queue Length**: Number of people waiting
- **Throughput**: People processed per minute

## Understanding the Formulas

### Age Cutoff Calculation
```
shareLeftForOld = max(0, alpha1 - p_disabled)
tau = 1 - shareLeftForOld
ageCutoff = quantile(tau) of non-disabled ages
```

**Example:**
- alpha1 = 0.35 (target 35% to Level 1)
- p_disabled = 0.20 (20% are disabled)
- shareLeftForOld = 0.35 - 0.20 = 0.15 (15% left for elderly)
- tau = 1 - 0.15 = 0.85 (85th percentile)
- ageCutoff = 85th percentile age (e.g., 68 years)

**Meaning**: After reserving capacity for disabled, remaining 15% goes to eldest 15% of non-disabled pilgrims.

### Controller Update
```
error = waitTargetMinutes - waitEst[1]
alpha1_new = alpha1 + (controllerGain × error)
alpha1_new = clip(alpha1_new, max(alpha1Min, p_disabled), alpha1Max)
```

**Example:**
- Target: 12 min
- Actual wait: 15 min
- Error: 12 - 15 = -3
- Gain: 0.03
- Adjustment: 0.03 × -3 = -0.09
- New alpha1: 0.35 - 0.09 = 0.26 (clamped to bounds)

### Simulated Wait Times
```
Level 1: 8 + (assignments × 0.3) minutes
Level 2: 10 + (assignments × 0.15) minutes
Level 3: 10 + (assignments × 0.15) minutes
```

**Reasoning**: Level 1 has lower capacity (disabled + elderly), so it fills up faster (0.3 vs 0.15).

## Common Questions

### Q: Why doesn't Alpha1 change when I assign pilgrims?
**A**: Alpha1 only changes when you **trigger the controller tick**. Assignments alone don't change Alpha1.

### Q: Why are all elderly going to Level 2/3?
**A**: Check the age cutoff. If it's high (e.g., 75 years), only very elderly go to Level 1. This happens when:
- High p_disabled (many disabled taking Level 1 capacity)
- Low alpha1 (controller reduced Level 1 target)

### Q: Why are wait times stuck at 0 or N/A?
**A**: You need to either:
1. Click "Simulate Wait Times" button, OR
2. Manually enter wait times in "Update Level State" section

### Q: How do I make Level 1 accept more people?
**A**: Two ways:
1. Increase alpha1 in Configuration panel
2. Lower Level 1 wait time, then trigger controller (it will increase alpha1 automatically)

### Q: Why did the age cutoff suddenly jump?
**A**: Probably because:
- P(Disabled) increased (many disabled assigned)
- Less room for elderly in Level 1
- Cutoff rises to a higher percentile

## Pro Tips

1. **Start Simple**: Assign 5-10 pilgrims, simulate, tick, observe
2. **Use Batch Tests**: Test system behavior under load
3. **Watch Trends**: Alpha1 and age cutoff change together
4. **Test Extremes**: Try all disabled, all young, mixed
5. **Reset Often**: Use "Reset Counts" to start fresh
6. **Monitor Colors**: Wait time colors show controller effectiveness

## Expected Behavior

### ✅ Correct Behavior
- Disabled always go to Level 1 (regardless of wait time)
- Elderly above cutoff go to Level 1 (if within alpha1 target)
- Young go to less busy of Level 2/3
- Alpha1 adjusts when wait times change
- Age cutoff adapts to p_disabled changes

### ❌ Unexpected? Check This
- If wait times never change → Need to simulate or update manually
- If alpha1 never changes → Need to trigger controller tick
- If everyone goes to Level 1 → Check alpha1 (may be too high)
- If no one goes to Level 1 → Check age cutoff (may be very high)

## Production Deployment

In production, you would:
1. **Remove simulation**: Use real sensor data
2. **Auto-tick controller**: Run every minute automatically (backend does this)
3. **Stream updates**: WebSocket/SignalR for real-time metrics
4. **Alerting**: Notify when wait times exceed thresholds
5. **Analytics**: Dashboard showing trends over time

---

**Happy Testing! 🚀**
