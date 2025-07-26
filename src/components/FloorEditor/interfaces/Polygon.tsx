import {Point} from "./Point";

export interface Polygon {
    id: string;
    name: string;
    points: Point[];
    type: "poi" | "wall";
    visible: boolean;
    color: string;
}