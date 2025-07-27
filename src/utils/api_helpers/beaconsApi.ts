// Beacon API functions
import {FloorScopedApi} from "../abstract_classes/floorScopedApi";
import {API_ENDPOINTS} from "../../constants/api";
import {apiRequest} from "./apiRequest";
import {logger} from "../api";
import {Beacon} from "./api_interfaces/beacon";

export class BeaconsApi extends FloorScopedApi<Beacon> {
    resourceEndpoint = API_ENDPOINTS.BEACONS;

    getByFloorEndpoint(floorId: number): string {
        return API_ENDPOINTS.BEACONS_BY_FLOOR(floorId);
    }

    getByUuid(uuid: string): Promise<Beacon> {
        logger.info('Fetching beacon by UUID', {uuid});
        return apiRequest<Beacon>(API_ENDPOINTS.BEACON_BY_UUID(uuid));
    }

    getActive(): Promise<Beacon[]> {
        logger.info('Fetching active beacons');
        return apiRequest<Beacon[]>(API_ENDPOINTS.BEACONS_ACTIVE);
    }

    getLowBattery(threshold: number): Promise<Beacon[]> {
        logger.info('Fetching beacons with low battery', {threshold});
        return apiRequest<Beacon[]>(API_ENDPOINTS.BEACONS_LOW_BATTERY(threshold));
    }

    updateBattery(id: string | number, level: number): Promise<Beacon> {
        logger.info('Updating beacon battery level', {beaconId: id, level});
        return apiRequest<Beacon>(API_ENDPOINTS.BEACON_BATTERY(id, level), {
            method: 'PUT',
        });
    }

    heartbeat(id: string | number): Promise<Beacon> {
        logger.info('Sending beacon heartbeat', {beaconId: id});
        return apiRequest<Beacon>(API_ENDPOINTS.BEACON_HEARTBEAT(id), {
            method: 'PUT',
        });
    }
}