import {BuildingScopedApi} from "../abstract_classes/buildingScopedApi";
import {API_ENDPOINTS} from "../../constants/api";

import {Floor} from "./api_interfaces/floor";

export class FloorsApi extends BuildingScopedApi<Floor> {
    resourceEndpoint = API_ENDPOINTS.FLOORS;

    getByBuildingEndpoint(buildingId: number): string {
        return API_ENDPOINTS.FLOORS_BY_BUILDING(buildingId);
    }
}