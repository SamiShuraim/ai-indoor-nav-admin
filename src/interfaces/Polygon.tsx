export type PolygonType = "Room" | "Stairs" | "Elevator" | "Wall";

export interface PolygonProperties {
    id: number;
    floorId: number;
    name: string;
    description: string;
    type: PolygonType;
    isVisible: boolean;
    color: string;
    categoryId: number | null;
}

export interface Polygon {
    properties: PolygonProperties;
    geometry: {
        type: "Polygon";
        coordinates: number[][][];
    };
}

export class PolygonBuilder {
    private _properties: PolygonProperties = {
        id: 0,
        floorId: 0,
        name: "",
        description: "",
        type: "Room",
        isVisible: true,
        color: "#000000",
        categoryId: 0,
    };
    private _geometry!: {
        type: "Polygon";
        coordinates: number[][][];
    };

    public setId(id: number): this {
        this._properties.id = id;
        return this;
    }

    public setFloorId(floorId: number): this {
        this._properties.floorId = floorId;
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
        this._properties.isVisible = isVisible;
        return this;
    }

    public setColor(color: string): this {
        this._properties.color = color;
        return this;
    }

    public setCategoryId(categoryId: number | null): this {
        this._properties.categoryId = categoryId;
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

    public build(): Polygon {
        return {
            properties: this._properties,
            geometry: this._geometry,
        };
    }
}