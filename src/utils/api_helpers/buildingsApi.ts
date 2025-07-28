// Building API functions
import {BaseApi} from "../abstract_classes/baseApi";
import {API_ENDPOINTS} from "../../constants/api";

import {Building} from "../../interfaces/Building";

export class BuildingsApi extends BaseApi<Building> {
    resourceEndpoint = API_ENDPOINTS.BUILDINGS;
}