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
        level?: number | null; // Level (1, 2, 3, or null for none)
    }
}

export class RouteNodeBuilder {
    private _id?: number;
    private _floorId!: number;
    private _geometry: { type: "Point"; coordinates: [number, number] } | null = null;
    private _isVisible: boolean = true;
    private _connections: number[] = [];
    private _nodeType?: string;
    private _level?: number | null;
    private _isCreating: boolean = true; // Flag to indicate if we're creating a new object

    public static fromRouteNode(node: RouteNode): RouteNodeBuilder {
        const builder = new RouteNodeBuilder();
        builder._id = node.properties.id;
        builder._floorId = node.properties.floor_id;
        builder._geometry = node.geometry;
        builder._isVisible = node.properties.is_visible;
        builder._connections = [...(node.properties.connections || node.properties.connected_node_ids || [])];
        builder._nodeType = node.properties.node_type;
        builder._level = node.properties.level;
        builder._isCreating = false; // This is an existing object
        return builder;
    }

    public setId(id: number): this {
        this._id = id;
        this._isCreating = false; // If we're setting an ID, this is an existing object
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

    public setLevel(level: number | null | undefined): this {
        this._level = level;
        return this;
    }

    public validate(): void {
        // Only validate ID for existing objects (updates), not for new objects (creates)
        if (!this._isCreating && (this._id === undefined || this._id === null)) {
            throw new Error("RouteNode ID is required for updates");
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
                ...(this._id !== undefined && { id: this._id }), // Only include ID if it exists
                floor_id: this._floorId,
                is_visible: this._isVisible,
                connections: this._connections,
                ...(this._nodeType && { node_type: this._nodeType }),
                ...(this._level !== undefined && { level: this._level }),
            } as any // Type assertion needed because id is now optional
        };
    }
}
