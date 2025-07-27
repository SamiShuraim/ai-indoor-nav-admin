// Walls
export interface Wall {
    id: number;
    floorId: number;
    name?: string;
    wallType?: string;
    height?: number;
    isVisible: boolean;
    createdAt: string;
    updatedAt: string;
}