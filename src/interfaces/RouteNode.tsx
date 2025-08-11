export interface RouteNode {
    geometry: {
        type: "Point";
        coordinates: [number, number]; // [x, y] as [longitude, latitude]
    } | null;
    properties: {
        id: number;
        floor_id: number;
        is_visible: boolean;
        connections: number[]; // IDs of connected RouteNodes
    }
}

export class RouteNodeBuilder {
    private _id!: number;
    private _floorId!: number;
    private _geometry: { type: "Point"; coordinates: [number, number] } | null = null;
    private _isVisible: boolean = true;
    private _connections: number[] = [];

    public setId(id: number): this {
        this._id = id;
        return this;
    }

    public setFloorId(floorId: number): this {
        this._floorId = floorId;
        return this;
    }

    public setLocation(x: number, y: number): this {
        this._geometry = {
            type: "Point",
            coordinates: [x, y],
        };
        return this;
    }

    public setIsVisible(isVisible: boolean): this {
        this._isVisible = isVisible;
        return this;
    }

    public setConnections(connections: number[]): this {
        this._connections = connections;
        return this;
    }

    public addConnection(nodeId: number): this {
        if (!this._connections.includes(nodeId)) {
            this._connections.push(nodeId);
        }
        return this;
    }

    public build(): RouteNode {
        return {
            geometry: this._geometry,
            properties: {
                id: this._id,
                floor_id: this._floorId,
                is_visible: this._isVisible,
                connections: this._connections,
            }
        };
    }
}
