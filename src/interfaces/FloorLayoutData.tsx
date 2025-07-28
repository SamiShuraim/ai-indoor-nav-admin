import {RouteNode} from "./RouteNode";
import {Polygon} from "./Polygon";
import {Beacon} from "./Beacon";

export default interface FloorLayoutData {
    polygons: Polygon[];
    nodes: RouteNode[];
    beacons: Beacon[];
}