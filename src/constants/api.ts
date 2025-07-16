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
  
  // Floor Layout Data
  POIS: '/api/Poi',
  POI_BY_ID: (id: string | number) => `/api/Poi/${id}`,
  NODES: '/api/Node',
  NODE_BY_ID: (id: string | number) => `/api/Node/${id}`,
  EDGES: '/api/Edge',
  EDGE_BY_ID: (id: string | number) => `/api/Edge/${id}`,
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