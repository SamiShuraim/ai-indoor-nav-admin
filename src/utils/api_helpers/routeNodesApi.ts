// Route Node API functions
import {FloorScopedApi} from "../abstract_classes/floorScopedApi";
import {API_ENDPOINTS} from "../../constants/api";
import {RouteNode} from "../../interfaces/RouteNode";

export class RouteNodesApi extends FloorScopedApi<RouteNode> {
    resourceEndpoint = API_ENDPOINTS.ROUTE_NODES;

    getByFloorEndpoint(floorId: number): string {
        return API_ENDPOINTS.ROUTE_NODES_BY_FLOOR(floorId);
    }

    // getByType(nodeType: string): Promise<RouteNode[]> {
    //     logger.info('Fetching route nodes by type', {nodeType});
    //     return apiRequest<RouteNode[]>(API_ENDPOINTS.ROUTE_NODES_BY_TYPE(nodeType));
    // }
}