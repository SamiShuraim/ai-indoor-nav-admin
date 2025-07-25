// POI Point API functions
import {BaseApi} from "../abstract_classes/baseApi";
import {API_ENDPOINTS} from "../../constants/api";
import {apiRequest} from "./apiRequest";
import {logger} from "../api";
import {PoiPoint} from "./api_interfaces/poiPoint";

export class PoiPointsApi extends BaseApi<PoiPoint> {
    resourceEndpoint = API_ENDPOINTS.POI_POINTS;

    getByPoi(poiId: string | number): Promise<PoiPoint[]> {
        logger.info('Fetching POI points for POI', {poiId});
        return apiRequest<PoiPoint[]>(API_ENDPOINTS.POI_POINTS_BY_POI(poiId));
    }

    createBulk(points: Omit<PoiPoint, 'id' | 'createdAt'>[]): Promise<PoiPoint[]> {
        logger.info('Creating POI points in bulk', {count: points.length});
        return apiRequest<PoiPoint[]>(API_ENDPOINTS.POI_POINTS_BULK, {
            method: 'POST',
            body: JSON.stringify(points),
        });
    }

    deleteByPoi(poiId: string | number): Promise<void> {
        logger.info('Deleting all POI points for POI', {poiId});
        return apiRequest<void>(API_ENDPOINTS.POI_POINTS_BY_POI(poiId), {
            method: 'DELETE',
        });
    }
}