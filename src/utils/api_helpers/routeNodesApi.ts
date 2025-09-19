// Route Node API functions
import {FloorScopedApi} from "../abstract_classes/floorScopedApi";
import {API_ENDPOINTS} from "../../constants/api";
import {RouteNode} from "../../interfaces/RouteNode";
import {logger} from "../api";
import {apiRequest} from "./apiRequest";

export class RouteNodesApi extends FloorScopedApi<RouteNode> {
    resourceEndpoint = API_ENDPOINTS.ROUTE_NODES;

    getByFloorEndpoint(floorId: number): string {
        return API_ENDPOINTS.ROUTE_NODES_BY_FLOOR(floorId);
    }

    // Fix bidirectional connections for all nodes on a floor
    async fixBidirectionalConnections(floorId: number): Promise<void> {
        logger.info('Fixing bidirectional connections for floor', { floorId });
        
        await apiRequest<void>(API_ENDPOINTS.ROUTE_NODES_FIX_BIDIRECTIONAL, {
            method: 'POST',
            body: JSON.stringify({ floorId }),
        });
        
        logger.info('Successfully fixed bidirectional connections for floor', { floorId });
    }

    // getByType(nodeType: string): Promise<RouteNode[]> {
    //     logger.info('Fetching route nodes by type', {nodeType});
    //     return apiRequest<RouteNode[]>(API_ENDPOINTS.ROUTE_NODES_BY_TYPE(nodeType));
    // }
}