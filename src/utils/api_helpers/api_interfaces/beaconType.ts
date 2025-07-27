// Beacon Types
export interface BeaconType {
    id: number;
    name: string;
    description?: string;
    transmissionPower?: number;
    batteryLife?: number;
    rangeMeters?: number;
    createdAt: string;
    updatedAt: string;
}