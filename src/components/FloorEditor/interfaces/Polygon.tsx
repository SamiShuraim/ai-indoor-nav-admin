import {Point} from "./Point";

export interface Polygon {
    id: number;
    floorId: number;
    name: string;
    points: Point[];
    type: "poi" | "wall";
    visible: boolean;
    color: string;
}