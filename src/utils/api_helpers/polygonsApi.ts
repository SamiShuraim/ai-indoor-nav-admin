import {FloorScopedApi} from "../abstract_classes/floorScopedApi";
import {API_ENDPOINTS} from "../../constants/api";
import {Polygon} from "../../interfaces/Polygon";
import {apiRequest} from "./apiRequest";
import {logger} from "../api";

export class PolygonsApi extends FloorScopedApi<Polygon> {
    resourceEndpoint = API_ENDPOINTS.POIS;

    getByFloorEndpoint(floorId: number): string {
        return API_ENDPOINTS.POIS_BY_FLOOR(floorId);
    }

    // Recalculate closest nodes for POIs
    async recalculateClosestNodes(floorId?: number): Promise<{
        success: boolean;
        updatedPois: number;
        floorId?: number;
        message: string;
        report?: any;
    }> {
        logger.info('Recalculating closest nodes for POIs', { floorId });
        
        const endpoint = floorId 
            ? `${API_ENDPOINTS.POIS_RECALCULATE_CLOSEST_NODES}?floorId=${floorId}`
            : API_ENDPOINTS.POIS_RECALCULATE_CLOSEST_NODES;
        
        const result = await apiRequest<{
            success: boolean;
            updatedPois: number;
            floorId?: number;
            message: string;
            report?: any;
        }>(endpoint, {
            method: 'POST',
        });
        
        logger.info('Successfully recalculated closest nodes for POIs', { floorId, result });
        return result;
    }
}