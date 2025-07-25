import {BaseApi} from "./baseApi";
import {apiRequest} from "../api_helpers/apiRequest";
import {logger} from "../api";

export abstract class BuildingScopedApi<T> extends BaseApi<T> {
    abstract getByBuildingEndpoint(buildingId: number): string;

    getByBuilding(buildingId: string | number): Promise<T[]> {
        const numericBuildingId = typeof buildingId === 'string' ? parseInt(buildingId, 10) : buildingId;
        logger.info('Fetching by building', {buildingId: numericBuildingId});

        if (isNaN(numericBuildingId)) {
            throw new Error(`Invalid building ID: ${buildingId}`);
        }

        return apiRequest<T[]>(this.getByBuildingEndpoint(numericBuildingId));
    }
}