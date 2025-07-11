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

export interface POI {
  id: number;
  floorId: number;
  name: string;
  x: number;
  y: number;
  type: string;
  description?: string;
}

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

// POI API functions
export const poisApi = {
  getAll: (): Promise<POI[]> => {
    logger.info('Fetching all POIs');
    return apiRequest<POI[]>(API_ENDPOINTS.POIS);
  },

  getByFloor: async (floorId: string | number): Promise<POI[]> => {
    const numericFloorId = typeof floorId === 'string' ? parseInt(floorId, 10) : floorId;
    logger.info('Fetching POIs for floor', { floorId, numericFloorId });
    const allPOIs = await apiRequest<POI[]>(API_ENDPOINTS.POIS);
    const floorPOIs = allPOIs.filter(poi => poi.floorId === numericFloorId);
    logger.info('Filtered POIs for floor', { floorId: numericFloorId, count: floorPOIs.length });
    return floorPOIs;
  },

  getById: (id: string): Promise<POI> => {
    logger.info('Fetching POI by ID', { poiId: id });
    return apiRequest<POI>(API_ENDPOINTS.POI_BY_ID(id));
  },

  create: (poi: Omit<POI, 'id'>): Promise<POI> => {
    logger.info('Creating new POI', { poi });
    return apiRequest<POI>(API_ENDPOINTS.POIS, {
      method: 'POST',
      body: JSON.stringify(poi),
    });
  },

  update: (id: string, poi: Partial<Omit<POI, 'id'>>): Promise<POI> => {
    logger.info('Updating POI', { poiId: id, updates: poi });
    return apiRequest<POI>(API_ENDPOINTS.POI_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(poi),
    });
  },

  delete: (id: string): Promise<void> => {
    logger.info('Deleting POI', { poiId: id });
    return apiRequest<void>(API_ENDPOINTS.POI_BY_ID(id), {
      method: 'DELETE',
    });
  },
};

// Node API functions
export const nodesApi = {
  getAll: (): Promise<NavigationNode[]> => {
    logger.info('Fetching all navigation nodes');
    return apiRequest<NavigationNode[]>(API_ENDPOINTS.NODES);
  },

  getByFloor: async (floorId: string | number): Promise<NavigationNode[]> => {
    const numericFloorId = typeof floorId === 'string' ? parseInt(floorId, 10) : floorId;
    logger.info('Fetching navigation nodes for floor', { floorId, numericFloorId });
    const allNodes = await apiRequest<NavigationNode[]>(API_ENDPOINTS.NODES);
    const floorNodes = allNodes.filter(node => node.floorId === numericFloorId);
    logger.info('Filtered navigation nodes for floor', { floorId: numericFloorId, count: floorNodes.length });
    return floorNodes;
  },

  getById: (id: string): Promise<NavigationNode> => {
    logger.info('Fetching navigation node by ID', { nodeId: id });
    return apiRequest<NavigationNode>(API_ENDPOINTS.NODE_BY_ID(id));
  },

  create: (node: Omit<NavigationNode, 'id'>): Promise<NavigationNode> => {
    logger.info('Creating new navigation node', { node });
    return apiRequest<NavigationNode>(API_ENDPOINTS.NODES, {
      method: 'POST',
      body: JSON.stringify(node),
    });
  },

  update: (id: string, node: Partial<Omit<NavigationNode, 'id'>>): Promise<NavigationNode> => {
    logger.info('Updating navigation node', { nodeId: id, updates: node });
    return apiRequest<NavigationNode>(API_ENDPOINTS.NODE_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(node),
    });
  },

  delete: (id: string): Promise<void> => {
    logger.info('Deleting navigation node', { nodeId: id });
    return apiRequest<void>(API_ENDPOINTS.NODE_BY_ID(id), {
      method: 'DELETE',
    });
  },
};

// Edge API functions
export const edgesApi = {
  getAll: (): Promise<NavigationEdge[]> => {
    logger.info('Fetching all navigation edges');
    return apiRequest<NavigationEdge[]>(API_ENDPOINTS.EDGES);
  },

  getByFloor: async (floorId: string | number): Promise<NavigationEdge[]> => {
    const numericFloorId = typeof floorId === 'string' ? parseInt(floorId, 10) : floorId;
    logger.info('Fetching navigation edges for floor', { floorId, numericFloorId });
    const allEdges = await apiRequest<NavigationEdge[]>(API_ENDPOINTS.EDGES);
    const floorEdges = allEdges.filter(edge => edge.floorId === numericFloorId);
    logger.info('Filtered navigation edges for floor', { floorId: numericFloorId, count: floorEdges.length });
    return floorEdges;
  },

  getById: (id: string): Promise<NavigationEdge> => {
    logger.info('Fetching navigation edge by ID', { edgeId: id });
    return apiRequest<NavigationEdge>(API_ENDPOINTS.EDGE_BY_ID(id));
  },

  create: (edge: Omit<NavigationEdge, 'id'>): Promise<NavigationEdge> => {
    logger.info('Creating new navigation edge', { edge });
    return apiRequest<NavigationEdge>(API_ENDPOINTS.EDGES, {
      method: 'POST',
      body: JSON.stringify(edge),
    });
  },

  update: (id: string, edge: Partial<Omit<NavigationEdge, 'id'>>): Promise<NavigationEdge> => {
    logger.info('Updating navigation edge', { edgeId: id, updates: edge });
    return apiRequest<NavigationEdge>(API_ENDPOINTS.EDGE_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(edge),
    });
  },

  delete: (id: string): Promise<void> => {
    logger.info('Deleting navigation edge', { edgeId: id });
    return apiRequest<void>(API_ENDPOINTS.EDGE_BY_ID(id), {
      method: 'DELETE',
    });
  },
};

// Floor layout data API functions
export const floorLayoutApi = {
  getFloorData: async (floorId: string | number): Promise<FloorLayoutData> => {
    const numericFloorId = typeof floorId === 'string' ? parseInt(floorId, 10) : floorId;
    logger.info('Fetching complete floor layout data', { 
      originalFloorId: floorId,
      numericFloorId,
      isValidNumber: !isNaN(numericFloorId)
    });
    
    if (isNaN(numericFloorId)) {
      throw new Error(`Invalid floor ID: ${floorId} cannot be converted to a number`);
    }
    
    const [pois, nodes, edges] = await Promise.all([
      poisApi.getByFloor(numericFloorId),
      nodesApi.getByFloor(numericFloorId),
      edgesApi.getByFloor(numericFloorId),
    ]);

    return { pois, nodes, edges };
  },

  getPOIs: (floorId: string | number): Promise<POI[]> => {
    return poisApi.getByFloor(floorId);
  },

  getNodes: (floorId: string | number): Promise<NavigationNode[]> => {
    return nodesApi.getByFloor(floorId);
  },

  getEdges: (floorId: string | number): Promise<NavigationEdge[]> => {
    return edgesApi.getByFloor(floorId);
  },
}; 