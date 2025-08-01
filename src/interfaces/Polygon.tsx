export interface Polygon {
    id: number;
    floorId: number;
    name: string;
    description: string;
    type: "Room" | "Stairs" | "Elevator" | "Wall";
    isVisible: boolean;
    color: string;
    categoryId: number;
    geometry: {
        type: "Polygon";
        coordinates: number[][][];
    };
}

export class PolygonBuilder {
    private _id!: number;
    private _floorId!: number;
    private _name!: string;
    private _description!: string;
    private _type!: "Room" | "Stairs" | "Elevator" | "Wall";
    private _isVisible: boolean = true;
    private _color: string = "#000000";
    private _categoryId!: number;
    private _geometry!: {
        type: "Polygon";
        coordinates: number[][][];
    };

    public setId(id: number): this {
        this._id = id;
        return this;
    }

    public setFloorId(floorId: number): this {
        this._floorId = floorId;
        return this;
    }

    public setName(name: string): this {
        this._name = name;
        return this;
    }

    public setDescription(description: string): this {
        this._description = description;
        return this;
    }

    public setType(type: "Room" | "Stairs" | "Elevator" | "Wall"): this {
        this._type = type;
        return this;
    }

    public setIsVisible(isVisible: boolean): this {
        this._isVisible = isVisible;
        return this;
    }

    public setColor(color: string): this {
        this._color = color;
        return this;
    }

    public setCategoryId(categoryId: number): this {
        this._categoryId = categoryId;
        return this;
    }

    public setGeometry(coordinates: number[][][]): this {
        this._geometry = {
            type: "Polygon",
            coordinates,
        };
        return this;
    }

    public build(): Polygon {
        return {
            id: this._id,
            floorId: this._floorId,
            name: this._name,
            description: this._description,
            type: this._type,
            isVisible: this._isVisible,
            color: this._color,
            categoryId: this._categoryId,
            geometry: this._geometry,
        };
    }
}