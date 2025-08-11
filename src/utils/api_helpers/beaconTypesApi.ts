// Beacon Type API functions
import {BaseApi} from "../abstract_classes/baseApi";
import {API_ENDPOINTS} from "../../constants/api";
import {apiRequest} from "./apiRequest";
import {logger} from "../api";
import {BeaconType} from "../../interfaces/BeaconType";

export class BeaconTypesApi extends BaseApi<BeaconType> {
    resourceEndpoint: string = API_ENDPOINTS.BEACON_TYPES;

    getByName(name: string): Promise<BeaconType> {
        logger.info('Fetching beacon type by name', {name});
        return apiRequest<BeaconType>(API_ENDPOINTS.BEACON_TYPE_BY_NAME(name));
    }
}