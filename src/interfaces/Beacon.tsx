export interface Beacon {
    id: number;
    floorId: number;
    beaconTypeId?: number | null;
    name: string;
    uuid?: string | null;
    majorId?: number | null;
    minorId?: number | null;
    geometry?: {
        type: "Point";
        coordinates: [number, number]; // [longitude, latitude]
    } | null;
    isActive: boolean;
    isVisible: boolean;
    batteryLevel: number;
    lastSeen?: string | null; // ISO date string
    beaconType?: {
        name: string;
    } | null;
}
