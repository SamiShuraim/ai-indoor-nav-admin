// POI Category API functions
import {BaseApi} from "../abstract_classes/baseApi";
import {API_ENDPOINTS} from "../../constants/api";
import {apiRequest} from "./apiRequest";
import {logger} from "../api";
import {PoiCategory} from "./api_interfaces/poiCategory";

export class PoiCategoriesApi extends BaseApi<PoiCategory> {
    resourceEndpoint = API_ENDPOINTS.POI_CATEGORIES;

    getByName(name: string): Promise<PoiCategory> {
        logger.info('Fetching POI category by name', {name});
        return apiRequest<PoiCategory>(API_ENDPOINTS.POI_CATEGORY_BY_NAME(name));
    }
}