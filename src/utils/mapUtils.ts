import { Point } from "@maptiler/sdk";

/**
 * Converts Point array to GeoJSON coordinates format
 */
export function convertPointsToCoordinates(points: Point[]): number[][][] {
    return [points.map(p => [p.x, p.y])];
}

/**
 * Calculates the center point of a polygon
 */
export function calculatePolygonCenter(coordinates: number[][][]): { lng: number; lat: number } {
    const ring = coordinates[0]; // outer ring
    const centerX = ring.reduce((sum, point) => sum + point[0], 0) / ring.length;
    const centerY = ring.reduce((sum, point) => sum + point[1], 0) / ring.length;
    return { lng: centerX, lat: centerY };
}

/**
 * Checks if a clicked point is close to the first point (for polygon closure)
 */
export function isCloseToFirstPoint(
    lng: number,
    lat: number,
    firstPoint: Point,
    maxDelta: number = 0.00001
): boolean {
    const deltaLng = Math.abs(lng - firstPoint.x);
    const deltaLat = Math.abs(lat - firstPoint.y);
    return deltaLng < maxDelta && deltaLat < maxDelta;
}

/**
 * Calculates distance between two coordinate points
 */
export function calculateDistance(
    coord1: [number, number],
    coord2: [number, number]
): number {
    return Math.sqrt(
        (coord1[0] - coord2[0]) ** 2 + (coord1[1] - coord2[1]) ** 2
    );
}

/**
 * Finds a node near the clicked coordinates
 */
export function findNodeNearCoordinates<T extends { geometry: { coordinates: [number, number] } | null; properties: { is_visible: boolean } }>(
    nodes: T[],
    lng: number,
    lat: number,
    threshold: number = 0.00001
): T | null {
    return nodes.find((node) => {
        if (!node.properties.is_visible || !node.geometry) return false;
        const distance = calculateDistance(node.geometry.coordinates, [lng, lat]);
        return distance < threshold;
    }) || null;
}

/**
 * Generates unique edge key for preventing duplicate connections
 */
export function generateEdgeKey(nodeId1: number, nodeId2: number): string {
    return [nodeId1, nodeId2].sort((a, b) => a - b).join("-");
}

/**
 * Throttles coordinate updates to prevent excessive re-renders
 */
export function throttleCoordinateUpdate(
    updateFn: (lng: number, lat: number) => void,
    timeoutRef: React.MutableRefObject<NodeJS.Timeout | null>,
    delay: number = 100
) {
    return (lng: number, lat: number) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            updateFn(lng, lat);
            timeoutRef.current = null;
        }, delay);
    };
}