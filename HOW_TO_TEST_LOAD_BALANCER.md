# How to Test the Adaptive Load Balancer

## 🏗️ Production Architecture Overview

### Mobile App 📱
**ONE API call only:**
```
POST /api/LoadBalancer/arrivals/assign
{
  "age": 45,
  "isDisabled": false
}
```
**Response:** `{ "level": 2, ... }`

**That's it!** Mobile app:
- ✅ Sends pilgrim data
- ✅ Displays assigned level
- ❌ Does NOT update wait times
- ❌ Does NOT report congestion
- ❌ Does NOT track check-in/out

### Sensor/Monitoring System 🎥
**Continuously reports level states:**
```
POST /api/LoadBalancer/levels/state
{
  "levels": [
    { "level": 1, "waitEst": 11.5, "queueLen": 120, "throughputPerMin": 10.2 },
    { "level": 2, "waitEst": 15.3, "queueLen": 230, "throughputPerMin": 18.5 },
    { "level": 3, "waitEst": 14.1, "queueLen": 210, "throughputPerMin": 17.8 }
  ]
}
```

In production: cameras, sensors, or queue monitors measure:
- Wait times (from entry to service)
- Queue lengths (count of people waiting)
- Throughput (people processed per minute)

### Admin Dashboard 📊
**Polls for metrics:**
```
GET /api/LoadBalancer/metrics  // Every 15-30 seconds
```

Displays:
- Controller status (alpha1, age cutoff)
- Arrival statistics (counts, percentiles)
- Real-time level states

### Backend Controller 🤖
**Runs automatically every minute:**
- Reads Level 1 wait time
- Compares to target (12 minutes)
- Adjusts alpha1 accordingly
- Recalculates age cutoff

## 🧪 Testing in This Simulation Page

Since we don't have real sensors/cameras, this test page **simulates both roles**:

### Role 1: Mobile App (Test Buttons)
The test buttons simulate mobile app calls:
- Click "Elderly" → Simulates mobile app sending `{ age: 70, isDisabled: false }`
- Click "Young" → Simulates mobile app sending `{ age: 25, isDisabled: false }`
- Shows the response (assigned level)

### Role 2: Sensor System (Simulate Wait Times Button)
The "Simulate Wait Times" button replaces what sensors would do:
- Calculates wait times based on assignments
- Sends level state updates
- In production, cameras/sensors would do this automatically

### Role 3: Admin Dashboard (Metrics Display)
The metrics panels show what admin dashboard would display:
- Real-time statistics
- Controller state
- Level conditions

## Understanding the Two-Part System

The adaptive load balancer has **two independent data flows**:

### 1. **Arrival Flow** (Mobile App → Backend)
```
Mobile App: "70-year-old non-disabled pilgrim needs assignment"
            ↓
Backend:    • Records arrival in rolling window
            • Updates statistics (p_disabled, quantiles)
            • Calculates dynamic age cutoff
            • Routes to appropriate level
            ↓
Mobile App: "Send them to Level 1"
```

**Updates:**
- ✅ Rolling statistics (p_disabled, quantiles, counts)
- ✅ Dynamic age cutoff
- ❌ Wait times (NOT updated by assignments)

### 2. **Level State Flow** (Sensors → Backend → Dashboard)
```
Sensors:    "Level 1 has 120 people, 11.5 min wait, 10.2 people/min"
            ↓
Backend:    • Stores level states
            • Controller reads Level 1 wait time
            • Compares to target (12 min)
            • Adjusts alpha1 if needed
            ↓
Dashboard:  "Level 1: 11.5 min wait (Target: 12 min) ✓"
```

**Updates:**
- ✅ Wait times per level
- ✅ Queue lengths
- ✅ Throughput rates
- ✅ Alpha1 (via feedback controller)

## 🎯 Why Wait Times Don't Auto-Update

**Key Insight:** The assignment endpoint (`/arrivals/assign`) does NOT simulate queue dynamics.

**Why?**
- In production, mobile apps just assign pilgrims - they don't measure queues
- Sensors/cameras at each level measure actual congestion
- Backend receives TWO separate data streams: arrivals + level states
- The feedback controller combines both to make smart decisions

**In this test page:**
- Test buttons = Mobile app (send arrivals)
- "Simulate Wait Times" = Sensor system (send level states)
- Metrics display = Admin dashboard (view everything)

## 🚀 Testing the Feedback Controller

### Method 1: Quick Simulation (Recommended)

Simulates the complete production flow:

#### Step 1: Simulate Mobile App Calls

Click test buttons to simulate arrivals:
```
Click "Elderly" button
→ Simulates: POST /arrivals/assign { age: 70, isDisabled: false }
→ Response: { level: 1, ... }
→ Level 1 count increases
```

Multiple clicks simulate multiple pilgrims arriving.

#### Step 2: Simulate Sensor Updates

Click **"🎭 Simulate Wait Times"**:
```
Calculates congestion based on assignments:
→ Level 1: 8 + (20 assignments × 0.3) = 14 min
→ Level 2: 10 + (10 assignments × 0.15) = 11.5 min
→ Level 3: 10 + (15 assignments × 0.15) = 12.25 min

Sends: POST /levels/state { levels: [...] }
Metrics display updates with wait times
```

This replaces what sensors would automatically report.

#### Step 3: Trigger Feedback Controller

Click **"🔄 Trigger Controller Tick"**:
```
Manually runs: POST /control/tick

Controller logic:
→ Reads Level 1 wait: 14 min
→ Target: 12 min
→ Error: 12 - 14 = -2
→ Adjustment: -2 × 0.03 = -0.06
→ New Alpha1: 0.35 - 0.06 = 0.29

Age cutoff recalculates:
→ shareLeftForOld = 0.29 - 0.20 = 0.09
→ tau = 1 - 0.09 = 0.91
→ ageCutoff = 91st percentile = 72 years
```

In production, this runs automatically every minute.

#### Step 4: Observe Adaptation

Assign more pilgrims:
```
Click "Elderly (70 years)"
→ Age < cutoff (72)
→ Routes to Level 2/3 now (instead of Level 1)
→ System adapted! ✅
```

### Method 2: Manual State Updates

For precise control, manually set wait times:

#### Step 1: Assign Pilgrims
```
Click test buttons to get baseline data
```

#### Step 2: Set High Wait Time for Level 1
```
In "Update Level State" section:
- Level 1 Wait: 18.0  (way above target)
- Level 2 Wait: 12.0
- Level 3 Wait: 11.5

Click "Update Level State"
→ Sends: POST /levels/state
```

#### Step 3: Trigger Controller
```
Click "Trigger Controller Tick"
→ Controller sees: 18 > 12 (too busy!)
→ Alpha1 decreases significantly
→ Age cutoff increases
```

#### Step 4: Set Low Wait Time for Level 1
```
- Level 1 Wait: 8.0  (below target)

Click "Update Level State"
Click "Trigger Controller Tick"
→ Controller sees: 8 < 12 (has capacity!)
→ Alpha1 increases
→ Age cutoff decreases
```

## 📋 Example Test Scenarios

### Scenario 1: Level 1 Overload (High Demand)

**Simulates:** Many disabled/elderly arriving, Level 1 getting congested

```
Step 1: Simulate Mobile App Traffic
- Click "Disabled Wave" (20 disabled elderly)
- All route to Level 1 (priority rule)
- Level 1 count: 20

Step 2: Simulate Sensor Report
- Click "Simulate Wait Times"
- Calculated: Level 1 wait = 8 + (20 × 0.3) = 14 min ⚠️
- Above target (12 min)

Step 3: Trigger Controller (automatic in production)
- Click "Trigger Controller Tick"
- Error: 12 - 14 = -2
- Alpha1: 0.35 → 0.29 ⬇️
- Age cutoff: 65 → 72 years ⬆️
- Less room for non-disabled elderly

Step 4: Verify Adaptation
- Click "Elderly (70 years)"
- Now routes to Level 2/3 (age < new cutoff of 72)
- System protecting Level 1 capacity ✓

Step 5: Dashboard View
- Admin sees: "Level 1 at capacity, controller reduced alpha1"
- Charts show alpha1 trending down
- Age cutoff trending up
```

**Production equivalent:**
```
Mobile apps → Send 20 disabled arrivals → All to Level 1
Sensors → Report "Level 1: 14 min wait"
Controller → Auto-adjusts every minute
Mobile apps → New elderly arrivals go to Level 2/3
Dashboard → Shows real-time adaptation
```

### Scenario 2: Level 1 Under-Utilized (Low Demand)

**Simulates:** Only young pilgrims arriving, Level 1 empty

```
Step 1: Simulate Mobile App Traffic
- Click "Youth Rush" (30 young pilgrims)
- All route to Level 2/3 (age-based routing)
- Level 1 count: 0
- Level 2/3 count: ~15 each

Step 2: Simulate Sensor Report
- Click "Simulate Wait Times"
- Level 1: 8 min (below target) ✓
- Level 2/3: ~12 min (getting busy) ⚠️

Step 3: Trigger Controller
- Click "Trigger Controller Tick"
- Error: 12 - 8 = +4
- Alpha1: 0.35 → 0.47 ⬆️
- Age cutoff: 65 → 58 years ⬇️
- More room for elderly

Step 4: Verify Adaptation
- Click "Middle Aged (50 years)"
- Routes to Level 2/3 (age < 58)
- Click "Elderly (60 years)"
- Routes to Level 1 (age ≥ 58) ✓
- System utilizing Level 1 better

Step 5: Load Balance
- Level 1 starts accepting more people
- Load spreads more evenly
- All wait times converge toward 12 min
```

**Production equivalent:**
```
Mobile apps → Send young arrivals → Level 2/3 fill up
Sensors → Report "Level 1: 8 min, Level 2/3: 14 min"
Controller → Increases alpha1, lowers cutoff
Mobile apps → Elderly now route to Level 1
Dashboard → Shows improved load distribution
```

### Scenario 3: Mixed Load with Disabled Spike

**Simulates:** Sudden increase in disabled arrivals

```
Step 1: Establish Baseline
- Click "Mixed Group" (5 disabled + 3 elderly + 7 young)
- Click "Simulate Wait Times"
- Click "Trigger Controller Tick"
- Note baseline: Alpha1 ≈ 0.35, Cutoff ≈ 65

Step 2: Disabled Spike
- Click "Disabled Wave" (20 disabled elderly)
- All route to Level 1
- P(Disabled) increases: 0.10 → 0.40

Step 3: Simulate Congestion
- Click "Simulate Wait Times"
- Level 1 wait: significantly increased

Step 4: Observe Automatic Adaptation
- Age cutoff IMMEDIATELY increases (even before controller tick!)
- Why? Formula: shareLeftForOld = alpha1 - p_disabled
  - Was: 0.35 - 0.10 = 0.25 (25% for elderly)
  - Now: 0.35 - 0.40 = -0.05 → 0 (0% for elderly!)
  - Tau: 1 - 0 = 1.00 (100th percentile)
  - Cutoff: Maximum age in dataset

Step 5: Controller Response
- Click "Trigger Controller Tick"
- Controller sees high wait time
- Alpha1 might increase to make room
- Or stays bounded by alpha1Max

Step 6: Verify Priority
- Click "Disabled + Young (35 years)"
- Still goes to Level 1 ✓ (disabled always priority)
- Click "Very Elderly (85 years)"
- May go to Level 2/3 (no room left)
```

**Production equivalent:**
```
Real-world scenario: Bus of disabled pilgrims arrives
Mobile apps → Spike in disabled assignments
System → Instantly adjusts cutoff (no elderly to L1)
Sensors → Report increased Level 1 wait
Controller → Adjusts alpha1 bounds
Mobile apps → Non-disabled elderly route around Level 1
Dashboard → Alert: "High disabled percentage"
```

### Scenario 4: Configuration Tuning

**Simulates:** Admin changing system parameters

```
Step 1: Test Default Behavior
- Assign various pilgrims
- Note: Wait target = 12 min, Controller Gain = 0.03

Step 2: Change Wait Target
- Click "Edit Config"
- Set "Wait Target: 10" (more aggressive)
- Click "Save Configuration"

Step 3: Trigger Controller
- Click "Trigger Controller Tick"
- Controller now targets 10 min (not 12)
- Alpha1 adjusts differently

Step 4: Assign Pilgrims
- Same inputs produce different routing
- More conservative about Level 1

Step 5: Change Controller Gain
- Edit config: "Controller Gain: 0.05" (faster response)
- Save and trigger tick
- Alpha1 changes more aggressively

Step 6: Reset to Defaults
- Edit config back to original values
- Test behavior returns to baseline
```

**Production equivalent:**
```
Admin dashboard → Operator changes settings
Backend → Updates configuration immediately
Controller → Respects new parameters
System → Adapts behavior in real-time
Dashboard → Shows impact of changes
```

## 📊 Interpreting Metrics

### Controller State

**Alpha1 (Target Fraction)**
- Current: `0.35` (35% target for Level 1)
- Range: `0.15` - `0.55` (bounds)
- **Meaning:** Try to send 35% of arrivals to Level 1
- **Changes:** Increases when L1 under-utilized, decreases when busy

**Age Cutoff (Dynamic Threshold)**
- Current: `67.3 years`
- Formula-driven, not fixed
- **Meaning:** Non-disabled ≥ 67.3 years route to Level 1
- **Changes:** Based on alpha1 and p_disabled

**P(Disabled) (Fraction of Disabled Arrivals)**
- Current: `0.21` (21% are disabled)
- Rolling window (default: 45 minutes)
- **Meaning:** 21% of recent arrivals were disabled
- **Impact:** Higher p_disabled → Higher age cutoff (less room for elderly)

### Arrival Statistics

**Counts (Rolling Window)**
- Total: 150
- Disabled: 30
- Non-Disabled: 120
- **Meaning:** Last 45 minutes of arrivals

**Quantiles (Non-Disabled Ages)**
- 50th: `44.1` (median age)
- 80th: `60.2` (80% are younger)
- 90th: `66.5` (90% are younger)
- **Usage:** Controller uses percentiles to calculate cutoff

### Level States

**Wait Time**
- Current: `11.5 min`
- Target: `12 min`
- **Colors:**
  - 🟢 Green: ≤ 12 min (good)
  - 🟡 Yellow: 12-14.4 min (warning)
  - 🔴 Red: > 14.4 min (overloaded)

**Queue Length**
- Current: `120 people`
- **Meaning:** Number waiting at this level
- **Trend:** Increasing = getting busier

**Throughput**
- Current: `10.5 people/min`
- **Meaning:** Processing rate
- **Usage:** Higher throughput = faster service

## 🔧 Understanding the Formulas

### Age Cutoff Calculation

```
Input:
  alpha1 = 0.35         (target 35% to Level 1)
  p_disabled = 0.20     (20% are disabled)

Step 1: Calculate share left for elderly
  shareLeftForOld = max(0, alpha1 - p_disabled)
                  = max(0, 0.35 - 0.20)
                  = 0.15               (15% left)

Step 2: Calculate percentile (tau)
  tau = 1 - shareLeftForOld
      = 1 - 0.15
      = 0.85                  (85th percentile)

Step 3: Get cutoff from quantiles
  ageCutoff = 85th percentile of non-disabled ages
            = 68.2 years

Result: Non-disabled ≥ 68.2 years go to Level 1
```

**Intuition:** After reserving 20% for disabled, remaining 15% goes to eldest 15% of non-disabled pilgrims.

### Controller Update (Feedback Control)

```
Input:
  waitTargetMinutes = 12
  waitEst[1] = 15           (current Level 1 wait)
  alpha1 = 0.35             (current target)
  controllerGain = 0.03     (sensitivity)
  p_disabled = 0.20

Step 1: Calculate error
  error = waitTargetMinutes - waitEst[1]
        = 12 - 15
        = -3                  (too busy!)

Step 2: Calculate adjustment
  adjustment = controllerGain × error
             = 0.03 × (-3)
             = -0.09            (reduce target)

Step 3: Apply adjustment
  alpha1_new = alpha1 + adjustment
             = 0.35 + (-0.09)
             = 0.26

Step 4: Enforce bounds
  lowerBound = max(alpha1Min, p_disabled)
             = max(0.15, 0.20)
             = 0.20             (must fit disabled)
  
  alpha1_final = clip(alpha1_new, lowerBound, alpha1Max)
               = clip(0.26, 0.20, 0.55)
               = 0.26             (within bounds)

Result: Alpha1 decreases from 0.35 → 0.26
```

**Intuition:** Wait time too high → Reduce Level 1 target → Route more people elsewhere

### Wait Time Simulation (Test Only)

```
Formula (Level 1):
  waitTime = baseWait + (assignments × factor)
           = 8 + (assignments × 0.3)

Example:
  20 assignments: 8 + (20 × 0.3) = 14 min
  10 assignments: 8 + (10 × 0.3) = 11 min

Formula (Level 2/3):
  waitTime = 10 + (assignments × 0.15)

Example:
  20 assignments: 10 + (20 × 0.15) = 13 min
```

**Rationale:**
- Level 1 has lower capacity (disabled + elderly only)
- Factor 0.3 vs 0.15 = Level 1 fills 2× faster
- **Production Note:** Real sensors measure actual wait times, not formulas!

## ❓ Common Questions

### Q: Why don't wait times change when I assign pilgrims?

**A:** Because in production:
- Mobile apps only call `/arrivals/assign` 
- They don't measure or report wait times
- Sensors at each level send wait time updates
- In this test page, you simulate sensors by clicking "Simulate Wait Times"

### Q: Why doesn't Alpha1 change automatically?

**A:** It does in production! The controller runs every minute automatically. In this test page, you manually trigger it to:
- Understand when it runs
- See the exact moment it changes
- Learn how it responds to conditions

### Q: What happens if I only assign pilgrims without simulating wait times?

**A:** Wait times stay at 0 or N/A because:
- No sensor data received
- Controller has no wait times to react to
- Assignments still work (routing logic doesn't need wait times)
- But you won't see feedback control in action

### Q: In production, who updates level states?

**A:** **NOT the mobile app!** Options:
1. **Camera/AI system** - Computer vision counts people, estimates waits
2. **IoT sensors** - Entry/exit sensors track flow
3. **Manual monitoring** - Staff report via admin interface
4. **Hybrid** - Multiple data sources combined

The mobile app only assigns - it never reports back about congestion.

### Q: Why are all elderly going to Level 2/3?

**A:** Check two things:
1. **Age cutoff** - If it's high (e.g., 75), only very elderly qualify for Level 1
2. **P(Disabled)** - If high (e.g., 0.40), less room for non-disabled elderly

This happens when many disabled arrivals "crowd out" the non-disabled elderly.

### Q: Can I make Level 1 accept more people?

**A:** Three ways:
1. **Increase alpha1** in config (raises target %)
2. **Lower Level 1 wait time**, trigger tick (controller raises alpha1)
3. **Wait for fewer disabled** (p_disabled drops, more room for elderly)

### Q: What's the difference between this test page and production?

| Test Page | Production |
|-----------|-----------|
| Manual "Simulate Wait Times" | Automatic sensor updates |
| Manual "Trigger Controller Tick" | Auto-runs every minute |
| One page does everything | Separate mobile app + dashboard |
| Simulated wait time formula | Real queue measurements |

### Q: Should mobile app poll `/metrics`?

**A:** **NO!** Mobile app should:
- ✅ Call `/arrivals/assign` once
- ✅ Show assigned level to user
- ❌ Not poll metrics (unnecessary bandwidth)
- ❌ Not update level states (not its job)

Only the admin dashboard polls `/metrics`.

## 💡 Pro Testing Tips

1. **Start Simple**: 5-10 assignments → Simulate → Tick → Observe
2. **Use Batch Tests**: Quick way to simulate many arrivals
3. **Watch P(Disabled)**: It drives age cutoff changes
4. **Test Extremes**: All disabled, all young, mixed
5. **Reset Often**: "Reset Counts" starts fresh
6. **Monitor Colors**: Wait time colors show controller effectiveness
7. **Read Decision Reason**: Every assignment explains why it routed there

## 🎓 Learning Path

### Beginner: Basic Flow
```
1. Click "Young" (5 times) → All go to Level 2/3
2. Click "Simulate Wait Times" → See wait times appear
3. Click "Trigger Controller Tick" → See alpha1 adjust
4. Click "Elderly" → See where it routes now
```

### Intermediate: Feedback Control
```
1. Assign mixed group
2. Simulate high Level 1 wait (18 min)
3. Trigger tick → Alpha1 decreases
4. Assign elderly → Routes differently now
5. Lower Level 1 wait (8 min)
6. Trigger tick → Alpha1 increases
7. Assign elderly → Routes to Level 1 again
```

### Advanced: System Dynamics
```
1. Disabled wave → P(Disabled) spikes
2. Watch age cutoff jump immediately (no tick needed)
3. Simulate congestion
4. Trigger tick → Alpha1 bounded by limits
5. Change config (lower alpha1Max)
6. Trigger tick → Alpha1 respects new bound
7. Observe system behavior changes
```

## 🚀 Quick Reference

### Production API Calls

**Mobile App:**
```bash
# Only call this
curl -X POST /api/LoadBalancer/arrivals/assign \
  -H "Content-Type: application/json" \
  -d '{"age": 65, "isDisabled": false}'
```

**Sensor System:**
```bash
# Continuous updates from sensors
curl -X POST /api/LoadBalancer/levels/state \
  -H "Content-Type: application/json" \
  -d '{"levels":[{"level":1,"waitEst":11.5,"queueLen":120}]}'
```

**Admin Dashboard:**
```bash
# Poll every 15-30 seconds
curl -X GET /api/LoadBalancer/metrics
```

### Test Page Workflow

```
1. [Assign Pilgrims] → Simulates mobile app calls
2. [Simulate Wait Times] → Simulates sensor reports  
3. [Trigger Controller Tick] → Runs feedback control
4. [Check Metrics] → View current state
5. [Repeat or Reset] → Continue testing
```

---

**Happy Testing! 🎉**

The key insight: **Two separate data streams** (arrivals + level states) feed the adaptive controller. This test page lets you simulate both!

