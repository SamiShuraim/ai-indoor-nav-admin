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
    properties: PolygonProperties;
    geometry: {
        type: "Polygon";
        coordinates: number[][][];
    };
}

export class PolygonBuilder {
    private _properties: PolygonProperties = {
        id: 0,
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
        return res;
    }

    public setId(id: number): this {
        this._properties.id = id;
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

    public build(): Polygon {
        return {
            properties: this._properties,
            geometry: this._geometry,
        };
    }
}