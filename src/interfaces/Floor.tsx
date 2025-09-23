import {Building} from "./Building";
import {RouteNode} from "./RouteNode";
import {Polygon} from "./Polygon";

export interface Floor {
    id: number;
    name: string;
    floorNumber: number;
    buildingId: number;
    building?: Building;
    nodes?: RouteNode[];
    polygons?: Polygon[];
}

export class FloorBuilder {
    private _id!: number;
    private _name!: string;
    private _floorNumber!: number;
    private _buildingId!: number;
    private _building?: Building;
    private _nodes?: RouteNode[];
    private _polygons?: Polygon[];

    public static fromFloor(floor: Floor): FloorBuilder {
        const builder = new FloorBuilder();
        builder._id = floor.id;
        builder._name = floor.name;
        builder._floorNumber = floor.floorNumber;
        builder._buildingId = floor.buildingId;
        builder._building = floor.building;
        builder._nodes = floor.nodes ? [...floor.nodes] : undefined;
        builder._polygons = floor.polygons ? [...floor.polygons] : undefined;
        return builder;
    }

    public setId(id: number): this {
        this._id = id;
        return this;
    }

    public setName(name: string): this {
        this._name = name;
        return this;
    }

    public setFloorNumber(floorNumber: number): this {
        this._floorNumber = floorNumber;
        return this;
    }

    public setBuildingId(buildingId: number): this {
        this._buildingId = buildingId;
        return this;
    }

    public setBuilding(building: Building | undefined): this {
        this._building = building;
        return this;
    }

    public setNodes(nodes: RouteNode[] | undefined): this {
        this._nodes = nodes ? [...nodes] : undefined;
        return this;
    }

    public setPolygons(polygons: Polygon[] | undefined): this {
        this._polygons = polygons ? [...polygons] : undefined;
        return this;
    }

    public validate(): void {
        if (this._id === undefined || this._id === null) {
            throw new Error("Floor ID is required");
        }
        if (!this._name || !this._name.trim()) {
            throw new Error("Floor name is required");
        }
        if (this._floorNumber === undefined || this._floorNumber === null) {
            throw new Error("Floor number is required");
        }
        if (this._buildingId === undefined || this._buildingId === null) {
            throw new Error("Floor building ID is required");
        }
    }

    public build(): Floor {
        this.validate();
        return {
            id: this._id,
            name: this._name,
            floorNumber: this._floorNumber,
            buildingId: this._buildingId,
            building: this._building,
            nodes: this._nodes,
            polygons: this._polygons,
        };
    }
}