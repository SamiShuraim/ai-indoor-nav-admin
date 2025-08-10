import {Building} from "./Building";
import {RouteNode} from "./RouteNode";
import {Polygon} from "./Polygon";

export interface Floor {
    id: number;
    name: string;
    floor_number: number;
    building_id: number;
    building?: Building;
    nodes?: RouteNode[];
    polygons?: Polygon[];
}