import {Building} from "./building";
import {POI} from "./POI";
import {NavigationNode} from "./navigationNode";

export interface Floor {
    id: number;
    name: string;
    floorNumber: number;
    buildingId: number;
    building?: Building;
    nodes?: NavigationNode[];
    pois?: POI[];
}