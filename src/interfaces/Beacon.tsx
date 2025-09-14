export interface Beacon {
    type: "Feature";
    geometry: {
        type: "Point";
        coordinates: [number, number]; // [longitude, latitude]
    } | null;
    properties: {
        id: number;
        floor_id: number;
        beacon_type_id?: number | null;
        name: string;
        uuid?: string | null;
        major_id?: number | null;
        minor_id?: number | null;
        is_active: boolean;
        is_visible: boolean;
        battery_level: number;
        last_seen?: string | null; // ISO date string
        beacon_type?: {
            name: string;
        } | null;
    }
}

export class BeaconBuilder {
    private _geometry: { type: "Point"; coordinates: [number, number] } | null = null;
    private _id!: number;
    private _floorId!: number;
    private _beaconTypeId: number | null = null;
    private _name!: string;
    private _uuid: string | null = null;
    private _majorId: number | null = null;
    private _minorId: number | null = null;
    private _isActive: boolean = true;
    private _isVisible: boolean = true;
    private _batteryLevel: number = 100;
    private _lastSeen: string | null = null;
    private _beaconType: { name: string } | null = null;

    public constructor() {
        return this;
    }

    public static fromBeacon(beacon: Beacon): BeaconBuilder {
        let res = new BeaconBuilder();
        res._id = beacon.properties.id;
        res._beaconType = beacon.properties.beacon_type?.name ? {name: beacon.properties.beacon_type.name} : null;
        res._floorId = beacon.properties.floor_id;
        res._beaconTypeId = beacon.properties.beacon_type_id ?? null;
        res._name = beacon.properties.name;
        res._uuid = beacon.properties.uuid ?? null;
        res._majorId = beacon.properties.major_id ?? null;
        res._minorId = beacon.properties.minor_id ?? null;
        res._isActive = beacon.properties.is_active;
        res._isVisible = beacon.properties.is_visible;
        res._batteryLevel = beacon.properties.battery_level;
        res._lastSeen = beacon.properties.last_seen ?? null;
        res._geometry = beacon.geometry ?? null;
        return res;
    }
    
    public setId(id: number): this {
        this._id = id;
        return this;
    }

    public setFloorId(floorId: number): this {
        this._floorId = floorId;
        return this;
    }

    public setBeaconTypeId(beaconTypeId: number | null): this {
        this._beaconTypeId = beaconTypeId;
        return this;
    }

    public setName(name: string): this {
        this._name = name;
        return this;
    }

    public setUuid(uuid: string | null): this {
        this._uuid = uuid;
        return this;
    }

    public setMajorId(majorId: number | null): this {
        this._majorId = majorId;
        return this;
    }

    public setMinorId(minorId: number | null): this {
        this._minorId = minorId;
        return this;
    }

    public setGeometry(x: number, y: number): this {
        this._geometry = {
            type: "Point",
            coordinates: [x, y],
        };
        return this;
    }

    public setIsActive(isActive: boolean): this {
        this._isActive = isActive;
        return this;
    }

    public setIsVisible(isVisible: boolean): this {
        this._isVisible = isVisible;
        return this;
    }

    public setBatteryLevel(level: number): this {
        this._batteryLevel = level;
        return this;
    }

    public setLastSeen(date: string | null): this {
        this._lastSeen = date;
        return this;
    }

    public setBeaconType(name: string): this {
        this._beaconType = {name};
        return this;
    }

    public build(): Beacon {
        return {
            type: "Feature",
            geometry: this._geometry,
            properties: {
                id: this._id,
                floor_id: this._floorId,
                beacon_type_id: this._beaconTypeId,
                name: this._name,
                uuid: this._uuid,
                major_id: this._majorId,
                minor_id: this._minorId,
                is_active: this._isActive,
                is_visible: this._isVisible,
                battery_level: this._batteryLevel,
                last_seen: this._lastSeen,
                beacon_type: this._beaconType,
            },
        };
    }
}
