export interface Polygon {
    id: number;
    floorId: number;
    name: string;
    description: string;
    type: "Room" | "Stairs" | "Elevator" | "Wall";
    isVisible: boolean;
    color: string;
    categoryId: number;
    geometry: {
        type: "Polygon";
        coordinates: number[][][];
    };
}