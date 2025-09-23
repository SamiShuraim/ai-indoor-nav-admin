export interface RouteNode {
    type: "Feature";
    geometry: {
        type: "Point";
        coordinates: [number, number]; // [x, y] as [longitude, latitude]
    } | null;
    properties: {
        id: number;
        floor_id: number;
        is_visible: boolean;
        connections: number[]; // Frontend uses this name
        connected_node_ids?: number[]; // Backend uses this name
        node_type?: string; // Node type (elevator, stairs, waypoint, etc.)
    }
}

export class RouteNodeBuilder {
    private _id!: number;
    private _floorId!: number;
    private _geometry: { type: "Point"; coordinates: [number, number] } | null = null;
    private _isVisible: boolean = true;
    private _connections: number[] = [];
    private _nodeType?: string;

    public static fromRouteNode(node: RouteNode): RouteNodeBuilder {
        const builder = new RouteNodeBuilder();
        builder._id = node.properties.id;
        builder._floorId = node.properties.floor_id;
        builder._geometry = node.geometry;
        builder._isVisible = node.properties.is_visible;
        builder._connections = [...(node.properties.connections || node.properties.connected_node_ids || [])];
        builder._nodeType = node.properties.node_type;
        return builder;
    }

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

    public setGeometry(geometry: { type: "Point"; coordinates: [number, number] } | null): this {
        this._geometry = geometry;
        return this;
    }

    public setIsVisible(isVisible: boolean): this {
        this._isVisible = isVisible;
        return this;
    }

    public setConnections(connections: number[]): this {
        this._connections = [...connections];
        return this;
    }

    public addConnection(nodeId: number): this {
        if (!this._connections.includes(nodeId)) {
            this._connections.push(nodeId);
        }
        return this;
    }

    public removeConnection(nodeId: number): this {
        this._connections = this._connections.filter(id => id !== nodeId);
        return this;
    }

    public setNodeType(nodeType: string | undefined): this {
        this._nodeType = nodeType;
        return this;
    }

    public validate(): void {
        if (this._id === undefined || this._id === null) {
            throw new Error("RouteNode ID is required");
        }
        if (this._floorId === undefined || this._floorId === null) {
            throw new Error("RouteNode floor_id is required");
        }
        if (this._geometry && (!Array.isArray(this._geometry.coordinates) || this._geometry.coordinates.length !== 2)) {
            throw new Error("RouteNode geometry coordinates must be an array of [x, y]");
        }
    }

    public build(): RouteNode {
        this.validate();
        return {
            type: "Feature",
            geometry: this._geometry,
            properties: {
                id: this._id,
                floor_id: this._floorId,
                is_visible: this._isVisible,
                connections: this._connections,
                ...(this._nodeType && { node_type: this._nodeType }),
            }
        };
    }
}
