export interface NavigationEdge {
    id: number;
    floorId: number;
    fromNodeId: number;
    toNodeId: number;
    weight?: number;
}