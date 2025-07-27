import {FloorScopedApi} from "../abstract_classes/floorScopedApi";
import {API_ENDPOINTS} from "../../constants/api";

import {POI} from "./api_interfaces/POI";

export class PoisApi extends FloorScopedApi<POI> {
    resourceEndpoint = API_ENDPOINTS.POIS;

    getByFloorEndpoint(floorId: number): string {
        return API_ENDPOINTS.POIS_BY_FLOOR(floorId);
    }
}