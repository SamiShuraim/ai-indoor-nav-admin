import {config, Map, Marker, Point, Popup} from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {MAPTILER_API_KEY, MAPTILER_STYLE_URL} from "../constants/api";
import {UI_MESSAGES} from "../constants/ui";
import {beaconsApi, floorsApi, polygonsApi, routeNodesApi,} from "../utils/api";
import {createLogger} from "../utils/logger";
import "./FloorEditor.css";
import BeaconDialog from "./FloorEditor/BeaconDialog";
import DrawingToolbar, {DrawingTool} from "./FloorEditor/DrawingToolbar";
import LayersPanel from "./FloorEditor/LayersPanel";
import MapContainer from "./FloorEditor/MapContainer";
import PolygonDialog from "./FloorEditor/PolygonDialog";
import RouteNodeDialog from "./FloorEditor/RouteNodeDialog";
import {BaseApi} from "../utils/abstract_classes/baseApi";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {Button, Container, Header} from "./common";
import {useFloorLayoutData} from "./FloorEditor/UseFloorLayoutData";
import {FloorEditorProps} from "../interfaces/FloorEditorProps";
import {Polygon, PolygonBuilder} from "../interfaces/Polygon";
import {RouteNode, RouteNodeBuilder} from "../interfaces/RouteNode";
import {Beacon, BeaconBuilder} from "../interfaces/Beacon";
import {useEntityMutations} from "./FloorEditor/useEntityMutations";
import {Floor} from "../interfaces/Floor";

const logger = createLogger("FloorEditor");

// Queue system removed - now using immediate backend saves

// Removed loadFromApi - using direct API calls in queries

// Local storage removed - using immediate backend saves

function convertPointsToCoordinates(points: Point[]): number[][][] {
	return [points.map(p => [p.x, p.y])];
}

export const FloorEditor: React.FC<FloorEditorProps> = ({floorId, onBack}) => {
	// Remove the immediate console.log and replace with logger
	logger.info("FloorEditor component starting", {floorId});

	const queryClient = useQueryClient();

	const {data: floor, isLoading: loading, isError: error} = useQuery<Floor>({
		queryKey: ['floor', floorId],
		queryFn: () => floorsApi.getById(floorId),
	});
	const {data: floorData} = useFloorLayoutData(floorId, !!floor);

	// Map state
	const mapContainer = useRef<HTMLDivElement>(null);
	const map = useRef<Map | null>(null);
	const [mapLoading, setMapLoading] = useState(true);
	const [currentCoordinates, setCurrentCoordinates] = useState<{
		lng: number;
		lat: number;
	} | null>(null);
	const [mapLoadedSuccessfully, setMapLoadedSuccessfully] = useState(false);

	// Map markers and layers tracking
	const mapMarkers = useRef<{ [key: string]: any }>({});
	const mapLayers = useRef<{ [key: string]: string }>({});
	const mapSources = useRef<{ [key: string]: string }>({});

	// Temporary drawing markers for polygon creation
	const tempDrawingMarkers = useRef<any[]>([]);
	const tempDrawingLines = useRef<{ [key: string]: string }>({});

	// Timeout reference for cleanup
	const mapLoadTimeout = useRef<NodeJS.Timeout | null>(null);

	// Throttle coordinate updates to prevent infinite re-renders
	const coordinateUpdateTimeout = useRef<NodeJS.Timeout | null>(null);

	// Memoized coordinate update function
	const updateCoordinates = useCallback((lng: number, lat: number) => {
		setCurrentCoordinates({
			lng: Number(lng.toFixed(6)),
			lat: Number(lat.toFixed(6)),
		});
	}, []);

	// Drawing state
	const [activeTool, setActiveTool] = useState<DrawingTool>("select");
	const activeToolRef = useRef<DrawingTool>("select");

	const {data: polygons = []} = useQuery<Polygon[]>({
		queryKey: ['pois'],
		queryFn: () => polygonsApi.getAll(),
	});
	const {data: beacons = []} = useQuery<Beacon[]>({
		queryKey: ['beacons'],
		queryFn: () => beaconsApi.getAll(),
	});
	const {data: nodes = []} = useQuery<RouteNode[]>({
		queryKey: ['routeNodes'],
		queryFn: () => routeNodesApi.getAll(),
		select: (data) => {
			logger.info("🔍 RAW BACKEND DATA", { 
				nodeCount: data.length,
				fullData: data,
				nodeDetails: data.map(n => ({
					id: n.properties?.id,
					connections: n.properties?.connections,
					connected_node_ids: n.properties?.connected_node_ids,
					connectionsType: typeof n.properties?.connections,
					allProperties: n.properties
				}))
			});
			
			return data.map(node => ({
				...node,
				properties: {
					...node.properties,
					// Backend returns ConnectedNodeIds as connected_node_ids (snake_case)
					connections: node.properties.connected_node_ids || node.properties.connections || []
				}
			}));
		}
	});

	// Route node creation state
	const [selectedNodeForConnection, setSelectedNodeForConnection] = useState<
		number | null
	>(null);
	const selectedNodeForConnectionRef = useRef<number | null>(0);
	const [lastPlacedNodeId, setLastPlacedNodeId] = useState<number | null>(
		0
	);
	const lastPlacedNodeIdRef = useRef<number | null>(null);

	// Selection state
	const [selectedItem, setSelectedItem] = useState<{
		type: "polygon" | "beacon" | "node";
		id: number;
	} | null>(null);

	// Layer filter state
	const [layerFilter, setLayerFilter] = useState<
		"polygons" | "beacons" | "nodes"
	>("polygons");

	// Polygon dialog state
	const [showPolygonDialog, setShowPolygonDialog] = useState(false);
	const [polygonName, setPolygonName] = useState("");
    // const [isWallMode, setIsWallMode] = useState(false);

	// Beacon dialog state
	const [showBeaconDialog, setShowBeaconDialog] = useState(false);
	const [beaconName, setBeaconName] = useState("");
	const [pendingBeaconLocation, setPendingBeaconLocation] = useState<{
		lng: number;
		lat: number;
	} | null>(null);

	// Polygon drawing state
	const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
	const [currentPolygonPoints, setCurrentPolygonPoints] = useState<Point[]>(
		[]
	);
	const [pendingPolygonPoints, setPendingPolygonPoints] = useState<Point[]>(
		[]
	);
	const [pendingPolygonCenter, setPendingPolygonCenter] = useState<{
		lng: number;
		lat: number;
	} | null>(null);

	// Use refs to prevent state loss during re-renders
	const pendingPolygonPointsRef = useRef<Point[]>([]);
	const isDrawingPolygonRef = useRef<boolean>(false);
	const [editingPolygonId, setEditingPolygonId] = useState<number | null>(
		null
	);

	// Add missing state
	const [editingBeaconId, setEditingBeaconId] = useState<number | null>(null);
	const [showNodeDialog, setShowNodeDialog] = useState(false);
	const [nodeName, setNodeName] = useState("");
	const [editingNodeId, setEditingNodeId] = useState<number | null>(null);

	// Save status for immediate operations
	const [saveStatus, setSaveStatus] = useState<
		"idle" | "saving" | "success" | "error"
	>("idle");
	const [saveError, setSaveError] = useState<string | null>(null);

	const poisMutations = useEntityMutations('pois', polygonsApi);
	const beaconsMutations = useEntityMutations('beacons', beaconsApi);
	const routeNodesMutations = useEntityMutations('routeNodes', routeNodesApi);
	// Queue system removed

	useEffect(() => {
		logger.info("FloorEditor component mounted", {floorId});

		return () => {
			logger.info("FloorEditor component unmounted");

			// Clean up timeouts
			if (mapLoadTimeout.current) {
				clearTimeout(mapLoadTimeout.current);
				mapLoadTimeout.current = null;
			}

			if (coordinateUpdateTimeout.current) {
				clearTimeout(coordinateUpdateTimeout.current);
				coordinateUpdateTimeout.current = null;
			}

			// Clean up map
			if (map.current) {
				map.current.remove();
			}
		};
	}, [floorId]);

	// NOTE: Map initialization useEffect moved to after initializeMap function declaration

	// Function to update map with current data (called manually when needed)
	const updateMapData = useCallback(
		(
			currentPolygons: Polygon[],
			currentBeacons: Beacon[],
			currentNodes: RouteNode[],
			selectedNodeId?: number | null
		) => {
			if (!map.current) return;

			logger.info("Updating map with current data", {
				polygonsCount: currentPolygons.length,
				beaconsCount: currentBeacons.length,
				nodesCount: currentNodes.length,
				selectedNodeId,
                nodeIds: currentNodes.map((n) => n.properties.id),
				nodeDetails: currentNodes.map((n) => ({
                    id: n.properties.id,
                    location: n.geometry?.coordinates,
                    visible: n.properties.is_visible,
				})),
			});
			const mapInstance = map.current;

			// Clear existing markers and layers
			Object.values(mapMarkers.current).forEach((marker) =>
				marker.remove()
			);
			mapMarkers.current = {};

			// Remove layers
			Object.values(mapLayers.current).forEach((layerId) => {
				if (mapInstance.getLayer(layerId)) {
					mapInstance.removeLayer(layerId);
				}
			});
			mapLayers.current = {};

			// Remove sources
			Object.values(mapSources.current).forEach((sourceId) => {
				if (mapInstance.getSource(sourceId)) {
					mapInstance.removeSource(sourceId);
				}
			});
			mapSources.current = {};

			// Add polygons as filled areas
			currentPolygons.forEach((p) => {
				const polygon = p.properties;
                if (polygon.is_visible && p.geometry.coordinates[0].length >= 3) {
					const coordinates = p.geometry.coordinates;
                    console.log("WE ARE IN")
					const sourceId = `polygon-source-${polygon.id}`;
					const layerId = `polygon-layer-${polygon.id}`;

					mapInstance.addSource(sourceId, {
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

					mapInstance.addLayer({
						id: layerId,
						type: "fill",
						source: sourceId,
						paint: {
							"fill-color": polygon.color,
							"fill-opacity": 0.6,
						},
					});

					// Add border
					const borderLayerId = `polygon-border-${polygon.id}`;
					mapInstance.addLayer({
						id: borderLayerId,
						type: "line",
						source: sourceId,
						paint: {
							"line-color": polygon.color,
							"line-width": 2,
						},
					});

					// Track sources and layers
					mapSources.current[`polygon-${polygon.id}`] = sourceId;
					mapLayers.current[`polygon-${polygon.id}`] = layerId;
					mapLayers.current[`polygon-border-${polygon.id}`] =
						borderLayerId;

					// Add center marker for interaction using GeoJSON
					const ring = p.geometry.coordinates[0]; // outer ring

					const centerX = ring.reduce((sum, point) => sum + point[0], 0) / ring.length;
					const centerY = ring.reduce((sum, point) => sum + point[1], 0) / ring.length;


					mapMarkers.current[`polygon-${polygon.id}`] = new Marker({
						color: polygon.color,
						scale: 0.8,
					})
						.setLngLat([centerX, centerY])
						.setPopup(
							new Popup().setHTML(
								`<strong>${polygon.name}</strong><br>Type: ${polygon.type}`
							)
						)
						.addTo(mapInstance);
				}
			});

			// Add beacons
			currentBeacons.forEach((b) => {
				let beacon = b.properties;
                if (beacon.is_visible) {
					mapMarkers.current[`beacon-${beacon.id}`] = new Marker({color: "#fbbf24"})
						.setLngLat(b.geometry!!.coordinates)
						.setPopup(
							new Popup().setHTML(
								`<strong>${beacon.name}</strong><br>Type: Beacon`
							)
						)
						.addTo(mapInstance);
				}
			});

			// Add nodes
			logger.info("Processing nodes for rendering", {
				totalNodes: currentNodes.length,
                visibleNodes: currentNodes.filter((n) => n.properties.is_visible).length,
			});

			currentNodes.forEach((node) => {
				logger.info("Processing node", {
                    nodeId: node.properties.id,
                    visible: node.properties.is_visible,
                    location: node.geometry,
                    connections: node.properties.connections,
                    isSelectedForConnection: selectedNodeId === node.properties.id,
				});

                if (node.properties.is_visible) {
                    const isSelectedForConnection = selectedNodeId === node.properties.id;
                    mapMarkers.current[`node-${node.properties.id}`] = new Marker({
						color: isSelectedForConnection ? "#22c55e" : "#3b82f6", // Green for selected, blue for normal
					})
                        .setLngLat(node.geometry!!.coordinates)
						.addTo(mapInstance);
					logger.info("Node marker added to map", {
                        nodeId: node.properties.id,
                        markerKey: `node-${node.properties.id}`,
                        isSelectedForConnection,
					});
				} else {
					logger.warn("Node not visible, skipping", {
                        nodeId: node.properties.id,
					});
				}
			});

			const renderedEdges = new Set<string>(); // Prevent duplicate lines

			logger.info("Processing connections for all nodes", {
				totalNodes: currentNodes.length,
				nodesWithConnections: currentNodes.filter(n => n.properties.connections && n.properties.connections.length > 0).length
			});

			currentNodes.forEach((node) => {
                if (!node.properties.is_visible || !node.geometry) return;

                // Check if connections exist and is an array
                if (!node.properties.connections || !Array.isArray(node.properties.connections)) {
                    return;
                }

				if (node.properties.connections.length > 0) {
					logger.info("Node has connections", {
						nodeId: node.properties.id,
						connections: node.properties.connections,
						connectionsCount: node.properties.connections.length
					});
				}

                node.properties.connections.forEach((connectedNodeId) => {
                    const targetNode = currentNodes.find(n => n.properties.id === connectedNodeId);

					logger.info("Processing connection", {
						fromNodeId: node.properties.id,
						toNodeId: connectedNodeId,
						targetNodeFound: !!targetNode,
						targetNodeVisible: targetNode?.properties.is_visible,
						targetNodeHasGeometry: !!targetNode?.geometry
					});

					if (
						!targetNode ||
                        !targetNode.properties.is_visible ||
                        !targetNode.geometry
					) {
						logger.warn("Skipping connection due to missing/hidden node", {
                            fromId: node.properties.id,
							toId: connectedNodeId,
                            fromVisible: node.properties.is_visible,
                            toVisible: targetNode?.properties.is_visible,
						});
						return;
					}

					// Prevent duplicate edges (e.g., from both A→B and B→A)
                    const edgeKey = [node.properties.id, connectedNodeId].sort((a, b) => a - b).join("-");
					if (renderedEdges.has(edgeKey)) return;
					renderedEdges.add(edgeKey);

					const sourceId = `edge-source-${edgeKey}`;
					const layerId = `edge-layer-${edgeKey}`;

                    const fromCoords = node.geometry!!.coordinates;
                    const toCoords = targetNode.geometry.coordinates;

					logger.info("Rendering route edge", {
						edgeKey,
                        fromId: node.properties.id,
						toId: connectedNodeId,
						fromCoords,
						toCoords,
					});

					mapInstance.addSource(sourceId, {
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

					mapInstance.addLayer({
						id: layerId,
						type: "line",
						source: sourceId,
						paint: {
							"line-color": "#3b82f6",
							"line-width": 3,
							"line-opacity": 0.8,
						},
					});

					mapSources.current[`edge-${edgeKey}`] = sourceId;
					mapLayers.current[`edge-${edgeKey}`] = layerId;

					logger.info("Edge layer added", {
						sourceId,
						layerId,
					});
				});
			});

			// Add highlighting for selected object
			if (selectedItem) {
				const {type, id} = selectedItem;

				if (type === "polygon") {
					const polygon = currentPolygons.find((p) => p.properties.id === id);
                    if (polygon && polygon.properties.is_visible) {
						// Highlight selected polygon with a thicker border or different color
						const layerId = `polygon-layer-${id}`;
						const borderLayerId = `polygon-border-${id}`;

						if (mapInstance.getLayer(layerId)) {
							mapInstance.setPaintProperty(
								layerId,
								"fill-opacity",
								0.8
							);
						}
						if (mapInstance.getLayer(borderLayerId)) {
							mapInstance.setPaintProperty(
								borderLayerId,
								"line-width",
								4
							);
							mapInstance.setPaintProperty(
								borderLayerId,
								"line-color",
								"#ef4444"
							);
						}
					}
				} else if (type === "beacon") {
					const b = currentBeacons.find((b) => b.properties.id === id);
					const beacon = b?.properties
                    if (beacon && beacon.is_visible) {
						// Highlight selected beacon
						const marker = mapMarkers.current[`beacon-${id}`];
						if (marker) {
							marker.remove();
							mapMarkers.current[`beacon-${id}`] =
								new Marker({
									color: "#ef4444",
									scale: 1.2,
								})
									.setLngLat(b.geometry!!.coordinates)
									.setPopup(
										new Popup().setHTML(
											`<strong>${beacon.name}</strong><br>Type: Beacon (SELECTED)`
										)
									)
									.addTo(mapInstance);
						}
					}
				} else if (type === "node") {
                    const node = currentNodes.find((n) => n.properties.id === id);
                    if (node && node.properties.is_visible) {
						// Highlight selected node
						const marker = mapMarkers.current[`node-${id}`];
						if (marker) {
							marker.remove();
							mapMarkers.current[`node-${id}`] =
								new Marker({
									color: "#ef4444",
									scale: 1.2,
								})
                                    .setLngLat(node.geometry!!.coordinates)
									.addTo(mapInstance);
						}
					}
				}
			}

			logger.info("Map data updated successfully");
		},
		[selectedItem]
	); // Add selectedItem as dependency

	// Load initial sample data and update map when data changes
	useEffect(() => {
		if (!mapLoading && map.current) {
			updateMapData(
				polygons,
				beacons,
				nodes,
				selectedNodeForConnection
			);
		}
	}, [
		mapLoading,
		polygons,
		beacons,
		nodes,
		selectedNodeForConnection,
	]);

	// const getUserLocationAndCenter = (mapInstance: Map) => {
	// 	if ("geolocation" in navigator) {
	// 		logger.info(
	// 			"🌍 Requesting user location permission - this should show a browser popup"
	// 		);
	//
	// 		navigator.geolocation.getCurrentPosition(
	// 			(position) => {
	// 				const { latitude, longitude } = position.coords;
	// 				logger.info(
	// 					"🎯 User location obtained, centering map NOW!",
	// 					{ latitude, longitude }
	// 				);
	//
	// 				// Force center the map
	// 				mapInstance.flyTo({
	// 					center: [longitude, latitude],
	// 					zoom: 18,
	// 					duration: 2000,
	// 				});
	//
	// 				// Add a marker at user's location
	// 				new Marker({ color: "#ef4444" })
	// 					.setLngLat([longitude, latitude])
	// 					.setPopup(
	// 						new Popup().setHTML(
	// 							"<strong>🎯 Your Location</strong>"
	// 						)
	// 					)
	// 					.addTo(mapInstance);
	// 			},
	// 			(error) => {
	// 				logger.warn(
	// 					"Geolocation error - using default location",
	// 					error
	// 				);
	// 				logger.info("Geolocation error details", {
	// 					code: error.code,
	// 					message: error.message,
	// 				});
	// 				// Keep default location (Honolulu)
	// 			},
	// 			{
	// 				enableHighAccuracy: true,
	// 				timeout: 15000, // Increased timeout
	// 				maximumAge: 0, // Don't use cached location
	// 			}
	// 		);
	// 	} else {
	// 		logger.warn("Geolocation not supported by this browser");
	// 	}
	// };

	const initializeMap = useCallback(() => {
		if (!mapContainer.current) {
			logger.warn("Map container not available");
			return;
		}

		try {
			logger.info("Initializing map", {
				apiKey: MAPTILER_API_KEY ? "SET" : "NOT_SET",
				apiKeyLength: MAPTILER_API_KEY?.length || 0,
				envApiKey: process.env.REACT_APP_MAPTILER_API_KEY
					? "ENV_SET"
					: "ENV_NOT_SET",
			});

			// Configure MapTiler SDK
			config.apiKey = MAPTILER_API_KEY;

			if (!MAPTILER_API_KEY) {
				throw new Error(
					"MapTiler API key is not set. Please check your .env file and restart the development server."
				);
			}

			// Initialize map with your custom style (same as Android app)
			const mapInstance = new Map({
				container: mapContainer.current,
				style: MAPTILER_STYLE_URL, // Using your custom style URL
				center: [50.142335, 26.313387], // User's actual coordinates in Bahrain
				zoom: 18,
			});

			map.current = mapInstance;

			mapInstance.on("load", () => {
				// Clear the timeout since map loaded successfully
				if (mapLoadTimeout.current) {
					clearTimeout(mapLoadTimeout.current);
					mapLoadTimeout.current = null;
				}

				setMapLoading(false);
				setMapLoadedSuccessfully(true);
				logger.info("Map loaded successfully");
			});

			mapInstance.on("error", (e) => {
				// Only show error if map hasn't loaded successfully yet
				if (!mapLoadedSuccessfully) {
					// Clear the timeout since we got an error (not a timeout)
					if (mapLoadTimeout.current) {
						clearTimeout(mapLoadTimeout.current);
						mapLoadTimeout.current = null;
					}

					logger.error(
						"Map error event during initial load",
						new Error(e.error?.message || "Map error occurred")
					);
					setMapLoading(false);
				} else {
					// Map already loaded successfully, just log the error but don't show to user
					logger.warn(
						"Map error after successful load (ignoring)",
						new Error(e.error?.message || "Map error occurred")
					);
				}
			});

			// Click handlers for different tools
			mapInstance.on("click", (e) => {
				handleMapClick(e);
			});

			// Set a timeout to catch cases where the map never loads
			mapLoadTimeout.current = setTimeout(() => {
				// Only show timeout error if map is still loading (not if it already loaded)
				if (mapLoading) {
					logger.error(
						"Map loading timeout - map failed to load within 30 seconds"
					);
					setMapLoading(false);
				}
				mapLoadTimeout.current = null;
			}, 30000);
		} catch (error) {
			logger.error("Failed to initialize map", error as Error);
			setMapLoading(false);
		}
	}, [updateCoordinates]);

	// Separate effect for map initialization - only after loading is complete and container is ready
	useEffect(() => {
		if (!loading && mapContainer.current && !map.current) {
			logger.info("Initializing map after loading complete");
			initializeMap();
		}
	}, [loading, initializeMap]); // Depend on loading and initializeMap

	const handleMapClick = (e: any) => {
		logger.userAction("Map clicked - DETAILED", {
			hasMap: !!map.current,
			activeTool,
			lng: e.lngLat.lng,
			lat: e.lngLat.lat,
			eventType: e.type,
			currentBeacons: beacons.length,
			currentNodes: nodes.length,
			currentPolygons: polygons.length,
		});

		if (!map.current) {
			logger.error("Map click failed - no map instance");
			return;
		}

		const {lng, lat} = e.lngLat;
		const currentTool = activeToolRef.current; // Use ref to get current tool

		switch (currentTool) {
			case "beacons":
				addBeacon(lng, lat);
				// Keep the tool active for adding multiple beacons
				break;
			case "nodes":
				handleNodeClick(lng, lat);
				// Keep the tool active for adding multiple nodes
				break;
			case "poi":
				addPolygonPoint(lng, lat);
				break;
			case "select":
				break;
			case "pan":
				break;
			default:
				break;
		}
	};

	const addBeacon = (lng: number, lat: number) => {
		// Show beacon name dialog
		setPendingBeaconLocation({lng, lat});
		setBeaconName(`Beacon ${beacons.length + 1}`); // Default name
		setShowBeaconDialog(true);

		logger.userAction("Beacon dialog opened", {location: {lng, lat}});
	};

	const handleNodeClick = async (lng: number, lat: number) => {
		// Check if this click is near an existing node (using Canvas-style distance calculation)
		const clickedNode = nodes.find((node) => {
            if (!node.properties.is_visible) return false;
			// Use proper Euclidean distance like the working Canvas version
			const distance = Math.sqrt(
                (node.geometry!!.coordinates[0] - lng) ** 2 + (node.geometry!!.coordinates[1] - lat) ** 2
			);
			return distance < 0.0001; // Adjust threshold for coordinate space instead of pixel space
		});

		// Use ref values for current state to avoid stale closures
		const currentSelectedNode = selectedNodeForConnectionRef.current;
		const currentLastPlacedNode = lastPlacedNodeIdRef.current;

		// Debug logging to understand what's happening
		logger.info("Node click detected", {
			lng,
			lat,
			nodesCount: nodes.length,
			selectedNodeForConnection: currentSelectedNode,
			lastPlacedNodeId: currentLastPlacedNode,
            clickedNodeId: clickedNode?.properties.id || "none",
		});

		if (clickedNode) {
			// Clicked on an existing node - select it for connection (make marker green)
			setSelectedNodeForConnection(clickedNode.properties.id);
			selectedNodeForConnectionRef.current = clickedNode.properties.id;
			// Clear lastPlacedNodeId when manually selecting a node
			setLastPlacedNodeId(null);
			lastPlacedNodeIdRef.current = null;
			logger.userAction("Node selected for connection", {
				nodeId: clickedNode.properties.id,
			});
		} else {
			// Clicked on empty space
			logger.info("Clicked on empty space - DETAILED STATE", {
				lng,
				lat,
				nodesLength: nodes.length,
				selectedNodeForConnection: currentSelectedNode,
				lastPlacedNodeId: currentLastPlacedNode,
				hasSelectedNode: !!currentSelectedNode,
				hasLastPlaced: !!currentLastPlacedNode,
				"nodes.length === 0": nodes.length === 0,
			});

			try {
				if (currentSelectedNode) {
					// Have a selected node - create new node and connect it
					logger.info("Creating connected node", {
						selectedNodeForConnection: currentSelectedNode,
					});
					const newNodeId = await addNewNode(lng, lat, currentSelectedNode);
					// Auto-select the newly placed node (make it green) so next node connects to it
					setSelectedNodeForConnection(newNodeId);
					selectedNodeForConnectionRef.current = newNodeId;
					setLastPlacedNodeId(null);
					lastPlacedNodeIdRef.current = null;
				} else if (nodes.length === 0) {
					// No nodes exist - create first isolated node
					logger.info("Creating first isolated node");
					const newNodeId = await addNewNode(lng, lat, null);
					// Auto-select the newly placed node (make it green) so next node connects to it
					setSelectedNodeForConnection(newNodeId);
					selectedNodeForConnectionRef.current = newNodeId;
					setLastPlacedNodeId(null);
					lastPlacedNodeIdRef.current = null;
				} else {
					// Nodes exist but none selected - show error to user
					logger.info("Cannot create node - no previous node selected");
					// TODO: Show user error message telling them to choose a previous node
					alert("Please click on an existing node first to connect the new node to it.");
				}
			} catch (error) {
				logger.error("Failed to create node", error as Error);
				alert("Failed to create node. Please try again.");
			}
		}
	};

	const addNewNode = async (
		lng: number,
		lat: number,
		connectToNodeId: number | null
	): Promise<number> => {
		logger.info("🎯 CREATING NODE - SIMPLE APPROACH", {
			coordinates: [lng, lat],
			connectToNodeId,
			willConnect: !!connectToNodeId
		});

		try {
			// Step 1: Create the new node with connection (if any)
			const newNodeData = {
				type: "Feature" as const,
				geometry: {
					type: "Point" as const,
					coordinates: [lng, lat] as [number, number]
				},
				properties: {
					floor_id: floorId,
					is_visible: true,
					...(connectToNodeId ? { connected_node_ids: [connectToNodeId] } : {})
				}
			};

			logger.info("📤 Creating node with backend field name", { 
				newNodeData,
				hasConnection: !!connectToNodeId,
				connectingTo: connectToNodeId,
				exactPayload: JSON.stringify(newNodeData, null, 2)
			});

			const createdNode = await routeNodesMutations.create.mutateAsync({
				data: newNodeData
			});

			const newNodeId = createdNode?.id || createdNode?.properties?.id;
			
			if (!newNodeId) {
				throw new Error("❌ Backend didn't return node ID");
			}

			logger.info("✅ Node created successfully", { 
				newNodeId,
				createdNode,
				backendResponse: createdNode,
				fullResponse: JSON.stringify(createdNode, null, 2),
				hasConnections: !!(createdNode?.properties?.connected_node_ids || createdNode?.properties?.connections)
			});

			// Step 2: Update existing node to connect back (bidirectional)
			if (connectToNodeId) {
				logger.info("🔗 Adding bidirectional connection to existing node");
				
				const existingNode = nodes.find(n => n.properties.id === connectToNodeId);
				if (existingNode) {
					const existingConnections = existingNode.properties.connections || [];
					const updatedConnections = [...existingConnections, newNodeId];
					
					const updatedExistingNode = {
						...existingNode,
						properties: {
							...existingNode.properties,
							connected_node_ids: updatedConnections
						}
					};

					logger.info("📤 Updating existing node for bidirectional connection", {
						existingNodeId: connectToNodeId,
						currentConnections: existingConnections,
						newConnections: updatedConnections
					});

					await routeNodesMutations.update.mutateAsync({
						data: updatedExistingNode
					});

					logger.info("✅ Bidirectional connection established");
				}
			}

			return newNodeId;
		} catch (error) {
			logger.error("❌ Node creation failed", error as Error);
			throw error;
		}
	};

	// Clear all temporary drawing elements from the map
	const clearTempDrawing = () => {
		if (!map.current) return;

		logger.info("Clearing temporary drawing elements");

		// Remove temporary markers
		tempDrawingMarkers.current.forEach((marker) => marker.remove());
		tempDrawingMarkers.current = [];

		// Remove temporary lines
		Object.entries(tempDrawingLines.current).forEach(
			([layerId, sourceId]) => {
				if (map.current!.getLayer(layerId)) {
					map.current!.removeLayer(layerId);
				}
				if (map.current!.getSource(sourceId)) {
					map.current!.removeSource(sourceId);
				}
			}
		);
		tempDrawingLines.current = {};
	};

	// Add a small circle marker at the clicked location
	const addPolygonPointMarker = (
		lng: number,
		lat: number,
		pointIndex: number
	) => {
		if (!map.current) return;

		const isFirst = pointIndex === 0;
		const color = isFirst ? "#ff0000" : "#00aa00"; // Red for first point, green for others

		// Create a simple HTML element for the marker
		const markerElement = document.createElement("div");
		markerElement.style.width = "10px";
		markerElement.style.height = "10px";
		markerElement.style.borderRadius = "50%";
		markerElement.style.backgroundColor = color;
		markerElement.style.border = "2px solid white";
		markerElement.style.boxShadow = "0 0 4px rgba(0,0,0,0.3)";

		const marker = new Marker({element: markerElement})
			.setLngLat([lng, lat])
			.addTo(map.current);

		tempDrawingMarkers.current.push(marker);

		logger.info("Added polygon point marker", {
			point: {lng, lat},
			pointIndex,
			isFirst,
			color,
		});
	};

	// // Add a line between two points
	const addPolygonLine = (
		fromPoint: Point,
		toPoint: Point,
		lineId: number
	) => {
		if (!map.current) {
			logger.error("Cannot add polygon line - no map instance");
			return;
		}

		const sourceId = `temp-polygon-line-source-${Math.floor(lineId)}`;
		const layerId = `temp-polygon-line-layer-${Math.floor(lineId)}`;

		logger.info("ATTEMPTING to add polygon line", {
			from: fromPoint,
			to: toPoint,
			lineId,
			sourceId,
			layerId,
			mapExists: !!map.current,
		});

		try {
			// Check if source already exists and remove it
			if (map.current.getSource(sourceId)) {
				logger.warn("Source already exists, removing it first", {
					sourceId,
				});
				if (map.current.getLayer(layerId)) {
					map.current.removeLayer(layerId);
				}
				map.current.removeSource(sourceId);
			}

			map.current.addSource(sourceId, {
				type: "geojson",
				data: {
					type: "Feature",
					geometry: {
						type: "LineString",
						coordinates: [
							[fromPoint.x, fromPoint.y],
							[toPoint.x, toPoint.y],
						],
					},
					properties: {},
				},
			});

			map.current.addLayer({
				id: layerId,
				type: "line",
				source: sourceId,
				paint: {
					"line-color": "#0066ff", // Blue lines
					"line-width": 3,
				},
			});

			tempDrawingLines.current[layerId] = sourceId;

			logger.info("✅ SUCCESS - Added polygon line", {
				from: fromPoint,
				to: toPoint,
				lineId,
				sourceId,
				layerId,
			});
		} catch (error) {
			logger.error("❌ FAILED to add polygon line", error as Error, {
				fromPoint,
				toPoint,
				lineId,
				sourceId,
				layerId,
				errorMessage: (error as Error).message,
				mapLoaded: !!map.current,
			});
		}
	};

	// // Check if the clicked point is close to the first point (to close the polygon)
	const isCloseToFirstPoint = (
		lng: number,
		lat: number,
		firstPoint: Point
	): boolean => {
		const deltaLng = Math.abs(lng - firstPoint.x);
		const deltaLat = Math.abs(lat - firstPoint.y);
		const maxDelta = 0.0001; // About 10 meters - much easier to click accurately

		logger.info("Checking if close to first point", {
			clickedPoint: {lng, lat},
			firstPoint,
			deltaLng,
			deltaLat,
			maxDelta,
			isClose: deltaLng < maxDelta && deltaLat < maxDelta,
		});

		return deltaLng < maxDelta && deltaLat < maxDelta;
	};

	// Handle polygon point addition with the new flow
	const addPolygonPoint = (lng: number, lat: number) => {
		const newPoint: Point = {x: lng, y: lat} as Point;

		logger.userAction("🎯 Polygon point clicked", {
			point: newPoint,
			currentPoints: pendingPolygonPointsRef.current.length,
			pendingPoints: pendingPolygonPointsRef.current,
			isDrawingPolygon: isDrawingPolygonRef.current,
			activeTool: activeTool,
		});

		// If this is not the first point, check if it's close to the first point to close
		if (
			pendingPolygonPointsRef.current.length >= 3 &&
			isCloseToFirstPoint(lng, lat, pendingPolygonPointsRef.current[0])
		) {
			// Close the polygon and show dialog
			logger.info("🎉 POLYGON CLOSED by clicking near first point!");

			// Add closing line back to first point
			const closingLineId = Math.random() * 1000000;
			addPolygonLine(
				pendingPolygonPointsRef.current[
				pendingPolygonPointsRef.current.length - 1
					],
				pendingPolygonPointsRef.current[0],
				closingLineId
			);

			// Store the completed polygon points and show dialog
			// setCurrentPolygonPoints([...pendingPolygonPointsRef.current]); // Don't include the closing point

			// Calculate center for the dialog
			const centerX =
				pendingPolygonPointsRef.current.reduce(
					(sum, p) => sum + p.x,
					0
				) / pendingPolygonPointsRef.current.length;
			const centerY =
				pendingPolygonPointsRef.current.reduce(
					(sum, p) => sum + p.y,
					0
				) / pendingPolygonPointsRef.current.length;

			// setPendingPolygonCenter({ lng: centerX, lat: centerY });
			setPolygonName("");
            // setIsWallMode(false);
			setShowPolygonDialog(true);

			logger.info("🎉 Showing polygon dialog", {
				center: {lng: centerX, lat: centerY},
				points: pendingPolygonPointsRef.current.length,
			});

			return;
		}

		// Add the new point
		const updatedPoints = [...pendingPolygonPointsRef.current, newPoint];
		pendingPolygonPointsRef.current = updatedPoints;
		setPendingPolygonPoints(updatedPoints);

		// Add visual marker for this point
		addPolygonPointMarker(lng, lat, updatedPoints.length - 1);

		// Set drawing state first
		if (updatedPoints.length === 1) {
			isDrawingPolygonRef.current = true;
			setIsDrawingPolygon(true);
			logger.info("Started drawing polygon");
		}

		// Add line from previous point to this point (if not the first point)
		if (updatedPoints.length > 1) {
			const previousPoint = updatedPoints[updatedPoints.length - 2];
			const lineId = Math.random() * 1000000; // Use random number for unique ID
			logger.info("🔵 ADDING LINE between points", {
				from: previousPoint,
				to: newPoint,
				lineId,
				totalPoints: updatedPoints.length,
			});
			addPolygonLine(previousPoint, newPoint, lineId);
		}

		logger.userAction("Polygon point added", {
			point: newPoint,
			totalPoints: updatedPoints.length,
		});
	};

	const handleToolChange = (tool: DrawingTool) => {
		logger.info("Tool change requested", {
			from: activeTool,
			to: tool,
			isDrawingPolygon,
			// pendingPoints: pendingPolygonPoints.length,
		});

		// If switching away from POI tool, clear any polygon drawing state
		if (
			activeTool === "poi" &&
			tool !== "poi" &&
			isDrawingPolygonRef.current
		) {
			isDrawingPolygonRef.current = false;
			pendingPolygonPointsRef.current = [];
			setIsDrawingPolygon(false);
			// setCurrentPolygonPoints([]);
			setPendingPolygonPoints([]);
			clearTempDrawing();
		}

		// If switching away from nodes tool, clear node selection state
		if (activeTool === "nodes" && tool !== "nodes") {
			setSelectedNodeForConnection(null);
			setLastPlacedNodeId(null);
			lastPlacedNodeIdRef.current = null;
		}

		setActiveTool(tool);
		activeToolRef.current = tool; // Keep ref in sync
		setSelectedItem(null);
	};

	// Helper to generate next available ID for new entities
	const generateNextId = (entities: any[]): number => {
		if (entities.length === 0) return 1;
		return Math.max(...entities.map(e => e.properties?.id || 0)) + 1;
	};

	// --- Update handlers ---

	// Polygon Save (add or edit) - immediate backend save
	const handlePolygonSave = async () => {
		setSaveStatus("saving");
		setSaveError(null);

		try {
			if (editingPolygonId) {
				// Edit existing polygon
				const polygon = polygons.find((p) => p.properties.id === editingPolygonId);
				if (polygon) {
					const updated = PolygonBuilder.fromPolygon(polygon).setName(polygonName).build();
					await poisMutations.update.mutateAsync({
						data: updated
					});
					logger.info("Polygon updated successfully", { id: editingPolygonId });
				}
			} else {
				// Add new polygon - immediate save to backend
				const newId = generateNextId(polygons);
				const newPolygon = new PolygonBuilder()
					.setId(newId)
					.setFloorId(floorId)
					.setName(polygonName)
					.setDescription("")
					.setType("Room")
					.setIsVisible(true)
					.setColor("#3b82f6")
					.setCategoryId(null)
					.setGeometry(convertPointsToCoordinates(pendingPolygonPoints))
					.build();

				// Create the Createable format for the API
				const createablePolygon = {
					type: "Feature" as const,
					geometry: newPolygon.geometry,
					properties: {
						floor_id: newPolygon.properties.floor_id,
						name: newPolygon.properties.name,
						description: newPolygon.properties.description,
						type: newPolygon.properties.type,
						is_visible: newPolygon.properties.is_visible,
						color: newPolygon.properties.color,
						category_id: newPolygon.properties.category_id
					}
				};

				await poisMutations.create.mutateAsync({
					data: createablePolygon
				});
				logger.info("Polygon created successfully", { name: polygonName });
			}

			setSaveStatus("success");
			setTimeout(() => setSaveStatus("idle"), 2000);
		} catch (error) {
			logger.error("Failed to save polygon", error as Error);
			setSaveStatus("error");
			setSaveError("Failed to save polygon: " + (error as Error).message);
		}

		// Clear dialog state
		setShowPolygonDialog(false);
		setPolygonName("");
		setEditingPolygonId(null);
		setPendingPolygonPoints([]);
		clearTempDrawing();
	};

	// Beacon Save (add or edit) - immediate backend save
	const handleBeaconSave = async () => {
		setSaveStatus("saving");
		setSaveError(null);

		try {
			if (editingBeaconId) {
				// Edit existing beacon
				const beacon = beacons.find((b) => b.properties.id === editingBeaconId);
				if (beacon) {
					const updated = BeaconBuilder.fromBeacon(beacon).setName(beaconName).build();
					await beaconsMutations.update.mutateAsync({
						data: updated
					});
					logger.info("Beacon updated successfully", { id: editingBeaconId });
				}
			} else {
				// Add new beacon - immediate save to backend
				if (pendingBeaconLocation) {
					const newId = generateNextId(beacons);
					const newBeacon = new BeaconBuilder()
						.setId(newId)
						.setFloorId(floorId)
						.setName(beaconName)
						.setGeometry(pendingBeaconLocation.lng, pendingBeaconLocation.lat)
						.setIsVisible(true)
						.setIsActive(true)
						.setBatteryLevel(100)
						.build();

					// Create the Createable format for the API
					const createableBeacon = {
						type: "Feature" as const,
						geometry: newBeacon.geometry!,
						properties: {
							floor_id: newBeacon.properties.floor_id,
							beacon_type_id: newBeacon.properties.beacon_type_id,
							name: newBeacon.properties.name,
							uuid: newBeacon.properties.uuid,
							major_id: newBeacon.properties.major_id,
							minor_id: newBeacon.properties.minor_id,
							is_active: newBeacon.properties.is_active,
							is_visible: newBeacon.properties.is_visible,
							battery_level: newBeacon.properties.battery_level,
							last_seen: newBeacon.properties.last_seen,
							beacon_type: newBeacon.properties.beacon_type
						}
					};

					await beaconsMutations.create.mutateAsync({
						data: createableBeacon
					});
					logger.info("Beacon created successfully", { name: beaconName });
				}
			}

			setSaveStatus("success");
			setTimeout(() => setSaveStatus("idle"), 2000);
		} catch (error) {
			logger.error("Failed to save beacon", error as Error);
			setSaveStatus("error");
			setSaveError("Failed to save beacon: " + (error as Error).message);
		}

		// Clear dialog state
		setShowBeaconDialog(false);
		setBeaconName("");
		setPendingBeaconLocation(null);
		setEditingBeaconId(null);
	};

	// Node Save (add or edit) - immediate backend save
	const handleNodeSave = async () => {
		setSaveStatus("saving");
		setSaveError(null);

		try {
			if (editingNodeId) {
				// Edit existing node (name only for now)
				const node = nodes.find((n) => n.properties.id === editingNodeId);
				if (node) {
					// Note: RouteNode doesn't have a name field in the interface, 
					// this is just for demonstration. In practice, you might update other properties
					await routeNodesMutations.update.mutateAsync({
						data: node
					});
					logger.info("Node updated successfully", { id: editingNodeId });
				}
			} else {
				// Add (not typically used as nodes are created via map click)
				logger.info("Node creation via dialog not implemented");
			}

			setSaveStatus("success");
			setTimeout(() => setSaveStatus("idle"), 2000);
		} catch (error) {
			logger.error("Failed to save node", error as Error);
			setSaveStatus("error");
			setSaveError("Failed to save node: " + (error as Error).message);
		}

		// Clear dialog state
		setShowNodeDialog(false);
		setNodeName("");
		setEditingNodeId(null);
	};

	// Delete handler - immediate backend delete
	const handleDeleteItem = async (
		type: "polygon" | "beacon" | "node",
		id: number,
		e: React.MouseEvent<HTMLButtonElement>
	) => {
		e.stopPropagation();
		logger.userAction("Delete item clicked", {type, id});

		setSaveStatus("saving");
		setSaveError(null);

		try {
			switch (type) {
				case "polygon":
					await poisMutations.delete.mutateAsync(id);
					logger.info("Polygon deleted successfully", { id });
					break;
				case "beacon":
					await beaconsMutations.delete.mutateAsync(id);
					logger.info("Beacon deleted successfully", { id });
					break;
				case "node":
					await routeNodesMutations.delete.mutateAsync(id);
					logger.info("Node deleted successfully", { id });
					break;
			}

			setSaveStatus("success");
			setTimeout(() => setSaveStatus("idle"), 2000);
		} catch (error) {
			logger.error(`Failed to delete ${type}`, error as Error);
			setSaveStatus("error");
			setSaveError(`Failed to delete ${type}: ` + (error as Error).message);
		}

		if (selectedItem?.type === type && selectedItem?.id === id) {
			setSelectedItem(null);
		}
	};

	// No more unsaved changes since we save immediately
	const hasUnsavedChanges = false;

	const toggleLayerVisibility = (
		type: "polygon" | "beacon" | "node",
		id: number
	) => {
		logger.userAction("Layer visibility toggled", {type, id});

		if (!map.current) {
			logger.userAction("Map instance not available, aborting toggle", {type, id});
			return;
		}

		const mapInstance = map.current;
		logger.userAction("Map instance found, proceeding", {type, id});

		switch (type) {
			case "polygon":
				logger.userAction("Handling polygon visibility toggle", {id});
				queryClient.setQueryData<Polygon[]>(['pois'], (old = []) => {
					logger.userAction("Current polygons fetched from cache", {count: old.length});

					const newPolygons = old.map(polygon => {
						const p = polygon.properties;
						if (p.id === id) {
                            const newVisible = !p.is_visible;
							logger.userAction("Found matching polygon, toggling visibility", {
								id,
                                oldVisible: p.is_visible,
								newVisible
							});

							// Update map visibility
							const marker = mapMarkers.current[`polygon-${id}`];
							const layerId = mapLayers.current[`polygon-${id}`];
							const borderLayerId = mapLayers.current[`polygon-border-${id}`];

							if (marker) {
								logger.userAction("Marker found for polygon", {id});
								if (newVisible) {
									marker.addTo(mapInstance);
									logger.userAction("Marker added to map", {id});
								} else {
									marker.remove();
									logger.userAction("Marker removed from map", {id});
								}
							} else {
								logger.userAction("No marker found for polygon", {id});
							}

							if (layerId && mapInstance.getLayer(layerId)) {
								mapInstance.setLayoutProperty(
									layerId,
									"visibility",
									newVisible ? "visible" : "none"
								);
								logger.userAction("Layer visibility set", {layerId, visible: newVisible});
							} else {
								logger.userAction("Layer ID not found or layer missing in map instance", {layerId, id});
							}

							if (borderLayerId && mapInstance.getLayer(borderLayerId)) {
								mapInstance.setLayoutProperty(
									borderLayerId,
									"visibility",
									newVisible ? "visible" : "none"
								);
								logger.userAction("Border layer visibility set", {borderLayerId, visible: newVisible});
							} else {
								logger.userAction("Border layer ID not found or layer missing in map instance", {
									borderLayerId,
									id
								});
							}

                            return PolygonBuilder.fromPolygon(polygon).setIsVisible(newVisible).build();
                        }
						return polygon;
					});

					logger.userAction("Polygons updated with new visibility state", {updatedCount: newPolygons.length});
					return newPolygons;
				});
				break;

			case "beacon":
				queryClient.setQueryData<Beacon[]>(['beacons'], (old = []) =>
					old.map(b => {
						if (b.properties.id === id) {
                            const newVisible = !b.properties.is_visible;

							// Update map visibility
							const marker = mapMarkers.current[`beacon-${id}`];
							if (marker) {
								if (newVisible) {
									marker.addTo(mapInstance);
								} else {
									marker.remove();
								}
							}

                            return BeaconBuilder.fromBeacon(b).setIsVisible(newVisible).build();
						}
						return b;
					})
				);
				break;
		}
	};

	// Old save handler removed - now using immediate saves

	// // Add missing handler functions
	const handlePolygonCancel = () => {
		setShowPolygonDialog(false);
		setPolygonName("");
        // setIsWallMode(false);
		setEditingPolygonId(null);
		setPendingPolygonPoints([]);
		logger.userAction("Polygon dialog cancelled");
	};

	const handleBeaconCancel = () => {
		setShowBeaconDialog(false);
		setBeaconName("");
		setPendingBeaconLocation(null);
		setEditingBeaconId(null);
		logger.userAction("Beacon dialog cancelled");
	};

	const handleNodeCancel = () => {
		setShowNodeDialog(false);
		setNodeName("");
		setEditingNodeId(null);
		logger.userAction("Node dialog cancelled");
	};

	const handleLayerItemClick = (
		type: "polygon" | "beacon" | "node",
		id: number
	) => {
		setSelectedItem({type, id});
		setActiveTool("select");
		logger.userAction("Layer item selected", {type, id});
	};

	const handleEditItem = (
		type: "polygon" | "beacon" | "node",
		id: number,
		e: React.MouseEvent<HTMLButtonElement>
	) => {
		e.stopPropagation();
		logger.userAction("Edit item clicked", {type, id});

		switch (type) {
			case "polygon":
                const polygon = polygons.find((p) => p.properties.id === id);
				if (polygon) {
                    setPolygonName(polygon.properties.name);
					setEditingPolygonId(id);
					setShowPolygonDialog(true);
					setSelectedItem({type, id});
				}
				break;
			case "beacon":
                const beacon = beacons.find((b) => b.properties.id === id);
				if (beacon) {
                    setBeaconName(beacon.properties.name);
					setEditingBeaconId(id);
					setShowBeaconDialog(true);
					setSelectedItem({type, id});
				}
				break;
			case "node":
                const node = nodes.find((n) => n.properties.id === id);
				if (node) {
                    setNodeName(`Node ${node.properties.id}`);
					setEditingNodeId(id);
					setShowNodeDialog(true);
					setSelectedItem({type, id});
				}
				break;
		}
	};

	// Add more detailed debugging for re-render tracking
	logger.debug("FloorEditor component rendering", {
		floorId,
		activeTool,
		loading,
		mapLoading,
		hasFloorData: !!floorData,
		coordinates: currentCoordinates,
	});

	if (loading) {
		return (
			<Container variant="PAGE">
				<Header
					title={UI_MESSAGES.FLOOR_EDITOR_TITLE}
					actions={
						<Button
							variant="SECONDARY"
							onClick={onBack}
						>
							{UI_MESSAGES.FLOOR_EDITOR_BACK_BUTTON}
						</Button>
					}
				/>
				<div className="loading-message">
					{UI_MESSAGES.FLOOR_EDITOR_LOADING}
				</div>
			</Container>
		);
	}

	return (
		<Container variant="PAGE">
			<Header
				title={`${UI_MESSAGES.FLOOR_EDITOR_TITLE} - ${
					floor?.name || "Unknown Floor"
				}`}
				actions={
					<div className="header-actions">
						{saveStatus === "saving" && (
							<span className="save-status saving">
								Saving...
							</span>
						)}
						{saveStatus === "success" && (
							<span className="save-status success">
								Saved successfully!
							</span>
						)}
						{saveError && (
							<span className="save-status error">
								{saveError}
							</span>
						)}
						<Button
							variant="SECONDARY"
							onClick={onBack}
						>
							{UI_MESSAGES.FLOOR_EDITOR_BACK_BUTTON}
						</Button>
					</div>
				}
			/>

			{error && <div className="floor-editor-error">{error}</div>}

			<div className="floor-editor-layout">
				{/* Drawing Tools Toolbar */}
				<DrawingToolbar
					activeTool={activeTool}
					onToolChange={handleToolChange}
					isDrawingPolygon={isDrawingPolygon}
					pendingPolygonPoints={pendingPolygonPoints.length}
					onCancelDrawing={() => {
						isDrawingPolygonRef.current = false;
						pendingPolygonPointsRef.current = [];
						setIsDrawingPolygon(false);
						setCurrentPolygonPoints([]);
						setPendingPolygonPoints([]);
						clearTempDrawing();
						setSelectedNodeForConnection(null);
						setLastPlacedNodeId(null);
						lastPlacedNodeIdRef.current = null;
						logger.userAction("Polygon drawing cancelled");
					}}
						onClearAll={async () => {
							logger.userAction("Clear all button clicked");
							setSaveStatus("saving");
							setSaveError(null);

							try {
								// Delete all polygons
								for (const polygon of polygons) {
									await poisMutations.delete.mutateAsync(polygon.properties.id);
								}

								// Delete all beacons
								for (const beacon of beacons) {
									await beaconsMutations.delete.mutateAsync(beacon.properties.id);
								}

								// Delete all nodes
								for (const node of nodes) {
									await routeNodesMutations.delete.mutateAsync(node.properties.id);
								}

								setSaveStatus("success");
								setTimeout(() => setSaveStatus("idle"), 2000);
								logger.info("All data cleared from backend successfully");
							} catch (error) {
								logger.error("Failed to clear all data", error as Error);
								setSaveStatus("error");
								setSaveError("Failed to clear all data: " + (error as Error).message);
							}
						}}
					nodesCount={nodes.length}
					selectedNodeForConnection={selectedNodeForConnection}
					lastPlacedNodeId={lastPlacedNodeId}
				/>

				{/* Main Content Area */}
				<div className="editor-main">
					{/* Map Container */}
					<MapContainer
						mapRef={mapContainer}
						mapLoading={mapLoading}
						activeTool={activeTool}
						currentCoordinates={currentCoordinates}
						error={null}
					/>

					{/* Layers Panel */}
					<LayersPanel
						polygons={polygons}
						beacons={beacons}
						nodes={nodes}
						layerFilter={layerFilter}
						selectedItem={selectedItem}
						onFilterChange={setLayerFilter}
						onLayerItemClick={handleLayerItemClick}
						onToggleVisibility={toggleLayerVisibility}
						onEditItem={handleEditItem}
						onDeleteItem={handleDeleteItem}
					/>
				</div>
			</div>

			{/* Polygon Dialog */}
			<PolygonDialog
				show={showPolygonDialog}
				polygonName={polygonName}
                isWallMode={false}
				isEditing={!!editingPolygonId}
				onNameChange={setPolygonName}
                onWallModeChange={() => {
                }}
				onSave={handlePolygonSave}
				onCancel={handlePolygonCancel}
			/>

			{/* Beacon Dialog */}
			<BeaconDialog
				show={showBeaconDialog}
				beaconName={beaconName}
				isEditing={!!editingBeaconId}
				onNameChange={setBeaconName}
				onSave={handleBeaconSave}
				onCancel={handleBeaconCancel}
			/>

			{/* Route Node Dialog */}
			<RouteNodeDialog
				show={showNodeDialog}
				nodeName={nodeName}
				isEditing={!!editingNodeId}
				onNameChange={setNodeName}
				onSave={handleNodeSave}
				onCancel={handleNodeCancel}
			/>
		</Container>
	);
};