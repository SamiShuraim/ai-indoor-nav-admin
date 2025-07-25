// Beacons
import {BeaconType} from "./beaconType";

export interface Beacon {
    id: number;
    floorId: number;
    beaconTypeId?: number;
    beaconType?: BeaconType;
    name: string;
    uuid?: string;
    majorId?: number;
    minorId?: number;
    x: number;
    y: number;
    z?: number;
    isActive: boolean;
    isVisible: boolean;
    batteryLevel?: number;
    lastSeen?: string;
    installationDate?: string;
    createdAt: string;
    updatedAt: string;
}