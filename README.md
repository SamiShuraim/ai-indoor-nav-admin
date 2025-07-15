# AI Indoor Navigation Admin Portal

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure MapTiler API Key
1. Sign up for a free account at [MapTiler](https://www.maptiler.com/)
2. Get your API key from the dashboard
3. Open `src/constants/api.ts`
4. Replace `YOUR_MAPTILER_API_KEY_HERE` with your actual API key

### 3. Run the Application
```bash
npm start
```

## Features

- **Buildings Management**: Create, view, and manage building information
- **Floor Editor**: Interactive map-based floor planning with real coordinate system
  - Real-time coordinate display (longitude/latitude)
  - Add POIs, beacons, and navigation nodes directly on the map
  - User location detection and zoom
  - Interactive markers with popups
- **Authentication**: Secure login system
- **Responsive Design**: Works on desktop and mobile devices

## Floor Editor

The Floor Editor now uses real MapTiler maps with the following features:

- **Real Geographic Coordinates**: All items are placed using actual longitude/latitude coordinates
- **Live Coordinate Display**: See the exact coordinates as you move your mouse
- **Map Tools**:
  - Select: Choose and manage existing items
  - Pan: Navigate around the map (built into MapTiler)
  - POI/Walls: Click to add points of interest or walls
  - Beacons: Click to add beacon markers
  - Nodes: Click to add navigation route nodes
- **User Location**: Automatically detects and centers on your current location
- **Interactive Markers**: Click markers to see information in popups
- **Layer Management**: Toggle visibility of different item types

## Technology Stack

- React with TypeScript
- MapTiler SDK for interactive maps
- Custom component library
- Comprehensive logging system

## Project Structure

```
src/
├── components/          # Reusable UI components
├── constants/          # App constants and configuration
├── utils/             # Utility functions and API helpers
└── types/             # TypeScript type definitions
```
