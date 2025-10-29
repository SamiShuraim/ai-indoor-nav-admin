# Load Balancer Simulation Frontend Implementation

## Overview
Complete remake of the Load Balancer Simulation page to test the new **Adaptive Load Balancer System**. The frontend now provides comprehensive testing capabilities with multiple scenarios, metrics display, configuration controls, and real-time feedback.

## What Was Implemented

### 1. **Updated API Layer** (`src/constants/api.ts`)
Added new endpoints for the adaptive load balancer system:
- `LOAD_BALANCER_ARRIVALS_ASSIGN` - Assign pilgrim to level
- `LOAD_BALANCER_LEVELS_STATE` - Update level states
- `LOAD_BALANCER_CONTROL_TICK` - Manually trigger controller tick
- `LOAD_BALANCER_METRICS` - Get comprehensive metrics
- `LOAD_BALANCER_CONFIG` - Get/update configuration
- `LOAD_BALANCER_HEALTH` - Health check

### 2. **Enhanced API Helper** (`src/utils/api_helpers/loadBalancerApi.ts`)
Complete TypeScript interface definitions and API functions:

#### New Types:
- `ArrivalAssignmentRequest` / `ArrivalAssignmentResponse`
- `AssignmentDecision` - Detailed decision information
- `MetricsResponse` - Comprehensive system metrics
- `ConfigResponse` - Runtime configuration
- `LevelStateUpdate` - Level state updates

#### New API Functions:
- `assignArrival()` - Assign pilgrim based on age and disability
- `updateLevelState()` - Update wait times, queues, throughput
- `triggerControlTick()` - Manually trigger feedback controller
- `getMetrics()` - Get all system metrics and statistics
- `updateConfig()` - Update runtime configuration
- `getConfig()` - Get current configuration
- `getHealth()` - Health check

### 3. **Completely Remade Component** (`src/components/LoadBalancerSimulation.tsx`)

#### Features Implemented:

##### A. Quick Test Scenarios (6 buttons)
- **Disabled + Old** (75 years, disabled) - Always goes to Level 1
- **Elderly** (70 years, non-disabled) - Tests age cutoff logic
- **Middle Aged** (50 years, non-disabled)
- **Young** (25 years, non-disabled) - Goes to less busy Level 2/3
- **Disabled + Young** (35 years, disabled) - Tests disabled priority
- **Very Elderly** (85 years, non-disabled) - Extreme age case

##### B. Advanced Scenarios (4 batch test buttons)
- **Mixed Group** - 5 disabled old + 3 elderly + 7 young
- **Disabled Wave** - 20 disabled elderly arrivals
- **Youth Rush** - 30 young arrivals
- **Senior Group** - 15 elderly (non-disabled)

##### C. Edge Cases (4 buttons)
- **Min Age** (18 years)
- **Max Age** (100 years)
- **Min Age + Disabled** (18 years, disabled)
- **Random** - Random age and disability status

##### D. System Controls
- **Trigger Controller Tick** - Manually run feedback control loop
- **Refresh Metrics** - Fetch latest system metrics
- **Check Health** - Verify system health

##### E. Level State Update Panel
Form to update level states:
- Wait times for Levels 1, 2, 3
- Queue lengths for each level
- Visual feedback on updates

##### F. Configuration Panel
View and edit runtime configuration:
- Alpha1 (target fraction for Level 1)
- Wait Target (minutes)
- Controller Gain
- Sliding Window Duration
- Display of soft gate and randomization settings

##### G. Assignment Display
Latest assignment shows:
- Assigned level with color-coded badge
- Trace ID (first 8 characters)
- Pilgrim details (age, disability status)
- Dynamic age cutoff
- Alpha1 and P(Disabled) values
- Decision reasoning
- Wait estimates for all levels

##### H. Assignment History
- Last 10 assignments displayed
- Shows level, age, status, and reason
- Scrollable list with hover effects

##### I. Comprehensive Metrics Display

**Controller State:**
- Alpha1 (target fraction)
- Age Cutoff (dynamic threshold)
- P(Disabled) (fraction of disabled arrivals)
- Wait Target
- Controller Gain
- Alpha1 Range

**Arrival Counts (Rolling Window):**
- Total arrivals
- Disabled count
- Non-disabled count

**Age Quantiles (Non-Disabled):**
- 50th Percentile (Median)
- 80th Percentile
- 90th Percentile

**Level States:**
- Wait times (color-coded: green ≤ target, yellow ≤ 1.2x target, red > 1.2x target)
- Queue lengths
- Throughput (per minute)

### 4. **Modern, Professional CSS** (`src/components/LoadBalancerSimulation.css`)

#### Design Features:
- **Gradient Backgrounds** - Beautiful gradients for test buttons
- **Color-Coded Levels** - Each level has distinct color scheme
- **Responsive Design** - Mobile-friendly with breakpoints
- **Hover Effects** - Cards lift on hover
- **Smooth Animations** - Fade-in effects for sections
- **Professional Typography** - Clear hierarchy and readability
- **Health Badge** - Visual health status indicator
- **Form Styling** - Modern input fields with focus states
- **Level Cards** - Distinct styling for Level 1, 2, 3
- **Progress Indicators** - Visual wait time status

#### Color Schemes:
- **Level 1**: Purple gradient (667eea → 764ba2)
- **Level 2**: Pink gradient (f093fb → f5576c)
- **Level 3**: Blue gradient (4facfe → 00f2fe)
- **Success**: Green gradient
- **Warning**: Yellow/Orange
- **Error**: Red gradient

## Testing Workflow

### 1. Basic Testing
1. Click **Quick Test Scenarios** buttons to test individual cases
2. Observe the **Latest Assignment** display showing decision details
3. Check **System Metrics** to see controller state

### 2. Scenario Testing
1. Use **Advanced Scenarios** for batch testing
2. Observe how the system adapts to different arrival patterns
3. Check how **Age Cutoff** and **P(Disabled)** change

### 3. Configuration Testing
1. Click **Edit Config** in Configuration panel
2. Modify Alpha1, Wait Target, or Controller Gain
3. Click **Save Configuration**
4. Assign new pilgrims and observe behavior change

### 4. Level State Testing
1. Enter wait times in **Update Level State** panel
2. Click **Update Level State**
3. Trigger **Controller Tick** to see feedback control in action
4. Check if Alpha1 adjusts based on Level 1 wait time

### 5. Edge Case Testing
1. Test with **Min Age** (18) and **Max Age** (100)
2. Test disabled pilgrims at various ages
3. Use **Random** button for stress testing

## Key Features

### ✅ Adaptive System
- Dynamic age cutoff (no fixed thresholds)
- Feedback controller maintains Level 1 target wait time
- Rolling statistics over configurable time window

### ✅ Priority Rules
- Disabled pilgrims always → Level 1
- Elderly (age ≥ cutoff) → Level 1 (if within target)
- Younger pilgrims → Less busy of Level 2/3

### ✅ Real-Time Feedback
- Every assignment shows detailed decision reasoning
- Metrics update automatically after assignments
- Visual indicators for system health

### ✅ Comprehensive Testing
- 14+ test buttons for different scenarios
- Batch assignment capabilities
- Edge case testing
- Configuration tuning
- Level state simulation

### ✅ Professional UI
- Modern gradient design
- Responsive layout
- Smooth animations
- Color-coded levels
- Clear visual hierarchy

## API Integration

### Backend Endpoints Used:
```
POST   /api/LoadBalancer/arrivals/assign
POST   /api/LoadBalancer/levels/state
POST   /api/LoadBalancer/control/tick
GET    /api/LoadBalancer/metrics
GET    /api/LoadBalancer/config
POST   /api/LoadBalancer/config
GET    /api/LoadBalancer/health
```

### Response Handling:
- Full TypeScript type safety
- Error handling with user-friendly messages
- Loading states during API calls
- Auto-refresh of metrics after changes

## Benefits Over Old System

| Old System | New System |
|------------|------------|
| 4 basic test buttons | 14+ comprehensive test buttons |
| Fixed age thresholds | Dynamic adaptive cutoffs |
| Simple utilization display | Rich metrics with quantiles, alpha1, p_disabled |
| No configuration control | Full runtime configuration panel |
| Limited feedback | Detailed decision reasoning for every assignment |
| Basic styling | Modern gradient-based professional UI |
| isHealthy boolean | isDisabled boolean (more accurate) |
| No batch testing | Batch assignment scenarios |
| No edge case testing | Comprehensive edge case buttons |

## Usage

1. **Start Backend**: Ensure the backend API is running (default: http://localhost:5090)
2. **Navigate**: From Dashboard, click "Load Balancer Simulation"
3. **Test**: Use any of the test buttons to simulate arrivals
4. **Configure**: Adjust settings using the Configuration panel
5. **Monitor**: Watch metrics update in real-time
6. **Iterate**: Test different scenarios and configurations

## Technical Details

- **React**: Functional component with hooks
- **TypeScript**: Full type safety
- **State Management**: useState for local state
- **Side Effects**: useEffect for initialization
- **Error Handling**: Try-catch with user-friendly messages
- **Loading States**: Disabled buttons during operations
- **Responsive**: Mobile-friendly grid layouts
- **Performance**: Batched API calls where appropriate

## Files Modified

1. `/workspace/src/constants/api.ts` - Added new endpoints
2. `/workspace/src/utils/api_helpers/loadBalancerApi.ts` - Complete rewrite with new types
3. `/workspace/src/components/LoadBalancerSimulation.tsx` - Complete rewrite
4. `/workspace/src/components/LoadBalancerSimulation.css` - Complete rewrite

## Compilation Status

✅ **TypeScript Compilation**: PASSED (no errors)  
✅ **Linter**: PASSED (no errors)  
✅ **Dependencies**: Installed successfully  

## Next Steps

The frontend is ready to test with the backend! Simply:

1. Start the backend server (e.g., `dotnet run`)
2. Start the frontend dev server (`npm start`)
3. Navigate to Load Balancer Simulation page
4. Start testing the adaptive load balancer system!

---

**Implementation Date**: 2025-10-29  
**Status**: ✅ Complete and Ready for Testing
