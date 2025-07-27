import {BaseApi} from "./baseApi";
import {apiRequest} from "../api_helpers/apiRequest";
import {logger} from "../api";

export abstract class FloorScopedApi<T> extends BaseApi<T> {
    abstract getByFloorEndpoint(floorId: number): string;

    getByFloor(floorId: string | number): Promise<T[]> {
        const numericFloorId = typeof floorId === 'string' ? parseInt(floorId, 10) : floorId;

        logger.info('Fetching entities for floor', {
            originalFloorId: floorId,
            parsedFloorId: numericFloorId,
            isValid: !isNaN(numericFloorId)
        });

        if (isNaN(numericFloorId)) {
            throw new Error(`Invalid floor ID: ${floorId}`);
        }

        return apiRequest<T[]>(this.getByFloorEndpoint(numericFloorId));
    }
}