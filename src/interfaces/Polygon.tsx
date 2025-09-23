export type PolygonType = "Room" | "Stairs" | "Elevator" | "Wall";

export interface PolygonProperties {
    id: number;
    floor_id: number;
    name: string;
    description: string;
    type: PolygonType;
    is_visible: boolean;
    color: string;
    category_id: number | null;
}

export interface Polygon {
    type: "Feature";
    properties: PolygonProperties;
    geometry: {
        type: "Polygon";
        coordinates: number[][][];
    };
}

export class PolygonBuilder {
    private _properties: Partial<PolygonProperties> & { floor_id: number } = {
        floor_id: 0,
        name: "",
        description: "",
        type: "Room",
        is_visible: true,
        color: "#000000",
        category_id: 0,
    };
    private _geometry!: {
        type: "Polygon";
        coordinates: number[][][];
    };
    private _isCreating: boolean = true;

    public static fromPolygon(polygon: Polygon): PolygonBuilder {
        let res = new PolygonBuilder();
        res.setId(polygon.properties.id);
        res.setFloorId(polygon.properties.floor_id);
        res.setName(polygon.properties.name);
        res.setDescription(polygon.properties.description);
        res.setType(polygon.properties.type);
        res.setIsVisible(polygon.properties.is_visible);
        res.setColor(polygon.properties.color);
        res.setCategoryId(polygon.properties.category_id);
        res.setGeometry(polygon.geometry.coordinates);
        res._isCreating = false; // This is an existing object
        return res;
    }

    public setId(id: number): this {
        this._properties.id = id;
        this._isCreating = false; // If we're setting an ID, this is an existing object
        return this;
    }

    public setFloorId(floorId: number): this {
        this._properties.floor_id = floorId;
        return this;
    }

    public setName(name: string): this {
        this._properties.name = name;
        return this;
    }

    public setDescription(description: string): this {
        this._properties.description = description;
        return this;
    }

    public setType(type: PolygonType): this {
        this._properties.type = type;
        return this;
    }

    public setIsVisible(isVisible: boolean): this {
        this._properties.is_visible = isVisible;
        return this;
    }

    public setColor(color: string): this {
        this._properties.color = color;
        return this;
    }

    public setCategoryId(categoryId: number | null): this {
        this._properties.category_id = categoryId;
        return this;
    }

    public setGeometry(coordinates: number[][][]): this {
        const ring = coordinates[0];
        const first = ring[0];
        const last = ring[ring.length - 1];

        if (first[0] !== last[0] || first[1] !== last[1]) {
            ring.push([...first]); // Use a shallow copy to avoid reference issues
        }
        this._geometry = {
            type: "Polygon",
            coordinates,
        };
        return this;
    }

    public validate(): void {
        // Only validate ID for existing objects (updates), not for new objects (creates)
        if (!this._isCreating && (this._properties.id === undefined || this._properties.id === null)) {
            throw new Error("Polygon ID is required for updates");
        }
        if (!this._properties.name || !this._properties.name.trim()) {
            throw new Error("Polygon name is required");
        }
        if (this._properties.floor_id === undefined || this._properties.floor_id === null) {
            throw new Error("Polygon floor_id is required");
        }
        if (!this._geometry || !this._geometry.coordinates || this._geometry.coordinates.length === 0) {
            throw new Error("Polygon geometry is required");
        }
        const ring = this._geometry.coordinates[0];
        if (!ring || ring.length < 3) {
            throw new Error("Polygon must have at least 3 points");
        }
        
        // Validate coordinate format
        ring.forEach((point: number[], index: number) => {
            if (!Array.isArray(point) || point.length !== 2) {
                throw new Error(`Point ${index + 1} must be [longitude, latitude]`);
            }
            if (typeof point[0] !== 'number' || typeof point[1] !== 'number') {
                throw new Error(`Point ${index + 1} must contain valid numbers`);
            }
        });
    }

    public build(): Polygon {
        this.validate();
        return {
            type: "Feature",
            properties: {
                ...this._properties,
                ...(this._properties.id !== undefined && { id: this._properties.id }), // Only include ID if it exists
            } as PolygonProperties,
            geometry: this._geometry,
        };
    }
}