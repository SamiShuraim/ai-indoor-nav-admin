import {POI} from "./POI";
import {NavigationNode} from "./navigationNode";
import {NavigationEdge} from "./navigationEdge";

export interface FloorLayoutData {
    pois: POI[];
    nodes: NavigationNode[];
    edges: NavigationEdge[];
}