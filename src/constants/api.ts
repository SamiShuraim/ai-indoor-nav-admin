// API Configuration Constants
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5090';

// MapTiler Configuration
export const MAPTILER_API_KEY = process.env.REACT_APP_MAPTILER_API_KEY || '';
export const MAPTILER_STYLE_URL = process.env.REACT_APP_MAPTILER_STYLE_URL || 'https://api.maptiler.com/maps/0197febb-3c55-7863-a31f-7d8d1e3df976/style.json';

// API Endpoints
export const API_ENDPOINTS = {
  LOGIN: '/api/Login',
  VALIDATE: '/api/Login/validate',
  DASHBOARD: '/dashboard',
  
  // Buildings
  BUILDINGS: '/api/Building',
  BUILDING_BY_ID: (id: string | number) => `/api/Building/${id}`,
  
  // Floors
  FLOORS: '/api/Floor',
  FLOORS_BY_BUILDING: (buildingId: string | number) => `/api/Floor/building/${buildingId}`,
  FLOOR_BY_ID: (id: string | number) => `/api/Floor/${id}`,
  
  // Beacons
  BEACONS: '/api/Beacon',
  BEACON_BY_ID: (id: string | number) => `/api/Beacon/${id}`,
  BEACONS_BY_FLOOR: (floorId: string | number) => `/api/Beacon/floor/${floorId}`,
  BEACON_BY_UUID: (uuid: string) => `/api/Beacon/uuid/${uuid}`,
  BEACONS_ACTIVE: '/api/Beacon/active',
  BEACONS_LOW_BATTERY: (threshold: number) => `/api/Beacon/low-battery/${threshold}`,
  BEACON_BATTERY: (id: string | number, level: number) => `/api/Beacon/${id}/battery/${level}`,
  BEACON_HEARTBEAT: (id: string | number) => `/api/Beacon/${id}/heartbeat`,
  
  // Beacon Types
  BEACON_TYPES: '/api/BeaconType',
  BEACON_TYPE_BY_ID: (id: string | number) => `/api/BeaconType/${id}`,
  BEACON_TYPE_BY_NAME: (name: string) => `/api/BeaconType/name/${name}`,
  
  // POIs
  POIS: '/api/Poi',
  POI_BY_ID: (id: string | number) => `/api/Poi/${id}`,
  POIS_BY_FLOOR: (floorId: string | number) => `/api/Poi/floor/${floorId}`,
  
  // POI Categories
  POI_CATEGORIES: '/api/PoiCategory',
  POI_CATEGORY_BY_ID: (id: string | number) => `/api/PoiCategory/${id}`,
  POI_CATEGORY_BY_NAME: (name: string) => `/api/PoiCategory/name/${name}`,
  
  // POI Points
  POI_POINTS: '/api/PoiPoint',
  POI_POINT_BY_ID: (id: string | number) => `/api/PoiPoint/${id}`,
  POI_POINTS_BY_POI: (poiId: string | number) => `/api/PoiPoint/poi/${poiId}`,
  POI_POINTS_BULK: '/api/PoiPoint/bulk',
  
  // Route Nodes
  ROUTE_NODES: '/api/RouteNode',
  ROUTE_NODE_BY_ID: (id: string | number) => `/api/RouteNode/${id}`,
  ROUTE_NODES_BY_FLOOR: (floorId: string | number) => `/api/RouteNode/floor/${floorId}`,
  ROUTE_NODES_BY_TYPE: (nodeType: string) => `/api/RouteNode/type/${nodeType}`,
  
  // Route Edges
  ROUTE_EDGES: '/api/RouteEdge',
  ROUTE_EDGE_BY_ID: (id: string | number) => `/api/RouteEdge/${id}`,
  ROUTE_EDGES_BY_FLOOR: (floorId: string | number) => `/api/RouteEdge/floor/${floorId}`,
  ROUTE_EDGES_BY_TYPE: (edgeType: string) => `/api/RouteEdge/type/${edgeType}`,
  ROUTE_EDGES_BY_NODE: (nodeId: string | number) => `/api/RouteEdge/node/${nodeId}`,
  
  // Walls
  WALLS: '/api/Wall',
  WALL_BY_ID: (id: string | number) => `/api/Wall/${id}`,
  WALLS_BY_FLOOR: (floorId: string | number) => `/api/Wall/floor/${floorId}`,
  WALLS_BY_TYPE: (wallType: string) => `/api/Wall/type/${wallType}`,
  
  // Wall Points
  WALL_POINTS: '/api/WallPoint',
  WALL_POINT_BY_ID: (id: string | number) => `/api/WallPoint/${id}`,
  WALL_POINTS_BY_WALL: (wallId: string | number) => `/api/WallPoint/wall/${wallId}`,
  WALL_POINTS_BULK: '/api/WallPoint/bulk',
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  JWT_TOKEN: 'jwtToken',
} as const;

// Request Headers
export const REQUEST_HEADERS = {
  CONTENT_TYPE: 'Content-Type',
  CONTENT_TYPE_JSON: 'application/json',
  AUTHORIZATION: 'Authorization',
} as const; 