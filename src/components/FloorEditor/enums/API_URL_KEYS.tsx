// API URL keys
import {beaconsApi, poisApi, routeEdgesApi, routeNodesApi, wallsApi} from "../../../utils/api";

export const API_URL_KEYS = {
    POI: poisApi,
    WALL: wallsApi,
    BEACONS: beaconsApi,
    NODES: routeNodesApi,
    EDGES: routeEdgesApi,
} as const;