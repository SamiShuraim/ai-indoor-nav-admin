// Route Nodes
export interface RouteNode {
    id: number;
    floorId: number;
    x: number;
    y: number;
    nodeType?: string;
    isVisible: boolean;
    createdAt: string;
    updatedAt: string;
}