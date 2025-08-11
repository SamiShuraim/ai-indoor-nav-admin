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