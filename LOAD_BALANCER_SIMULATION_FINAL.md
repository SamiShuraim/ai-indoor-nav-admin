# Load Balancer Simulation Page - Final Architecture

## Overview

The Load Balancer Simulation page has been redesigned to accurately reflect the **production architecture** where:

1. **Mobile apps** ONLY call `POST /arrivals/assign` to get level assignments
2. **Backend** automatically handles all tracking, queue management, and controller adjustments
3. **Admin dashboard** polls `GET /metrics` to display real-time statistics
4. **NO manual intervention** needed (except optional config changes)

## What Changed

### ❌ Removed (These were incorrect assumptions)

- ~~"Simulate Wait Times" button~~ - Backend calculates this automatically from arrivals
- ~~"Trigger Controller Tick" button~~ - Backend runs this every minute automatically
- ~~"Update Level State" manual form~~ - Backend manages queue states automatically
- ~~Manual sensor simulation~~ - Not needed; backend tracks everything

### ✅ Added (Production-accurate features)

- **Architecture Overview** - Visual explanation of the system components
- **Auto-Refresh Toggle** - Simulates admin dashboard polling behavior
- **Refresh Interval Selector** - Choose polling frequency (5-60 seconds)
- **Assignment Counter Display** - Shows distribution across levels
- **Simplified workflow** - Just assign pilgrims and watch metrics update!

## Production Architecture

```
┌─────────────────┐
│  Mobile App     │
│                 │  POST /arrivals/assign
│  Test buttons   │  { age: 45, isDisabled: false }
│  simulate this  │           │
└─────────┬───────┘           │
          │                   ▼
          │        ┌─────────────────────────┐
          │        │  Backend (Autonomous)   │
          │        │  • Records arrival      │
          │        │  • Updates statistics   │
          │        │  • Manages queues       │
          │        │  • Runs controller      │
          │        │  • Calculates waits     │
          │        │  • Everything automatic │
          │        └────────┬────────────────┘
          │                 │
          │                 │ GET /metrics (poll)
          │                 │
          ▼                 ▼
┌──────────────────────────────┐
│  Admin Dashboard             │
│                              │
│  Metrics display simulates   │
│  this with auto-refresh      │
└──────────────────────────────┘
```

## How It Works Now

### 1. Mobile App Simulation (Test Buttons)

**What they do:**
- Click any test button (e.g., "Elderly", "Young", "Disabled")
- Calls `POST /api/LoadBalancer/arrivals/assign`
- Displays the assigned level
- **That's it!** No other actions needed

**Test Button Categories:**
- **Quick Test Scenarios** (6 buttons) - Individual pilgrim types
- **Advanced Scenarios** (4 buttons) - Batch assignments
- **Edge Cases** (4 buttons) - Boundary testing

### 2. Admin Dashboard Simulation (Metrics Display)

**Auto-Refresh Feature:**
- Toggle ON to enable automatic polling
- Select refresh interval (5, 10, 15, 30, or 60 seconds)
- Simulates real admin dashboard behavior
- Shows real-time metrics from `GET /metrics`

**Manual Refresh:**
- Click "Refresh Now" button for immediate update
- Use when auto-refresh is off

### 3. Backend (Automatic - No UI)

**The backend automatically:**
- ✅ Tracks all arrivals in rolling 45-minute window
- ✅ Calculates wait times based on queue dynamics
- ✅ Manages queue lengths for each level
- ✅ Runs feedback controller every minute
- ✅ Adjusts Alpha1 based on Level 1 wait time
- ✅ Recalculates age cutoff dynamically
- ✅ Updates all statistics in real-time

**No manual intervention required!**

## User Workflow

### Simple Testing (Recommended Start)

```
1. Click "Elderly" button 5 times
   → Observe: Level 1 count increases
   → Backend: Tracks 5 arrivals, updates stats

2. Wait ~5 seconds, then click "Refresh Now"
   → Observe: Metrics update (P(Disabled), quantiles, etc.)
   → Backend: Returns latest calculated state

3. Enable "Auto-Refresh" with 15 second interval
   → Observe: Metrics automatically update every 15s
   → Simulates: Real admin dashboard polling

4. Click "Youth Rush" (30 young pilgrims)
   → Observe: Level 2/3 counts increase
   → Backend: Processes all assignments, updates everything

5. Watch metrics auto-refresh
   → See: Alpha1 adjusts, age cutoff changes, wait times populate
   → Backend: Controller running automatically
```

### Advanced Testing

```
1. Start with mixed assignments (various ages/statuses)
2. Enable auto-refresh at 15s interval
3. Watch how metrics evolve:
   - P(Disabled) changes as you add disabled pilgrims
   - Age cutoff adjusts automatically
   - Wait times appear and change
   - Alpha1 adjusts via feedback controller
4. Assign more pilgrims, observe adaptation
5. Check "Latest Assignment" to see routing decisions
```

### Configuration Testing

```
1. Click "Edit Config"
2. Change parameters (e.g., Wait Target: 10 min)
3. Save configuration
4. Assign pilgrims
5. Observe different routing behavior
```

## Page Components

### Welcome Card
- Architecture overview with icons
- Explains each component's role
- Shows API endpoints used
- Quick start instructions

### Quick Test Scenarios
- 6 color-coded buttons for common pilgrim types
- Icons indicate pilgrim category
- Shows age and status clearly
- One-click testing

### Advanced Scenarios
- 4 batch test buttons
- Simulate real-world arrival patterns
- Quick stress testing

### Edge Cases
- Min/max age testing
- Random generation
- Boundary condition testing

### Dashboard Controls Panel
**Features:**
- Auto-refresh toggle (simulates dashboard polling)
- Interval selector (5-60 seconds)
- Manual refresh button
- Reset simulation button
- Assignment count display (3 level cards)

### Latest Assignment Display
Shows last assignment with:
- Assigned level (color-coded badge)
- Trace ID for debugging
- Pilgrim details (age, disability)
- Decision metrics (age cutoff, alpha1, p_disabled)
- Reasoning explanation
- Wait time estimates

### Assignment History
- Last 10 assignments
- Level, age, status, and reason
- Quick overview of routing patterns

### Configuration Panel
- View/edit system parameters
- Alpha1, wait target, controller gain
- Window settings
- Soft gate and randomization options

### Comprehensive Metrics Display
**Controller State:**
- Alpha1 (target fraction)
- Age cutoff (dynamic threshold)
- P(Disabled) (disabled proportion)
- Target and bounds

**Arrival Statistics:**
- Total counts (rolling window)
- Disabled vs non-disabled
- Age quantiles (50th, 80th, 90th)

**Level States:**
- Wait times (color-coded by target)
- Queue lengths
- Throughput rates

## API Calls Made

### Initialization
```
GET /api/LoadBalancer/health
GET /api/LoadBalancer/metrics
GET /api/LoadBalancer/config
```

### During Testing
```
POST /api/LoadBalancer/arrivals/assign  (every button click)
GET /api/LoadBalancer/metrics           (auto-refresh or manual)
```

### Configuration Changes (Optional)
```
POST /api/LoadBalancer/config          (when saving config)
GET /api/LoadBalancer/config           (after update)
```

## What Backend Does Automatically

### After Each Assignment Call

1. **Records Arrival**
   - Adds to rolling window (45 minutes)
   - Updates statistics (total, disabled, non-disabled)
   - Recalculates quantiles

2. **Routes Pilgrim**
   - Applies routing logic (disabled → L1, age check, etc.)
   - Returns assignment decision

3. **Manages Queues** (Automatic)
   - Tracks 45-minute lifecycle per pilgrim
   - Updates queue lengths
   - Calculates wait times based on arrival rates and throughput

4. **Updates Statistics** (Real-time)
   - P(Disabled) recalculated
   - Age distribution updated
   - Quantiles recomputed

### Every Minute (Automatic Controller Tick)

1. **Reads Current State**
   - Level 1 wait time
   - Current alpha1

2. **Calculates Error**
   - `error = waitTarget - waitEst[1]`

3. **Adjusts Alpha1**
   - `alpha1_new = alpha1 + (gain × error)`
   - Clips to bounds [alpha1Min, alpha1Max]

4. **Recalculates Age Cutoff**
   - `shareLeftForOld = alpha1 - p_disabled`
   - `tau = 1 - shareLeftForOld`
   - `ageCutoff = quantile(tau)`

5. **Updates Routing**
   - Future assignments use new cutoff

## Key Insights

### Why Wait Times Update Automatically

**In the old (incorrect) assumption:**
- "We need to manually set wait times"
- "Controller needs manual triggering"

**In reality:**
- Backend calculates wait times from arrival patterns
- Backend runs controller every minute automatically
- System is fully autonomous

**How backend calculates wait times:**
1. Tracks arrivals per level over 45 minutes
2. Knows typical throughput per level
3. Calculates: `waitTime = queueLength / throughput`
4. Updates in real-time as arrivals change

### Why No Manual "Trigger Controller"

**Controller runs automatically:**
- Every 60 seconds
- Backend has internal timer
- No external trigger needed
- Already happening in production

**Test page just observes results:**
- Metrics update shows controller adjustments
- Alpha1 changes appear automatically
- Age cutoff updates reflect controller actions

### Mobile App Responsibility

**ONLY ONE CALL:**
```javascript
const response = await assignPilgrim(age, isDisabled);
console.log(`Go to Level ${response.level}`);
```

**Mobile app does NOT:**
- ❌ Track check-ins/check-outs
- ❌ Report congestion
- ❌ Update queue data
- ❌ Calculate wait times
- ❌ Run any algorithms

**Backend does everything else!**

## Benefits of This Approach

### For Testing
- ✅ More realistic simulation
- ✅ Matches production architecture
- ✅ No confusing manual steps
- ✅ Automatic adaptation visible
- ✅ Less user intervention needed

### For Understanding
- ✅ Clear separation of concerns
- ✅ Backend capabilities visible
- ✅ Autonomous system behavior shown
- ✅ Production workflow accurate

### For Development
- ✅ Tests actual API usage
- ✅ Validates backend automation
- ✅ Dashboard polling simulated correctly
- ✅ Mobile app integration clear

## Testing Tips

### Start Simple
1. Click a few buttons
2. Enable auto-refresh
3. Watch metrics update
4. That's it!

### Observe Patterns
- P(Disabled) reflects your clicks
- Age cutoff adapts to disabled proportion
- Alpha1 adjusts to wait times
- Routing changes based on cutoff

### Test Extremes
- All disabled → High p_disabled → High age cutoff
- All young → Low Level 1 use → Alpha1 increases
- Mixed loads → System balances automatically

### Use Auto-Refresh
- Set to 15 seconds (recommended)
- Simulates real dashboard experience
- See changes without manual refresh
- More realistic testing flow

## Troubleshooting

### "Metrics not updating"
- Check if auto-refresh is enabled
- Or click "Refresh Now" manually
- Backend updates on every assignment, but frontend needs to poll

### "Wait times showing N/A"
- Normal on cold start (no arrivals yet)
- Assign some pilgrims
- Wait ~15 seconds for backend to calculate
- Refresh metrics

### "Age cutoff seems wrong"
- Check p_disabled value
- High p_disabled → High cutoff (less room for elderly)
- Low p_disabled → Low cutoff (more room for elderly)
- This is correct behavior!

### "Alpha1 not changing"
- Controller runs every 60 seconds
- May need to wait a minute
- Refresh metrics to see latest value
- Check wait times - if close to target, alpha1 won't change much

## Files Modified

1. **`src/components/LoadBalancerSimulation.tsx`**
   - Removed manual simulation functions
   - Added auto-refresh functionality
   - Updated architecture explanation
   - Simplified user workflow

2. **`src/components/LoadBalancerSimulation.css`**
   - Added architecture overview styles
   - Added dashboard controls styles
   - Added auto-refresh toggle styles

3. **API imports cleaned up**
   - Removed: `updateLevelState`, `triggerControlTick`, `LevelStateUpdate`
   - Kept: `assignArrival`, `getMetrics`, `updateConfig`, `getConfig`, `getHealth`

## Summary

The simulation page now **accurately reflects production**:

- **Mobile App**: Test buttons → `/arrivals/assign` calls only
- **Backend**: Autonomous operation (no manual intervention)
- **Dashboard**: Auto-refresh → `/metrics` polling

**Key Principle**: Everything happens automatically in the backend. The frontend just assigns pilgrims and observes the results!

---

**Updated:** 2025-10-29  
**Status:** ✅ Production-Accurate Architecture
