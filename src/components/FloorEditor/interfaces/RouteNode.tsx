export interface RouteNode {
    id: number;
    floorId: number;
    x: number;
    y: number;
    connections: number[];
    visible: boolean;
}