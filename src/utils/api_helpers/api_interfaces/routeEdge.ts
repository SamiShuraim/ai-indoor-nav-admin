// Route Edges
export interface RouteEdge {
    id: number;
    floorId: number;
    fromNodeId: number;
    toNodeId: number;
    weight?: number;
    edgeType?: string;
    isBidirectional?: boolean;
    isVisible: boolean;
    createdAt: string;
    updatedAt: string;
}