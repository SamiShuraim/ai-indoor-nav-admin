// API URL keys
import {beaconsApi, polygonsApi, routeNodesApi} from "../../../utils/api";

export const API_URL_KEYS = {
    POI: polygonsApi,
    BEACONS: beaconsApi,
    NODES: routeNodesApi,
} as const;