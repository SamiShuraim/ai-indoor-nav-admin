// Route Edge API functions
import {FloorScopedApi} from "../abstract_classes/floorScopedApi";
import {API_ENDPOINTS} from "../../constants/api";
import {apiRequest} from "./apiRequest";
import {logger} from "../api";
import {RouteEdge} from "./api_interfaces/routeEdge";

export class RouteEdgesApi extends FloorScopedApi<RouteEdge> {
    resourceEndpoint = API_ENDPOINTS.ROUTE_EDGES;

    getByFloorEndpoint(floorId: number): string {
        return API_ENDPOINTS.ROUTE_EDGES_BY_FLOOR(floorId);
    }

    getByType(edgeType: string): Promise<RouteEdge[]> {
        logger.info('Fetching route edges by type', {edgeType});
        return apiRequest<RouteEdge[]>(API_ENDPOINTS.ROUTE_EDGES_BY_TYPE(edgeType));
    }

    getByNode(nodeId: string | number): Promise<RouteEdge[]> {
        logger.info('Fetching route edges for node', {nodeId});
        return apiRequest<RouteEdge[]>(API_ENDPOINTS.ROUTE_EDGES_BY_NODE(nodeId));
    }
}