import {REQUEST_HEADERS, STORAGE_KEYS} from '../constants/api';
import {createLogger} from './logger';
import {BuildingsApi} from "./api_helpers/buildingsApi";
import {FloorsApi} from "./api_helpers/floorsApi";
import {BeaconTypesApi} from "./api_helpers/beaconTypesApi";
import {BeaconsApi} from "./api_helpers/beaconsApi";
import {PoiCategoriesApi} from "./api_helpers/poiCategoriesApi";
import {PolygonsApi} from "./api_helpers/polygonsApi";
import {RouteNodesApi} from "./api_helpers/routeNodesApi";

export const logger = createLogger('API');

// Helper function to get auth headers
export const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem(STORAGE_KEYS.JWT_TOKEN);
  return {
    [REQUEST_HEADERS.CONTENT_TYPE]: REQUEST_HEADERS.CONTENT_TYPE_JSON,
    ...(token && { [REQUEST_HEADERS.AUTHORIZATION]: `Bearer ${token}` }),
  };
};

// Create instances
export const buildingsApi = new BuildingsApi();
export const floorsApi = new FloorsApi();
export const beaconTypesApi = new BeaconTypesApi();
export const beaconsApi = new BeaconsApi();
export const poiCategoriesApi = new PoiCategoriesApi();
export const polygonsApi = new PolygonsApi();
export const routeNodesApi = new RouteNodesApi();