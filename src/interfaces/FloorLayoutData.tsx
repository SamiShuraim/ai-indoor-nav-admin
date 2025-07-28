import {RouteNode} from "./RouteNode";
import {Polygon} from "./Polygon";

export default interface FloorLayoutData {
    polygons: Polygon[];
    nodes: RouteNode[];
}