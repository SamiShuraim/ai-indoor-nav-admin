// Beacon Types
export interface BeaconType {
    id: number;
    name: string;
    description?: string;
    transmission_power?: number;
    battery_life?: number;
    range_meters?: number;
    created_at: string;
    updated_at: string;
}