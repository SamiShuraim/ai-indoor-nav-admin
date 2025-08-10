export interface Beacon {
    geometry?: {
        type: "Point";
        coordinates: [number, number]; // [longitude, latitude]
    } | null;
    properties: {
        id: number;
        floorId: number;
        beaconTypeId?: number | null;
        name: string;
        uuid?: string | null;
        majorId?: number | null;
        minorId?: number | null;
        isActive: boolean;
        isVisible: boolean;
        batteryLevel: number;
        lastSeen?: string | null; // ISO date string
        beaconType?: {
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
        res._beaconType = beacon.properties.beaconType?.name ? {name: beacon.properties.beaconType.name} : null;
        res._floorId = beacon.properties.floorId;
        res._beaconTypeId = beacon.properties.beaconTypeId ?? null;
        res._name = beacon.properties.name;
        res._uuid = beacon.properties.uuid ?? null;
        res._majorId = beacon.properties.majorId ?? null;
        res._minorId = beacon.properties.minorId ?? null;
        res._isActive = beacon.properties.isActive;
        res._isVisible = beacon.properties.isVisible;
        res._batteryLevel = beacon.properties.batteryLevel;
        res._lastSeen = beacon.properties.lastSeen ?? null;
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
            geometry: this._geometry,
            properties: {
                id: this._id,
                floorId: this._floorId,
                beaconTypeId: this._beaconTypeId,
                name: this._name,
                uuid: this._uuid,
                majorId: this._majorId,
                minorId: this._minorId,
                isActive: this._isActive,
                isVisible: this._isVisible,
                batteryLevel: this._batteryLevel,
                lastSeen: this._lastSeen,
                beaconType: this._beaconType,
            },
        };
    }
}
