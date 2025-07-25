// Wall API functions
import {FloorScopedApi} from "../abstract_classes/floorScopedApi";
import {API_ENDPOINTS} from "../../constants/api";
import {apiRequest} from "./apiRequest";
import {logger} from "../api";
import {Wall} from "./api_interfaces/wall";

export class WallsApi extends FloorScopedApi<Wall> {
    resourceEndpoint = API_ENDPOINTS.WALLS;

    getByFloorEndpoint(floorId: number): string {
        return API_ENDPOINTS.WALLS_BY_FLOOR(floorId);
    }

    getByType(wallType: string): Promise<Wall[]> {
        logger.info('Fetching walls by type', {wallType});
        return apiRequest<Wall[]>(API_ENDPOINTS.WALLS_BY_TYPE(wallType));
    }
}