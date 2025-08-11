import {FloorScopedApi} from "../abstract_classes/floorScopedApi";
import {API_ENDPOINTS} from "../../constants/api";
import {Polygon} from "../../interfaces/Polygon";

export class PolygonsApi extends FloorScopedApi<Polygon> {
    resourceEndpoint = API_ENDPOINTS.POIS;

    getByFloorEndpoint(floorId: number): string {
        return API_ENDPOINTS.POIS_BY_FLOOR(floorId);
    }
}