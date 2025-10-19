import { config, Map, Marker, Point } from "@maptiler/sdk";
import { MapClickEvent } from "../types/common";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { MAPTILER_API_KEY, MAPTILER_STYLE_URL } from "../constants/api";
import { UI_MESSAGES } from "../constants/ui";
import { beaconsApi, floorsApi, polygonsApi, routeNodesApi } from "../utils/api";
import { createLogger } from "../utils/logger";
import { convertPointsToCoordinates, isCloseToFirstPoint, findNodeNearCoordinates } from "../utils/mapUtils";
import { renderPolygons, renderBeacons, renderRouteNodes, renderConnections, clearMapData } from "../utils/mapRenderer";
import { useMapState } from "../hooks/useMapState";
import { useDrawingState } from "../hooks/useDrawingState";
import { useDialogState } from "../hooks/useDialogState";
import "./FloorEditor.css";
import BeaconDialog from "./FloorEditor/BeaconDialog";
import DrawingToolbar from "./FloorEditor/DrawingToolbar";
import ActionsSection from "./FloorEditor/ActionsSection";
import LayersPanel from "./FloorEditor/LayersPanel";
import MapContainer from "./FloorEditor/MapContainer";
import PolygonDialog from "./FloorEditor/PolygonDialog";
import RouteNodeDialog from "./FloorEditor/RouteNodeDialog";
import MultiFloorNodeDialog, { NodeType } from "./FloorEditor/MultiFloorNodeDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Container, Header } from "./common";
import { FloorEditorProps } from "../interfaces/FloorEditorProps";
import { Polygon, PolygonBuilder } from "../interfaces/Polygon";
import { RouteNode, RouteNodeBuilder } from "../interfaces/RouteNode";
import { Beacon, BeaconBuilder } from "../interfaces/Beacon";
import { useEntityMutations } from "./FloorEditor/useEntityMutations";
import { Floor } from "../interfaces/Floor";

const logger = createLogger("FloorEditor");

export const FloorEditor: React.FC<FloorEditorProps> = ({ floorId, onBack }) => {
    logger.info("FloorEditor component starting", { floorId, floorIdType: typeof floorId });

    const queryClient = useQueryClient();
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<Map | null>(null);

    // Custom hooks for state management
    const mapState = useMapState();
    const drawingState = useDrawingState();
    const dialogState = useDialogState();

    // Additional state
    const [layerFilter, setLayerFilter] = useState<"polygons" | "beacons" | "nodes">("polygons");
    const [isRecalculatingPoiNodes, setIsRecalculatingPoiNodes] = useState(false);

    // Refs for avoiding stale closures
    const nodesRef = useRef<RouteNode[]>([]);
    const nodesLoadingRef = useRef(true);

    // Data queries
    const { data: floor, isLoading: loading, isError: error } = useQuery<Floor>({
        queryKey: ['floor', floorId],
        queryFn: () => floorsApi.getById(floorId),
    });

    const { data: buildingFloors = [] } = useQuery<Floor[]>({
        queryKey: ['buildingFloors', floor?.buildingId],
        queryFn: () => floorsApi.getByBuilding(floor!.buildingId),
        enabled: !!floor?.buildingId,
    });

    const { data: polygons = [] } = useQuery<Polygon[]>({
        queryKey: ['pois', floorId],
        queryFn: () => polygonsApi.getByFloor(floorId.toString()),
    });

    const { data: beacons = [] } = useQuery<Beacon[]>({
        queryKey: ['beacons', floorId],
        queryFn: () => beaconsApi.getByFloor(floorId.toString()),
    });

    const { data: nodes = [], isLoading: nodesLoading, error: nodesError, isError: nodesIsError, refetch: refetchNodes } = useQuery<RouteNode[]>({
        queryKey: ['routeNodes', floorId],
        queryFn: async () => {
            logger.info("🔄 REACT QUERY STARTING", { floorId, timestamp: new Date().toISOString() });
            
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Query timeout after 5 seconds')), 5000);
            });
            
            const apiPromise = routeNodesApi.getByFloor(floorId.toString());
            
            try {
                const result = await Promise.race([apiPromise, timeoutPromise]) as RouteNode[];
                logger.info("✅ REACT QUERY SUCCESS", { floorId, resultCount: result.length });
                return result;
            } catch (error) {
                logger.error("❌ REACT QUERY FAILED", error as Error);
                throw error;
            }
        },
        enabled: !!floorId,
        staleTime: 0,
        gcTime: 0,
        retry: 1,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        select: (data) => {
            return data.map(node => ({
                ...node,
                properties: {
                    ...node.properties,
                    connections: node.properties.connected_node_ids || node.properties.connections || []
                }
            }));
        }
    });

    // Update refs to avoid stale closures
    useEffect(() => {
        nodesRef.current = nodes;
        nodesLoadingRef.current = nodesLoading;
    }, [nodes, nodesLoading]);

    // Entity mutations
    const poisMutations = useEntityMutations('pois', polygonsApi);
    const beaconsMutations = useEntityMutations('beacons', beaconsApi);
    const routeNodesMutations = useEntityMutations('routeNodes', routeNodesApi);

    // Map initialization
    const initializeMap = useCallback(() => {
        if (!mapContainer.current) {
            logger.warn("Map container not available");
            return;
        }

        try {
            logger.info("Initializing map");
            config.apiKey = MAPTILER_API_KEY;

            if (!MAPTILER_API_KEY) {
                throw new Error("MapTiler API key is not set");
            }

            const mapInstance = new Map({
                container: mapContainer.current,
                style: MAPTILER_STYLE_URL,
                center: [50.142335, 26.313387],
                zoom: 18,
            });

            map.current = mapInstance;

            mapInstance.on("load", () => {
                if (mapState.mapLoadTimeout.current) {
                    clearTimeout(mapState.mapLoadTimeout.current);
                    mapState.mapLoadTimeout.current = null;
                }
                mapState.setMapLoading(false);
                mapState.setMapLoadedSuccessfully(true);
                logger.info("Map loaded successfully");
            });

            mapInstance.on("error", (e) => {
                if (!mapState.mapLoadedSuccessfully) {
                    logger.error("Map error during initial load", new Error(e.error?.message || "Map error"));
                    mapState.setMapLoading(false);
                }
            });

            mapInstance.on("click", handleMapClick);

            mapState.mapLoadTimeout.current = setTimeout(() => {
                if (mapState.mapLoading) {
                    logger.error("Map loading timeout");
                    mapState.setMapLoading(false);
                }
                mapState.mapLoadTimeout.current = null;
            }, 30000);

        } catch (error) {
            logger.error("Failed to initialize map", error as Error);
            mapState.setMapLoading(false);
        }
    }, [mapState]);

    // Map click handler
    const handleMapClick = useCallback((e: MapClickEvent) => {
        if (!map.current) return;

        const { lng, lat } = e.lngLat;
        const currentTool = drawingState.activeToolRef.current;

        switch (currentTool) {
            case "beacons":
                handleBeaconClick(lng, lat);
                break;
            case "nodes":
                handleNodeClick(lng, lat);
                break;
            case "elevatorStairs":
                handleElevatorStairsClick(lng, lat);
                break;
            case "poi":
                handlePolygonClick(lng, lat);
                break;
        }
    }, [drawingState]);

    // Map data update
    const updateMapData = useCallback(() => {
        if (!map.current || mapState.mapLoading || !mapState.mapLoadedSuccessfully) return;

        logger.info("Updating map data");
        try {
            clearMapData(map.current, {
                mapMarkers: mapState.mapMarkers,
                mapLayers: mapState.mapLayers,
                mapSources: mapState.mapSources
            });
        } catch (error) {
            console.warn('Error clearing map data:', error);
            return;
        }

        const selectedItemId = drawingState.selectedItem?.type === "polygon" ? drawingState.selectedItem.id :
                              drawingState.selectedItem?.type === "beacon" ? drawingState.selectedItem.id :
                              drawingState.selectedItem?.type === "node" ? drawingState.selectedItem.id : undefined;

        try {
            renderPolygons(map.current, polygons, {
                mapMarkers: mapState.mapMarkers,
                mapLayers: mapState.mapLayers,
                mapSources: mapState.mapSources
            }, selectedItemId);

            renderBeacons(map.current, beacons, {
                mapMarkers: mapState.mapMarkers,
                mapLayers: mapState.mapLayers,
                mapSources: mapState.mapSources
            }, selectedItemId);

            renderRouteNodes(map.current, nodes, {
                mapMarkers: mapState.mapMarkers,
                mapLayers: mapState.mapLayers,
                mapSources: mapState.mapSources
            }, drawingState.selectedNodeForConnection, selectedItemId);

            renderConnections(map.current, nodes, {
                mapMarkers: mapState.mapMarkers,
                mapLayers: mapState.mapLayers,
                mapSources: mapState.mapSources
            });
        } catch (error) {
            console.error('Error rendering map data:', error);
        }
    }, [mapState, drawingState, polygons, beacons, nodes]);

    // Click handlers
    const handleBeaconClick = useCallback((lng: number, lat: number) => {
        dialogState.openBeaconDialog(`Beacon ${beacons.length + 1}`, { lng, lat });
    }, [beacons.length, dialogState]);

    const handleNodeClick = useCallback(async (lng: number, lat: number) => {
        const currentNodes = nodesRef.current;
        const currentNodesLoading = nodesLoadingRef.current;
        
        if (currentNodesLoading) {
            logger.info("Nodes still loading, ignoring click");
            return;
        }
        
        const clickedNode = findNodeNearCoordinates(currentNodes, lng, lat);
        const currentSelectedNode = drawingState.selectedNodeForConnectionRef.current;

        if (clickedNode) {
            if (currentSelectedNode && currentSelectedNode !== clickedNode.properties.id) {
                try {
                    await routeNodesApi.addConnection(currentSelectedNode, clickedNode.properties.id);
                    refetchNodes();
                } catch (error) {
                    logger.error("Failed to connect nodes", error as Error);
                    alert("Failed to connect nodes. Please try again.");
                }
            } else {
                drawingState.setSelectedNodeForConnection(clickedNode.properties.id);
            }
        } else {
            try {
                if (currentSelectedNode) {
                    const newNodeId = await createNewNode(lng, lat, currentSelectedNode);
                    drawingState.setSelectedNodeForConnection(newNodeId);
                } else if (currentNodes.length === 0) {
                    const newNodeId = await createNewNode(lng, lat, null);
                    drawingState.setSelectedNodeForConnection(newNodeId);
                } else {
                    alert("Please click on an existing node first to connect the new node to it.");
                }
            } catch (error) {
                logger.error("Failed to create node", error as Error);
                alert("Failed to create node. Please try again.");
            }
        }
    }, [drawingState, refetchNodes]);

    const handleElevatorStairsClick = useCallback(async (lng: number, lat: number) => {
        const currentNodes = nodesRef.current;
        const clickedNode = findNodeNearCoordinates(currentNodes, lng, lat);

        if (clickedNode) {
            drawingState.setSelectedNodeForConnection(clickedNode.properties.id);
        } else {
            dialogState.openMultiFloorNodeDialog({ lng, lat });
        }
    }, [drawingState, dialogState]);

    const handlePolygonClick = useCallback((lng: number, lat: number) => {
        const newPoint: Point = { x: lng, y: lat } as Point;

        if (
            drawingState.pendingPolygonPointsRef.current.length >= 3 &&
            isCloseToFirstPoint(lng, lat, drawingState.pendingPolygonPointsRef.current[0])
        ) {
            // Close polygon and show dialog
            dialogState.openPolygonDialog();
            return;
        }

        const updatedPoints = [...drawingState.pendingPolygonPointsRef.current, newPoint];
        drawingState.setPendingPolygonPoints(updatedPoints);
        drawingState.pendingPolygonPointsRef.current = updatedPoints;

        if (updatedPoints.length === 1) {
            drawingState.setIsDrawingPolygon(true);
        }

        // Add visual feedback for the point (implement addPolygonPointMarker)
        addPolygonPointMarker(lng, lat, updatedPoints.length - 1);
    }, [drawingState, dialogState]);

    // Create new node helper
    const createNewNode = async (lng: number, lat: number, connectToNodeId: number | null): Promise<number> => {
        const newNodeData = new RouteNodeBuilder()
            .setFloorId(floorId)
            .setLocation(lng, lat)
            .setIsVisible(true)
            .build();

        const createdNode = await routeNodesMutations.create.mutateAsync({ data: newNodeData });
        const newNodeId = createdNode?.id || createdNode?.properties?.id;

        if (!newNodeId) {
            throw new Error("Backend didn't return node ID");
        }

        if (connectToNodeId) {
            await routeNodesApi.addConnection(newNodeId, connectToNodeId);
        }

        await refetchNodes();
        return newNodeId;
    };

    // Placeholder for polygon point marker (implement based on original)
    const addPolygonPointMarker = (lng: number, lat: number, pointIndex: number) => {
        // Implementation from original FloorEditor
        if (!map.current) return;
        
        const isFirst = pointIndex === 0;
        const color = isFirst ? "#ff0000" : "#00aa00";

        const markerElement = document.createElement("div");
        markerElement.style.width = "10px";
        markerElement.style.height = "10px";
        markerElement.style.borderRadius = "50%";
        markerElement.style.backgroundColor = color;
        markerElement.style.border = "2px solid white";
        markerElement.style.boxShadow = "0 0 4px rgba(0,0,0,0.3)";

        const marker = new Marker({ element: markerElement })
            .setLngLat([lng, lat])
            .addTo(map.current);

        mapState.tempDrawingMarkers.current.push(marker);
    };

    // Save handlers
    const handlePolygonSave = async () => {
        dialogState.updateSaveStatus("saving");

        try {
            if (drawingState.editingPolygonId) {
                const polygon = polygons.find((p) => p.properties.id === drawingState.editingPolygonId);
                if (polygon) {
                    const updated = PolygonBuilder.fromPolygon(polygon).setName(dialogState.polygonName).build();
                    await poisMutations.update.mutateAsync({ data: updated });
                }
            } else {
                const newPolygon = new PolygonBuilder()
                    .setFloorId(floorId)
                    .setName(dialogState.polygonName)
                    .setDescription("")
                    .setType("Room")
                    .setIsVisible(true)
                    .setColor("#3b82f6")
                    .setCategoryId(null)
                    .setGeometry(convertPointsToCoordinates(drawingState.pendingPolygonPoints))
                    .build();

                const { id, ...propertiesWithoutId } = newPolygon.properties;
                const polygonForCreation = { ...newPolygon, properties: propertiesWithoutId };
                await poisMutations.create.mutateAsync({ data: polygonForCreation });
            }

            dialogState.updateSaveStatus("success");
            dialogState.closePolygonDialog();
            drawingState.resetPolygonDrawing();
            mapState.clearTempDrawing(map.current);
        } catch (error) {
            logger.error("Failed to save polygon", error as Error);
            dialogState.updateSaveStatus("error", "Failed to save polygon: " + (error as Error).message);
        }
    };

    const handleBeaconSave = async () => {
        dialogState.updateSaveStatus("saving");

        try {
            if (dialogState.editingBeaconId) {
                const beacon = beacons.find((b) => b.properties.id === dialogState.editingBeaconId);
                if (beacon) {
                    const updated = BeaconBuilder.fromBeacon(beacon).setName(dialogState.beaconName).build();
                    await beaconsMutations.update.mutateAsync({ data: updated });
                }
            } else if (dialogState.pendingBeaconLocation) {
                const newBeacon = new BeaconBuilder()
                    .setFloorId(floorId)
                    .setName(dialogState.beaconName)
                    .setGeometry(dialogState.pendingBeaconLocation.lng, dialogState.pendingBeaconLocation.lat)
                    .setIsVisible(true)
                    .setIsActive(true)
                    .setBatteryLevel(100)
                    .build();

                const { id, ...propertiesWithoutId } = newBeacon.properties;
                const beaconForCreation = { ...newBeacon, properties: propertiesWithoutId };
                await beaconsMutations.create.mutateAsync({ data: beaconForCreation });
            }

            dialogState.updateSaveStatus("success");
            dialogState.closeBeaconDialog();
        } catch (error) {
            logger.error("Failed to save beacon", error as Error);
            dialogState.updateSaveStatus("error", "Failed to save beacon: " + (error as Error).message);
        }
    };

    const handleNodeSave = async () => {
        dialogState.updateSaveStatus("saving");

        try {
            if (dialogState.editingNodeId) {
                const node = nodes.find((n) => n.properties.id === dialogState.editingNodeId);
                if (node) {
                    const updated = RouteNodeBuilder.fromRouteNode(node).setLevel(dialogState.nodeLevel).build();
                    await routeNodesMutations.update.mutateAsync({ data: updated });
                }
            }

            dialogState.updateSaveStatus("success");
            dialogState.closeNodeDialog();
        } catch (error) {
            logger.error("Failed to save route node", error as Error);
            dialogState.updateSaveStatus("error", "Failed to save route node: " + (error as Error).message);
        }
    };

    // Multi-floor node save handler
    const handleMultiFloorNodeSave = async (nodeType: NodeType, selectedFloors: number[]) => {
        if (!dialogState.pendingMultiFloorLocation) return;

        const { lng, lat } = dialogState.pendingMultiFloorLocation;
        const currentSelectedNode = drawingState.selectedNodeForConnectionRef.current;

        try {
            dialogState.updateSaveStatus("saving");
            const createdNodeIds: number[] = [];

            for (const targetFloorId of selectedFloors) {
                let connectToNodeId: number | null = null;
                if (targetFloorId === floorId && currentSelectedNode) {
                    connectToNodeId = currentSelectedNode;
                }

                const newNodeData = new RouteNodeBuilder()
                    .setFloorId(targetFloorId)
                    .setLocation(lng, lat)
                    .setIsVisible(true)
                    .setNodeType(nodeType)
                    .build();

                const createdNode = await routeNodesMutations.create.mutateAsync({ data: newNodeData });
                const newNodeId = createdNode?.id || createdNode?.properties?.id;

                if (!newNodeId) {
                    throw new Error("Backend didn't return node ID");
                }

                createdNodeIds.push(newNodeId);

                if (connectToNodeId) {
                    await routeNodesApi.addConnection(newNodeId, connectToNodeId);
                }
            }

            // Connect multi-floor nodes to each other
            if (createdNodeIds.length > 1) {
                for (let i = 0; i < createdNodeIds.length; i++) {
                    const currentNodeId = createdNodeIds[i];
                    const otherNodeIds = createdNodeIds.filter(id => id !== currentNodeId);

                    for (const otherNodeId of otherNodeIds) {
                        await routeNodesApi.addConnection(currentNodeId, otherNodeId);
                    }
                }
            }

            dialogState.updateSaveStatus("success");
            dialogState.closeMultiFloorNodeDialog();
            refetchNodes();

            // Auto-select the newly created node on current floor
            const currentFloorNodeIndex = selectedFloors.indexOf(floorId);
            if (currentFloorNodeIndex !== -1) {
                const currentFloorNodeId = createdNodeIds[currentFloorNodeIndex];
                drawingState.setSelectedNodeForConnection(currentFloorNodeId);
            }
        } catch (error) {
            logger.error("Failed to create multi-floor nodes", error as Error);
            dialogState.updateSaveStatus("error", "Failed to create multi-floor nodes: " + (error as Error).message);
        }
    };

    // Delete handler
    const handleDeleteItem = async (type: "polygon" | "beacon" | "node", id: number, e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        dialogState.updateSaveStatus("saving");

        try {
            switch (type) {
                case "polygon":
                    await poisMutations.delete.mutateAsync(id);
                    break;
                case "beacon":
                    await beaconsMutations.delete.mutateAsync(id);
                    break;
                case "node":
                    await routeNodesMutations.delete.mutateAsync(id);
                    break;
            }
            dialogState.updateSaveStatus("success");
        } catch (error) {
            logger.error(`Failed to delete ${type}`, error as Error);
            dialogState.updateSaveStatus("error", `Failed to delete ${type}: ` + (error as Error).message);
        }

        if (drawingState.selectedItem?.type === type && drawingState.selectedItem?.id === id) {
            drawingState.setSelectedItem(null);
        }
    };

    // Layer visibility toggle
    const toggleLayerVisibility = (type: "polygon" | "beacon" | "node", id: number) => {
        logger.userAction("Layer visibility toggled", { type, id });

        switch (type) {
            case "polygon":
                queryClient.setQueryData<Polygon[]>(['pois', floorId], (old = []) => {
                    return old.map(polygon => {
                        if (polygon.properties.id === id) {
                            const newVisible = !polygon.properties.is_visible;
                            logger.userAction("Polygon visibility toggled", { id, newVisible });
                            return PolygonBuilder.fromPolygon(polygon).setIsVisible(newVisible).build();
                        }
                        return polygon;
                    });
                });
                break;

            case "beacon":
                queryClient.setQueryData<Beacon[]>(['beacons', floorId], (old = []) => {
                    return old.map(beacon => {
                        if (beacon.properties.id === id) {
                            const newVisible = !beacon.properties.is_visible;
                            logger.userAction("Beacon visibility toggled", { id, newVisible });
                            return BeaconBuilder.fromBeacon(beacon).setIsVisible(newVisible).build();
                        }
                        return beacon;
                    });
                });
                break;

            case "node":
                queryClient.setQueryData<RouteNode[]>(['routeNodes', floorId], (old = []) => {
                    return old.map(node => {
                        if (node.properties.id === id) {
                            const newVisible = !node.properties.is_visible;
                            logger.userAction("Node visibility toggled", { id, newVisible });
                            return RouteNodeBuilder.fromRouteNode(node).setIsVisible(newVisible).build();
                        }
                        return node;
                    });
                });
                break;
        }
    };

    // Edit handler
    const handleEditItem = (type: "polygon" | "beacon" | "node", id: number, e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        
        switch (type) {
            case "polygon":
                const polygon = polygons.find((p) => p.properties.id === id);
                if (polygon) {
                    dialogState.openPolygonDialog(polygon.properties.name, id);
                    drawingState.setSelectedItem({ type, id });
                }
                break;
            case "beacon":
                const beacon = beacons.find((b) => b.properties.id === id);
                if (beacon) {
                    dialogState.openBeaconDialog(beacon.properties.name, null, id);
                    drawingState.setSelectedItem({ type, id });
                }
                break;
            case "node":
                const node = nodes.find((n) => n.properties.id === id);
                if (node) {
                    dialogState.openNodeDialog(`Node ${node.properties.id}`, id, node.properties.level);
                    drawingState.setSelectedItem({ type, id });
                }
                break;
        }
    };

    // Layer item click handler
    const handleLayerItemClick = (type: "polygon" | "beacon" | "node", id: number) => {
        logger.userAction("Layer item clicked", { type, id });
        
        // Set the selected item for highlighting
        drawingState.setSelectedItem({ type, id });
        drawingState.setActiveTool("select");
        
        // Center the map on the selected item if possible
        if (map.current) {
            try {
                let coordinates: [number, number] | null = null;
                
                switch (type) {
                    case "polygon":
                        const polygon = polygons.find(p => p.properties.id === id);
                        if (polygon && polygon.geometry.coordinates[0].length > 0) {
                            // Calculate center of polygon
                            const ring = polygon.geometry.coordinates[0];
                            const centerX = ring.reduce((sum, point) => sum + point[0], 0) / ring.length;
                            const centerY = ring.reduce((sum, point) => sum + point[1], 0) / ring.length;
                            coordinates = [centerX, centerY];
                        }
                        break;
                        
                    case "beacon":
                        const beacon = beacons.find(b => b.properties.id === id);
                        if (beacon && beacon.geometry) {
                            coordinates = beacon.geometry.coordinates;
                        }
                        break;
                        
                    case "node":
                        const node = nodes.find(n => n.properties.id === id);
                        if (node && node.geometry) {
                            coordinates = node.geometry.coordinates;
                        }
                        break;
                }
                
                // Pan to the item's location with smooth animation
                if (coordinates) {
                    map.current.flyTo({
                        center: coordinates,
                        zoom: Math.max(map.current.getZoom(), 18), // Ensure good zoom level
                        duration: 1000 // 1 second animation
                    });
                    
                    logger.userAction("Map centered on selected item", { type, id, coordinates });
                }
            } catch (error) {
                logger.error("Error centering map on selected item", error as Error);
            }
        }
    };

    // POI recalculation handler
    const handleRecalculatePoiNodes = async () => {
        setIsRecalculatingPoiNodes(true);
        dialogState.updateSaveStatus("saving");

        try {
            const result = await polygonsApi.recalculateClosestNodes(floorId);
            dialogState.updateSaveStatus("success");
            logger.info('POI closest nodes recalculated successfully', { result });
        } catch (error) {
            logger.error('Failed to recalculate POI closest nodes', error as Error);
            dialogState.updateSaveStatus("error", "Failed to recalculate POI closest nodes: " + (error as Error).message);
        } finally {
            setIsRecalculatingPoiNodes(false);
        }
    };

    // Effects
    useEffect(() => {
        if (!loading && mapContainer.current && !map.current) {
            initializeMap();
        }
    }, [loading, initializeMap]);

    useEffect(() => {
        if (mapState.mapLoadedSuccessfully && !mapState.mapLoading) {
            updateMapData();
        }
    }, [polygons, beacons, nodes, drawingState.selectedNodeForConnection, mapState.mapLoadedSuccessfully, mapState.mapLoading, updateMapData]);

    useEffect(() => {
        return () => {
            mapState.cleanup();
            if (map.current) {
                try {
                    map.current.remove();
                } catch (error) {
                    console.warn('Error removing map:', error);
                }
            }
        };
    }, []); // Empty dependency array - only cleanup on unmount

    if (loading) {
        return (
            <Container variant="PAGE">
                <Header
                    title={UI_MESSAGES.FLOOR_EDITOR_TITLE}
                    actions={<Button variant="SECONDARY" onClick={onBack}>{UI_MESSAGES.FLOOR_EDITOR_BACK_BUTTON}</Button>}
                />
                <div className="loading-message">{UI_MESSAGES.FLOOR_EDITOR_LOADING}</div>
            </Container>
        );
    }

    return (
        <Container variant="PAGE">
            <Header
                title={`${UI_MESSAGES.FLOOR_EDITOR_TITLE} - ${floor?.name || "Unknown Floor"}`}
                actions={
                    <div className="header-actions">
                        {dialogState.saveStatus === "saving" && <span className="save-status saving">Saving...</span>}
                        {dialogState.saveStatus === "success" && <span className="save-status success">Saved successfully!</span>}
                        {dialogState.saveError && <span className="save-status error">{dialogState.saveError}</span>}
                        <Button variant="SECONDARY" onClick={onBack}>{UI_MESSAGES.FLOOR_EDITOR_BACK_BUTTON}</Button>
                    </div>
                }
            />

            {error && <div className="floor-editor-error">{error}</div>}

            <div className="floor-editor-layout">
                <ActionsSection
                    floorId={floorId}
                    onRecalculatePoiNodes={handleRecalculatePoiNodes}
                    isRecalculatingPoiNodes={isRecalculatingPoiNodes}
                />

                <DrawingToolbar
                    activeTool={drawingState.activeTool}
                    onToolChange={drawingState.handleToolChange}
                    isDrawingPolygon={drawingState.isDrawingPolygon}
                    pendingPolygonPoints={drawingState.pendingPolygonPoints.length}
                    onCancelDrawing={() => {
                        drawingState.resetPolygonDrawing();
                        drawingState.resetNodeSelection();
                        mapState.clearTempDrawing(map.current);
                    }}
                    onClearAll={async () => {
                        dialogState.updateSaveStatus("saving");
                        try {
                            for (const polygon of polygons) {
                                await poisMutations.delete.mutateAsync(polygon.properties.id);
                            }
                            for (const beacon of beacons) {
                                await beaconsMutations.delete.mutateAsync(beacon.properties.id);
                            }
                            for (const node of nodes) {
                                await routeNodesMutations.delete.mutateAsync(node.properties.id);
                            }
                            dialogState.updateSaveStatus("success");
                        } catch (error) {
                            logger.error("Failed to clear all data", error as Error);
                            dialogState.updateSaveStatus("error", "Failed to clear all data: " + (error as Error).message);
                        }
                    }}
                    nodesCount={nodes.length}
                    selectedNodeForConnection={drawingState.selectedNodeForConnection}
                    lastPlacedNodeId={drawingState.lastPlacedNodeId}
                />

                <div className="editor-main">
                    <MapContainer
                        mapRef={mapContainer}
                        mapLoading={mapState.mapLoading}
                        activeTool={drawingState.activeTool}
                        currentCoordinates={mapState.currentCoordinates}
                        error={null}
                    />

                    <LayersPanel
                        polygons={polygons}
                        beacons={beacons}
                        nodes={nodes}
                        layerFilter={layerFilter}
                        selectedItem={drawingState.selectedItem}
                        onFilterChange={setLayerFilter}
                        onLayerItemClick={handleLayerItemClick}
                        onToggleVisibility={toggleLayerVisibility}
                        onEditItem={handleEditItem}
                        onDeleteItem={handleDeleteItem}
                    />
                </div>
            </div>

            {/* Dialogs */}
            <PolygonDialog
                show={dialogState.showPolygonDialog}
                polygonName={dialogState.polygonName}
                isWallMode={false}
                isEditing={!!drawingState.editingPolygonId}
                onNameChange={dialogState.setPolygonName}
                onWallModeChange={() => {}}
                onSave={handlePolygonSave}
                onCancel={dialogState.closePolygonDialog}
            />

            <BeaconDialog
                show={dialogState.showBeaconDialog}
                beaconName={dialogState.beaconName}
                isEditing={!!dialogState.editingBeaconId}
                onNameChange={dialogState.setBeaconName}
                onSave={handleBeaconSave}
                onCancel={dialogState.closeBeaconDialog}
            />

            <RouteNodeDialog
                show={dialogState.showNodeDialog}
                nodeName={dialogState.nodeName}
                isEditing={!!dialogState.editingNodeId}
                level={dialogState.nodeLevel}
                onNameChange={dialogState.setNodeName}
                onLevelChange={dialogState.setNodeLevel}
                onSave={handleNodeSave}
                onCancel={dialogState.closeNodeDialog}
            />

            <MultiFloorNodeDialog
                show={dialogState.showMultiFloorNodeDialog}
                currentFloorId={floorId}
                availableFloors={buildingFloors}
                onSave={handleMultiFloorNodeSave}
                onCancel={dialogState.closeMultiFloorNodeDialog}
            />
        </Container>
    );
};