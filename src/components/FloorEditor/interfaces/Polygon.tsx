export interface Polygon {
    id: number;
    floorId: number;
    name: string;
    type: "Room" | "Stairs" | "Elevator" | "Wall";
    visible: boolean;
    color: string;
    geometry: {
        type: "Polygon";
        coordinates: number[][][];
    };
}