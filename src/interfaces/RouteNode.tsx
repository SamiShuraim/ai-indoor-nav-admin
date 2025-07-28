export interface RouteNode {
    id: number;
    floorId: number;
    location: {
        type: "Point";
        coordinates: [number, number]; // [x, y] as [longitude, latitude]
    } | null;
    isVisible: boolean;
    connections: number[]; // IDs of connected RouteNodes
}