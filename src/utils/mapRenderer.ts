import { Map, Marker, Popup } from "@maptiler/sdk";
import { Polygon } from "../interfaces/Polygon";
import { Beacon } from "../interfaces/Beacon";
import { RouteNode } from "../interfaces/RouteNode";
import { calculatePolygonCenter, generateEdgeKey } from "./mapUtils";
import { createLogger } from "./logger";

const logger = createLogger("MapRenderer");

export interface MapRenderingRefs {
    mapMarkers: React.MutableRefObject<{ [key: string]: Marker }>;
    mapLayers: React.MutableRefObject<{ [key: string]: string }>;
    mapSources: React.MutableRefObject<{ [key: string]: string }>;
}

/**
 * Renders polygons on the map
 */
export function renderPolygons(
    map: Map,
    polygons: Polygon[],
    refs: MapRenderingRefs,
    selectedItemId?: number
) {
    polygons.forEach((p) => {
        const polygon = p.properties;
        if (polygon.is_visible && p.geometry.coordinates[0].length >= 3) {
            const coordinates = p.geometry.coordinates;
            const sourceId = `polygon-source-${polygon.id}`;
            const layerId = `polygon-layer-${polygon.id}`;

            map.addSource(sourceId, {
                type: "geojson",
                data: {
                    type: "Feature",
                    geometry: {
                        type: "Polygon",
                        coordinates: coordinates,
                    },
                    properties: {},
                },
            });

            map.addLayer({
                id: layerId,
                type: "fill",
                source: sourceId,
                paint: {
                    "fill-color": polygon.color,
                    "fill-opacity": selectedItemId === polygon.id ? 0.8 : 0.6,
                },
            });

            // Add border
            const borderLayerId = `polygon-border-${polygon.id}`;
            map.addLayer({
                id: borderLayerId,
                type: "line",
                source: sourceId,
                paint: {
                    "line-color": selectedItemId === polygon.id ? "#ef4444" : polygon.color,
                    "line-width": selectedItemId === polygon.id ? 4 : 2,
                },
            });

            // Track sources and layers
            refs.mapSources.current[`polygon-${polygon.id}`] = sourceId;
            refs.mapLayers.current[`polygon-${polygon.id}`] = layerId;
            refs.mapLayers.current[`polygon-border-${polygon.id}`] = borderLayerId;

            // Add center marker for interaction
            const center = calculatePolygonCenter(p.geometry.coordinates);
            refs.mapMarkers.current[`polygon-${polygon.id}`] = new Marker({
                color: polygon.color,
                scale: 0.8,
            })
                .setLngLat([center.lng, center.lat])
                .setPopup(
                    new Popup().setHTML(
                        `<strong>${polygon.name}</strong><br>Type: ${polygon.type}`
                    )
                )
                .addTo(map);
        }
    });
}

/**
 * Renders beacons on the map
 */
export function renderBeacons(
    map: Map,
    beacons: Beacon[],
    refs: MapRenderingRefs,
    selectedItemId?: number
) {
    beacons.forEach((b) => {
        const beacon = b.properties;
        if (beacon.is_visible && b.geometry) {
            const isSelected = selectedItemId === beacon.id;
            refs.mapMarkers.current[`beacon-${beacon.id}`] = new Marker({
                color: isSelected ? "#ef4444" : "#fbbf24",
                scale: isSelected ? 1.2 : 1.0,
            })
                .setLngLat(b.geometry.coordinates)
                .setPopup(
                    new Popup().setHTML(
                        `<strong>${beacon.name}</strong><br>Type: Beacon${isSelected ? " (SELECTED)" : ""}`
                    )
                )
                .addTo(map);
        }
    });
}

/**
 * Renders route nodes on the map
 */
export function renderRouteNodes(
    map: Map,
    nodes: RouteNode[],
    refs: MapRenderingRefs,
    selectedNodeId?: number | null,
    selectedItemId?: number
) {
    logger.info("Processing nodes for rendering", {
        totalNodes: nodes.length,
        visibleNodes: nodes.filter((n) => n.properties.is_visible).length,
    });

    nodes.forEach((node) => {
        if (node.properties.is_visible && node.geometry) {
            const isSelectedForConnection = selectedNodeId === node.properties.id;
            const isSelectedItem = selectedItemId === node.properties.id;
            const nodeType = node.properties.node_type;
            
            let markerElement: HTMLElement | undefined;
            
            // Create custom marker for elevator/stairs nodes
            if (nodeType === 'elevator' || nodeType === 'stairs') {
                markerElement = document.createElement('div');
                markerElement.className = 'custom-node-marker';
                markerElement.style.cssText = `
                    width: 24px;
                    height: 24px;
                    background-color: ${isSelectedForConnection ? '#22c55e' : '#3b82f6'};
                    border: 2px solid white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: bold;
                    color: white;
                    cursor: pointer;
                `;
                markerElement.textContent = nodeType === 'elevator' ? 'E' : 'S';
            }
            
            const markerColor = isSelectedItem ? "#ef4444" : 
                               isSelectedForConnection ? "#22c55e" : "#3b82f6";
            const markerScale = isSelectedItem ? 1.2 : 1.0;
            
            const marker = markerElement 
                ? new Marker({ element: markerElement })
                : new Marker({ color: markerColor, scale: markerScale });
            
            refs.mapMarkers.current[`node-${node.properties.id}`] = marker
                .setLngLat(node.geometry.coordinates)
                .addTo(map);
                
            logger.info("Node marker added to map", {
                nodeId: node.properties.id,
                markerKey: `node-${node.properties.id}`,
                nodeType,
                isSelectedForConnection,
            });
        }
    });
}

/**
 * Renders connections between route nodes
 */
export function renderConnections(
    map: Map,
    nodes: RouteNode[],
    refs: MapRenderingRefs
) {
    const renderedEdges = new Set<string>();

    logger.info("Processing connections for all nodes", {
        totalNodes: nodes.length,
        nodesWithConnections: nodes.filter(n => n.properties.connections && n.properties.connections.length > 0).length
    });

    nodes.forEach((node) => {
        if (!node.properties.is_visible || !node.geometry) return;

        if (!node.properties.connections || !Array.isArray(node.properties.connections)) {
            return;
        }

        node.properties.connections.forEach((connectedNodeId) => {
            const targetNode = nodes.find(n => n.properties.id === connectedNodeId);

            if (!targetNode || !targetNode.properties.is_visible || !targetNode.geometry) {
                return;
            }

            // Prevent duplicate edges
            const edgeKey = generateEdgeKey(node.properties.id, connectedNodeId);
            if (renderedEdges.has(edgeKey)) return;
            renderedEdges.add(edgeKey);

            const sourceId = `edge-source-${edgeKey}`;
            const layerId = `edge-layer-${edgeKey}`;

            const fromCoords = node.geometry!.coordinates;
            const toCoords = targetNode.geometry.coordinates;

            map.addSource(sourceId, {
                type: "geojson",
                data: {
                    type: "Feature",
                    geometry: {
                        type: "LineString",
                        coordinates: [fromCoords, toCoords],
                    },
                    properties: {},
                },
            });

            map.addLayer({
                id: layerId,
                type: "line",
                source: sourceId,
                paint: {
                    "line-color": "#3b82f6",
                    "line-width": 3,
                    "line-opacity": 0.8,
                },
            });

            refs.mapSources.current[`edge-${edgeKey}`] = sourceId;
            refs.mapLayers.current[`edge-${edgeKey}`] = layerId;
        });
    });
}

/**
 * Clears all map layers and markers
 */
export function clearMapData(map: Map, refs: MapRenderingRefs) {
    // Clear existing markers and layers
    Object.values(refs.mapMarkers.current).forEach((marker) => {
        if (marker && typeof marker.remove === 'function') {
            try {
                marker.remove();
            } catch (error) {
                console.warn('Error removing marker:', error);
            }
        }
    });
    refs.mapMarkers.current = {};

    // Remove layers
    Object.values(refs.mapLayers.current).forEach((layerId) => {
        try {
            if (map.getLayer(layerId)) {
                map.removeLayer(layerId);
            }
        } catch (error) {
            console.warn('Error removing layer:', layerId, error);
        }
    });
    refs.mapLayers.current = {};

    // Remove sources
    Object.values(refs.mapSources.current).forEach((sourceId) => {
        try {
            if (map.getSource(sourceId)) {
                map.removeSource(sourceId);
            }
        } catch (error) {
            console.warn('Error removing source:', sourceId, error);
        }
    });
    refs.mapSources.current = {};
}