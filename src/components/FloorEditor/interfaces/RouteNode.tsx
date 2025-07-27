export interface RouteNode {
    id: string;
    floorId: number;
    x: number;
    y: number;
    connections: string[];
    visible: boolean;
}