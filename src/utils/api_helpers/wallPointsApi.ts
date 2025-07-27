// Wall Point API functions
import {BaseApi} from "../abstract_classes/baseApi";
import {API_ENDPOINTS} from "../../constants/api";
import {apiRequest} from "./apiRequest";
import {logger} from "../api";
import {WallPoint} from "./api_interfaces/wallPoint";

export class WallPointsApi extends BaseApi<WallPoint> {
    resourceEndpoint = API_ENDPOINTS.WALL_POINTS;

    getByWall(wallId: string | number): Promise<WallPoint[]> {
        logger.info('Fetching wall points for wall', {wallId});
        return apiRequest<WallPoint[]>(API_ENDPOINTS.WALL_POINTS_BY_WALL(wallId));
    }

    createBulk(points: Omit<WallPoint, 'id' | 'createdAt'>[]): Promise<WallPoint[]> {
        logger.info('Creating wall points in bulk', {count: points.length});
        return apiRequest<WallPoint[]>(API_ENDPOINTS.WALL_POINTS_BULK, {
            method: 'POST',
            body: JSON.stringify(points),
        });
    }

    deleteByWall(wallId: string | number): Promise<void> {
        logger.info('Deleting all wall points for wall', {wallId});
        return apiRequest<void>(API_ENDPOINTS.WALL_POINTS_BY_WALL(wallId), {
            method: 'DELETE',
        });
    }
}