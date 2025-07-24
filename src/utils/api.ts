import { API_BASE_URL, API_ENDPOINTS, REQUEST_HEADERS, STORAGE_KEYS } from '../constants/api';
import { createLogger } from './logger';

const logger = createLogger('API');

// Type definitions
export interface Building {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Floor {
  id: number;
  name: string;
  floorNumber: number;
  buildingId: number;
  building?: Building;
  nodes?: NavigationNode[];
  pois?: POI[];
}

// Beacon Types
export interface BeaconType {
  id: number;
  name: string;
  description?: string;
  transmissionPower?: number;
  batteryLife?: number;
  rangeMeters?: number;
  createdAt: string;
  updatedAt: string;
}

// Beacons
export interface Beacon {
  id: number;
  floorId: number;
  beaconTypeId?: number;
  beaconType?: BeaconType;
  name: string;
  uuid?: string;
  majorId?: number;
  minorId?: number;
  x: number;
  y: number;
  z?: number;
  isActive: boolean;
  isVisible: boolean;
  batteryLevel?: number;
  lastSeen?: string;
  installationDate?: string;
  createdAt: string;
  updatedAt: string;
}

// POI Categories
export interface PoiCategory {
  id: number;
  name: string;
  color?: string;
  icon?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// POIs
export interface POI {
  id: number;
  floorId: number;
  categoryId?: number;
  category?: PoiCategory;
  name: string;
  description?: string;
  poiType?: string;
  color?: string;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

// POI Points
export interface PoiPoint {
  id: number;
  poiId: number;
  x: number;
  y: number;
  pointOrder: number;
  createdAt: string;
}

// Route Nodes
export interface RouteNode {
  id: number;
  floorId: number;
  x: number;
  y: number;
  nodeType?: string;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

// Route Edges
export interface RouteEdge {
  id: number;
  floorId: number;
  fromNodeId: number;
  toNodeId: number;
  weight?: number;
  edgeType?: string;
  isBidirectional?: boolean;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

// Walls
export interface Wall {
  id: number;
  floorId: number;
  name?: string;
  wallType?: string;
  height?: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

// Wall Points
export interface WallPoint {
  id: number;
  wallId: number;
  x: number;
  y: number;
  pointOrder: number;
  createdAt: string;
}

// Legacy interfaces for backward compatibility
export interface NavigationNode {
  id: number;
  floorId: number;
  x: number;
  y: number;
  type: string;
}

export interface NavigationEdge {
  id: number;
  floorId: number;
  fromNodeId: number;
  toNodeId: number;
  weight?: number;
}

export interface FloorLayoutData {
  pois: POI[];
  nodes: NavigationNode[];
  edges: NavigationEdge[];
}

// Helper function to get auth headers
const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem(STORAGE_KEYS.JWT_TOKEN);
  return {
    [REQUEST_HEADERS.CONTENT_TYPE]: REQUEST_HEADERS.CONTENT_TYPE_JSON,
    ...(token && { [REQUEST_HEADERS.AUTHORIZATION]: `Bearer ${token}` }),
  };
};

// Generic API request function
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const method = options.method || 'GET';
  const hasBody = !!options.body;
  const bodyContent = hasBody ? options.body : null;
  
  logger.debug('Making API request', { 
    url, 
    method, 
    hasBody, 
    bodyLength: bodyContent ? bodyContent.toString().length : 0,
    headers: options.headers ? Object.keys(options.headers) : []
  });

  try {
    const startTime = performance.now();
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
    });
    
    const duration = performance.now() - startTime;
    logger.debug('API response received', { 
      url, 
      method,
      status: response.status, 
      statusText: response.statusText,
      duration: `${duration.toFixed(2)}ms`,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('API request failed', new Error(`${response.status}: ${errorText}`), {
        url,
        method,
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText,
        requestBody: bodyContent?.toString(),
        duration: `${duration.toFixed(2)}ms`
      });
      throw new Error(`Request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    logger.debug('API request successful', { 
      url, 
      method,
      status: response.status,
      dataType: Array.isArray(data) ? 'array' : typeof data,
      dataLength: Array.isArray(data) ? data.length : 'N/A',
      duration: `${duration.toFixed(2)}ms`
    });
    return data;
  } catch (error) {
    logger.error('API request error', error as Error, {
      url,
      method,
      errorType: (error as Error).constructor.name,
      errorMessage: (error as Error).message,
      requestBody: bodyContent?.toString()
    });
    throw error;
  }
};

// Building API functions
export const buildingsApi = {
  getAll: (): Promise<Building[]> => {
    logger.info('Fetching all buildings');
    return apiRequest<Building[]>(API_ENDPOINTS.BUILDINGS);
  },

  getById: (id: string | number): Promise<Building> => {
    logger.info('Fetching building by ID', { buildingId: id });
    return apiRequest<Building>(API_ENDPOINTS.BUILDING_BY_ID(id));
  },

  create: (building: Omit<Building, 'id' | 'createdAt' | 'updatedAt'>): Promise<Building> => {
    logger.info('Creating new building', { building });
    return apiRequest<Building>(API_ENDPOINTS.BUILDINGS, {
      method: 'POST',
      body: JSON.stringify(building),
    });
  },

  update: (id: string | number, building: Partial<Omit<Building, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Building> => {
    logger.info('Updating building', { buildingId: id, updates: building });
    return apiRequest<Building>(API_ENDPOINTS.BUILDING_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(building),
    });
  },

  delete: (id: string | number): Promise<void> => {
    logger.info('Deleting building', { buildingId: id });
    return apiRequest<void>(API_ENDPOINTS.BUILDING_BY_ID(id), {
      method: 'DELETE',
    });
  },
};

// Floor API functions
export const floorsApi = {
  getAll: (): Promise<Floor[]> => {
    logger.info('Fetching all floors');
    return apiRequest<Floor[]>(API_ENDPOINTS.FLOORS);
  },

  getByBuilding: (buildingId: string | number): Promise<Floor[]> => {
    const numericBuildingId = typeof buildingId === 'string' ? parseInt(buildingId, 10) : buildingId;
    logger.info('Fetching floors for building', { 
      originalBuildingId: buildingId, 
      originalType: typeof buildingId,
      numericBuildingId,
      numericType: typeof numericBuildingId,
      isValidNumber: !isNaN(numericBuildingId)
    });
    
    if (isNaN(numericBuildingId)) {
      throw new Error(`Invalid building ID: ${buildingId} cannot be converted to a number`);
    }
    
    return apiRequest<Floor[]>(API_ENDPOINTS.FLOORS_BY_BUILDING(numericBuildingId));
  },

  getById: (id: string | number): Promise<Floor> => {
    logger.info('Fetching floor by ID', { floorId: id });
    return apiRequest<Floor>(API_ENDPOINTS.FLOOR_BY_ID(id));
  },

  create: (floor: Omit<Floor, 'id' | 'createdAt' | 'updatedAt'>): Promise<Floor> => {
    logger.info('Creating new floor', { floor });
    return apiRequest<Floor>(API_ENDPOINTS.FLOORS, {
      method: 'POST',
      body: JSON.stringify(floor),
    });
  },

  update: (id: string | number, floor: Partial<Omit<Floor, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Floor> => {
    logger.info('Updating floor', { floorId: id, updates: floor });
    return apiRequest<Floor>(API_ENDPOINTS.FLOOR_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(floor),
    });
  },

  delete: (id: string | number): Promise<void> => {
    logger.info('Deleting floor', { floorId: id });
    return apiRequest<void>(API_ENDPOINTS.FLOOR_BY_ID(id), {
      method: 'DELETE',
    });
  },
};

// Beacon Type API functions
export const beaconTypesApi = {
  getAll: (): Promise<BeaconType[]> => {
    logger.info('Fetching all beacon types');
    return apiRequest<BeaconType[]>(API_ENDPOINTS.BEACON_TYPES);
  },

  getById: (id: string | number): Promise<BeaconType> => {
    logger.info('Fetching beacon type by ID', { beaconTypeId: id });
    return apiRequest<BeaconType>(API_ENDPOINTS.BEACON_TYPE_BY_ID(id));
  },

  getByName: (name: string): Promise<BeaconType> => {
    logger.info('Fetching beacon type by name', { name });
    return apiRequest<BeaconType>(API_ENDPOINTS.BEACON_TYPE_BY_NAME(name));
  },

  create: (beaconType: Omit<BeaconType, 'id' | 'createdAt' | 'updatedAt'>): Promise<BeaconType> => {
    logger.info('Creating new beacon type', { beaconType });
    return apiRequest<BeaconType>(API_ENDPOINTS.BEACON_TYPES, {
      method: 'POST',
      body: JSON.stringify(beaconType),
    });
  },

  update: (id: string | number, beaconType: Partial<Omit<BeaconType, 'id' | 'createdAt' | 'updatedAt'>>): Promise<BeaconType> => {
    logger.info('Updating beacon type', { beaconTypeId: id, updates: beaconType });
    return apiRequest<BeaconType>(API_ENDPOINTS.BEACON_TYPE_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(beaconType),
    });
  },

  delete: (id: string | number): Promise<void> => {
    logger.info('Deleting beacon type', { beaconTypeId: id });
    return apiRequest<void>(API_ENDPOINTS.BEACON_TYPE_BY_ID(id), {
      method: 'DELETE',
    });
  },
};

// Beacon API functions
export const beaconsApi = {
  getAll: (): Promise<Beacon[]> => {
    logger.info('Fetching all beacons');
    return apiRequest<Beacon[]>(API_ENDPOINTS.BEACONS);
  },

  getById: (id: string | number): Promise<Beacon> => {
    logger.info('Fetching beacon by ID', { beaconId: id });
    return apiRequest<Beacon>(API_ENDPOINTS.BEACON_BY_ID(id));
  },

  getByFloor: (floorId: string | number): Promise<Beacon[]> => {
    logger.info('Fetching beacons for floor', { floorId });
    return apiRequest<Beacon[]>(API_ENDPOINTS.BEACONS_BY_FLOOR(floorId));
  },

  getByUuid: (uuid: string): Promise<Beacon> => {
    logger.info('Fetching beacon by UUID', { uuid });
    return apiRequest<Beacon>(API_ENDPOINTS.BEACON_BY_UUID(uuid));
  },

  getActive: (): Promise<Beacon[]> => {
    logger.info('Fetching active beacons');
    return apiRequest<Beacon[]>(API_ENDPOINTS.BEACONS_ACTIVE);
  },

  getLowBattery: (threshold: number): Promise<Beacon[]> => {
    logger.info('Fetching beacons with low battery', { threshold });
    return apiRequest<Beacon[]>(API_ENDPOINTS.BEACONS_LOW_BATTERY(threshold));
  },

  create: (beacon: Omit<Beacon, 'id' | 'createdAt' | 'updatedAt'>): Promise<Beacon> => {
    logger.info('Creating new beacon', { beacon });
    return apiRequest<Beacon>(API_ENDPOINTS.BEACONS, {
      method: 'POST',
      body: JSON.stringify(beacon),
    });
  },

  update: (id: string | number, beacon: Partial<Omit<Beacon, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Beacon> => {
    logger.info('Updating beacon', { beaconId: id, updates: beacon });
    return apiRequest<Beacon>(API_ENDPOINTS.BEACON_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(beacon),
    });
  },

  delete: (id: string | number): Promise<void> => {
    logger.info('Deleting beacon', { beaconId: id });
    return apiRequest<void>(API_ENDPOINTS.BEACON_BY_ID(id), {
      method: 'DELETE',
    });
  },

  updateBattery: (id: string | number, level: number): Promise<Beacon> => {
    logger.info('Updating beacon battery level', { beaconId: id, level });
    return apiRequest<Beacon>(API_ENDPOINTS.BEACON_BATTERY(id, level), {
      method: 'PUT',
    });
  },

  heartbeat: (id: string | number): Promise<Beacon> => {
    logger.info('Sending beacon heartbeat', { beaconId: id });
    return apiRequest<Beacon>(API_ENDPOINTS.BEACON_HEARTBEAT(id), {
      method: 'PUT',
    });
  },
};

// POI Category API functions
export const poiCategoriesApi = {
  getAll: (): Promise<PoiCategory[]> => {
    logger.info('Fetching all POI categories');
    return apiRequest<PoiCategory[]>(API_ENDPOINTS.POI_CATEGORIES);
  },

  getById: (id: string | number): Promise<PoiCategory> => {
    logger.info('Fetching POI category by ID', { categoryId: id });
    return apiRequest<PoiCategory>(API_ENDPOINTS.POI_CATEGORY_BY_ID(id));
  },

  getByName: (name: string): Promise<PoiCategory> => {
    logger.info('Fetching POI category by name', { name });
    return apiRequest<PoiCategory>(API_ENDPOINTS.POI_CATEGORY_BY_NAME(name));
  },

  create: (category: Omit<PoiCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<PoiCategory> => {
    logger.info('Creating new POI category', { category });
    return apiRequest<PoiCategory>(API_ENDPOINTS.POI_CATEGORIES, {
      method: 'POST',
      body: JSON.stringify(category),
    });
  },

  update: (id: string | number, category: Partial<Omit<PoiCategory, 'id' | 'createdAt' | 'updatedAt'>>): Promise<PoiCategory> => {
    logger.info('Updating POI category', { categoryId: id, updates: category });
    return apiRequest<PoiCategory>(API_ENDPOINTS.POI_CATEGORY_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(category),
    });
  },

  delete: (id: string | number): Promise<void> => {
    logger.info('Deleting POI category', { categoryId: id });
    return apiRequest<void>(API_ENDPOINTS.POI_CATEGORY_BY_ID(id), {
      method: 'DELETE',
    });
  },
};

// POI API functions
export const poisApi = {
  getAll: (): Promise<POI[]> => {
    logger.info('Fetching all POIs');
    return apiRequest<POI[]>(API_ENDPOINTS.POIS);
  },

  getById: (id: string | number): Promise<POI> => {
    logger.info('Fetching POI by ID', { poiId: id });
    return apiRequest<POI>(API_ENDPOINTS.POI_BY_ID(id));
  },

  getByFloor: (floorId: string | number): Promise<POI[]> => {
    logger.info('Fetching POIs for floor', { floorId });
    return apiRequest<POI[]>(API_ENDPOINTS.POIS_BY_FLOOR(floorId));
  },

  create: (poi: Omit<POI, 'id' | 'createdAt' | 'updatedAt'>): Promise<POI> => {
    logger.info('Creating new POI', { poi });
    return apiRequest<POI>(API_ENDPOINTS.POIS, {
      method: 'POST',
      body: JSON.stringify(poi),
    });
  },

  update: (id: string | number, poi: Partial<Omit<POI, 'id' | 'createdAt' | 'updatedAt'>>): Promise<POI> => {
    logger.info('Updating POI', { poiId: id, updates: poi });
    return apiRequest<POI>(API_ENDPOINTS.POI_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(poi),
    });
  },

  delete: (id: string | number): Promise<void> => {
    logger.info('Deleting POI', { poiId: id });
    return apiRequest<void>(API_ENDPOINTS.POI_BY_ID(id), {
      method: 'DELETE',
    });
  },
};

// POI Point API functions
export const poiPointsApi = {
  getAll: (): Promise<PoiPoint[]> => {
    logger.info('Fetching all POI points');
    return apiRequest<PoiPoint[]>(API_ENDPOINTS.POI_POINTS);
  },

  getById: (id: string | number): Promise<PoiPoint> => {
    logger.info('Fetching POI point by ID', { pointId: id });
    return apiRequest<PoiPoint>(API_ENDPOINTS.POI_POINT_BY_ID(id));
  },

  getByPoi: (poiId: string | number): Promise<PoiPoint[]> => {
    logger.info('Fetching POI points for POI', { poiId });
    return apiRequest<PoiPoint[]>(API_ENDPOINTS.POI_POINTS_BY_POI(poiId));
  },

  create: (point: Omit<PoiPoint, 'id' | 'createdAt'>): Promise<PoiPoint> => {
    logger.info('Creating new POI point', { point });
    return apiRequest<PoiPoint>(API_ENDPOINTS.POI_POINTS, {
      method: 'POST',
      body: JSON.stringify(point),
    });
  },

  createBulk: (points: Omit<PoiPoint, 'id' | 'createdAt'>[]): Promise<PoiPoint[]> => {
    logger.info('Creating POI points in bulk', { count: points.length });
    return apiRequest<PoiPoint[]>(API_ENDPOINTS.POI_POINTS_BULK, {
      method: 'POST',
      body: JSON.stringify(points),
    });
  },

  update: (id: string | number, point: Partial<Omit<PoiPoint, 'id' | 'createdAt'>>): Promise<PoiPoint> => {
    logger.info('Updating POI point', { pointId: id, updates: point });
    return apiRequest<PoiPoint>(API_ENDPOINTS.POI_POINT_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(point),
    });
  },

  delete: (id: string | number): Promise<void> => {
    logger.info('Deleting POI point', { pointId: id });
    return apiRequest<void>(API_ENDPOINTS.POI_POINT_BY_ID(id), {
      method: 'DELETE',
    });
  },

  deleteByPoi: (poiId: string | number): Promise<void> => {
    logger.info('Deleting all POI points for POI', { poiId });
    return apiRequest<void>(API_ENDPOINTS.POI_POINTS_BY_POI(poiId), {
      method: 'DELETE',
    });
  },
};

// Route Node API functions
export const routeNodesApi = {
  getAll: (): Promise<RouteNode[]> => {
    logger.info('Fetching all route nodes');
    return apiRequest<RouteNode[]>(API_ENDPOINTS.ROUTE_NODES);
  },

  getById: (id: string | number): Promise<RouteNode> => {
    logger.info('Fetching route node by ID', { nodeId: id });
    return apiRequest<RouteNode>(API_ENDPOINTS.ROUTE_NODE_BY_ID(id));
  },

  getByFloor: (floorId: string | number): Promise<RouteNode[]> => {
    logger.info('Fetching route nodes for floor', { floorId });
    return apiRequest<RouteNode[]>(API_ENDPOINTS.ROUTE_NODES_BY_FLOOR(floorId));
  },

  getByType: (nodeType: string): Promise<RouteNode[]> => {
    logger.info('Fetching route nodes by type', { nodeType });
    return apiRequest<RouteNode[]>(API_ENDPOINTS.ROUTE_NODES_BY_TYPE(nodeType));
  },

  create: (node: Omit<RouteNode, 'id' | 'createdAt' | 'updatedAt'>): Promise<RouteNode> => {
    logger.info('Creating new route node', { node });
    return apiRequest<RouteNode>(API_ENDPOINTS.ROUTE_NODES, {
      method: 'POST',
      body: JSON.stringify(node),
    });
  },

  update: (id: string | number, node: Partial<Omit<RouteNode, 'id' | 'createdAt' | 'updatedAt'>>): Promise<RouteNode> => {
    logger.info('Updating route node', { nodeId: id, updates: node });
    return apiRequest<RouteNode>(API_ENDPOINTS.ROUTE_NODE_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(node),
    });
  },

  delete: (id: string | number): Promise<void> => {
    logger.info('Deleting route node', { nodeId: id });
    return apiRequest<void>(API_ENDPOINTS.ROUTE_NODE_BY_ID(id), {
      method: 'DELETE',
    });
  },
};

// Route Edge API functions
export const routeEdgesApi = {
  getAll: (): Promise<RouteEdge[]> => {
    logger.info('Fetching all route edges');
    return apiRequest<RouteEdge[]>(API_ENDPOINTS.ROUTE_EDGES);
  },

  getById: (id: string | number): Promise<RouteEdge> => {
    logger.info('Fetching route edge by ID', { edgeId: id });
    return apiRequest<RouteEdge>(API_ENDPOINTS.ROUTE_EDGE_BY_ID(id));
  },

  getByFloor: (floorId: string | number): Promise<RouteEdge[]> => {
    logger.info('Fetching route edges for floor', { floorId });
    return apiRequest<RouteEdge[]>(API_ENDPOINTS.ROUTE_EDGES_BY_FLOOR(floorId));
  },

  getByType: (edgeType: string): Promise<RouteEdge[]> => {
    logger.info('Fetching route edges by type', { edgeType });
    return apiRequest<RouteEdge[]>(API_ENDPOINTS.ROUTE_EDGES_BY_TYPE(edgeType));
  },

  getByNode: (nodeId: string | number): Promise<RouteEdge[]> => {
    logger.info('Fetching route edges for node', { nodeId });
    return apiRequest<RouteEdge[]>(API_ENDPOINTS.ROUTE_EDGES_BY_NODE(nodeId));
  },

  create: (edge: Omit<RouteEdge, 'id' | 'createdAt' | 'updatedAt'>): Promise<RouteEdge> => {
    logger.info('Creating new route edge', { edge });
    return apiRequest<RouteEdge>(API_ENDPOINTS.ROUTE_EDGES, {
      method: 'POST',
      body: JSON.stringify(edge),
    });
  },

  update: (id: string | number, edge: Partial<Omit<RouteEdge, 'id' | 'createdAt' | 'updatedAt'>>): Promise<RouteEdge> => {
    logger.info('Updating route edge', { edgeId: id, updates: edge });
    return apiRequest<RouteEdge>(API_ENDPOINTS.ROUTE_EDGE_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(edge),
    });
  },

  delete: (id: string | number): Promise<void> => {
    logger.info('Deleting route edge', { edgeId: id });
    return apiRequest<void>(API_ENDPOINTS.ROUTE_EDGE_BY_ID(id), {
      method: 'DELETE',
    });
  },
};

// Wall API functions
export const wallsApi = {
  getAll: (): Promise<Wall[]> => {
    logger.info('Fetching all walls');
    return apiRequest<Wall[]>(API_ENDPOINTS.WALLS);
  },

  getById: (id: string | number): Promise<Wall> => {
    logger.info('Fetching wall by ID', { wallId: id });
    return apiRequest<Wall>(API_ENDPOINTS.WALL_BY_ID(id));
  },

  getByFloor: (floorId: string | number): Promise<Wall[]> => {
    logger.info('Fetching walls for floor', { floorId });
    return apiRequest<Wall[]>(API_ENDPOINTS.WALLS_BY_FLOOR(floorId));
  },

  getByType: (wallType: string): Promise<Wall[]> => {
    logger.info('Fetching walls by type', { wallType });
    return apiRequest<Wall[]>(API_ENDPOINTS.WALLS_BY_TYPE(wallType));
  },

  create: (wall: Omit<Wall, 'id' | 'createdAt' | 'updatedAt'>): Promise<Wall> => {
    logger.info('Creating new wall', { wall });
    return apiRequest<Wall>(API_ENDPOINTS.WALLS, {
      method: 'POST',
      body: JSON.stringify(wall),
    });
  },

  update: (id: string | number, wall: Partial<Omit<Wall, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Wall> => {
    logger.info('Updating wall', { wallId: id, updates: wall });
    return apiRequest<Wall>(API_ENDPOINTS.WALL_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(wall),
    });
  },

  delete: (id: string | number): Promise<void> => {
    logger.info('Deleting wall', { wallId: id });
    return apiRequest<void>(API_ENDPOINTS.WALL_BY_ID(id), {
      method: 'DELETE',
    });
  },
};

// Wall Point API functions
export const wallPointsApi = {
  getAll: (): Promise<WallPoint[]> => {
    logger.info('Fetching all wall points');
    return apiRequest<WallPoint[]>(API_ENDPOINTS.WALL_POINTS);
  },

  getById: (id: string | number): Promise<WallPoint> => {
    logger.info('Fetching wall point by ID', { pointId: id });
    return apiRequest<WallPoint>(API_ENDPOINTS.WALL_POINT_BY_ID(id));
  },

  getByWall: (wallId: string | number): Promise<WallPoint[]> => {
    logger.info('Fetching wall points for wall', { wallId });
    return apiRequest<WallPoint[]>(API_ENDPOINTS.WALL_POINTS_BY_WALL(wallId));
  },

  create: (point: Omit<WallPoint, 'id' | 'createdAt'>): Promise<WallPoint> => {
    logger.info('Creating new wall point', { point });
    return apiRequest<WallPoint>(API_ENDPOINTS.WALL_POINTS, {
      method: 'POST',
      body: JSON.stringify(point),
    });
  },

  createBulk: (points: Omit<WallPoint, 'id' | 'createdAt'>[]): Promise<WallPoint[]> => {
    logger.info('Creating wall points in bulk', { count: points.length });
    return apiRequest<WallPoint[]>(API_ENDPOINTS.WALL_POINTS_BULK, {
      method: 'POST',
      body: JSON.stringify(points),
    });
  },

  update: (id: string | number, point: Partial<Omit<WallPoint, 'id' | 'createdAt'>>): Promise<WallPoint> => {
    logger.info('Updating wall point', { pointId: id, updates: point });
    return apiRequest<WallPoint>(API_ENDPOINTS.WALL_POINT_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(point),
    });
  },

  delete: (id: string | number): Promise<void> => {
    logger.info('Deleting wall point', { pointId: id });
    return apiRequest<void>(API_ENDPOINTS.WALL_POINT_BY_ID(id), {
      method: 'DELETE',
    });
  },

  deleteByWall: (wallId: string | number): Promise<void> => {
    logger.info('Deleting all wall points for wall', { wallId });
    return apiRequest<void>(API_ENDPOINTS.WALL_POINTS_BY_WALL(wallId), {
      method: 'DELETE',
    });
  },
};

// Export all API functions
export const api = {
  buildings: buildingsApi,
  floors: floorsApi,
  beaconTypes: beaconTypesApi,
  beacons: beaconsApi,
  poiCategories: poiCategoriesApi,
  pois: poisApi,
  poiPoints: poiPointsApi,
  routeNodes: routeNodesApi,
  routeEdges: routeEdgesApi,
  walls: wallsApi,
  wallPoints: wallPointsApi,
}; 