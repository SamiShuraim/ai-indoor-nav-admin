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
import {ChangeQueueItem} from "../interfaces/ChangeQueueItem";
import {CHANGE_TYPES} from "./FloorEditor/enums/CHANGE_TYPES";
import {OBJECT_TYPES} from "./FloorEditor/enums/OBJECT_TYPES";
import {STORAGE_KEYS} from "./FloorEditor/enums/STORAGE_KEYS";
import {API_URL_KEYS} from "./FloorEditor/enums/API_URL_KEYS";
import {useEntityMutations} from "./FloorEditor/useEntityMutations";
import {Floor} from "../interfaces/Floor";

const logger = createLogger("FloorEditor");

const loadQueueFromStorage = (): ChangeQueueItem[] => {
	try {
		const stored = localStorage.getItem(STORAGE_KEYS.CHANGE_QUEUE);
		return stored ? JSON.parse(stored) : [];
	} catch (error) {
		logger.warn(
			"Failed to load change queue from localStorage",
			error as Error
		);
		return [];
	}
};

const saveQueueToStorage = (queue: ChangeQueueItem[]): void => {
	try {
		localStorage.setItem(STORAGE_KEYS.CHANGE_QUEUE, JSON.stringify(queue));
		logger.info("Saved change queue to localStorage");
	} catch (error) {
		logger.error(
			"Failed to save change queue to localStorage",
			error as Error
		);
	}
};

// // Restore local storage utilities for polygons, beacons, nodes, edges
// const loadFromStorage = (key: string, defaultValue: any): any => {
// 	try {
// 		const stored = localStorage.getItem(key);
// 		return stored ? JSON.parse(stored) : defaultValue;
// 	} catch (error) {
// 		logger.warn(
// 			`Failed to load from localStorage key: ${key}`,
// 			error as Error
// 		);
// 		return defaultValue;
// 	}
// };

const loadFromApi = async (API: BaseApi<any>): Promise<any[]> => {
	try {
		return await API.getAll();
	} catch (error) {
		logger.warn(
			`Failed to load from API: ${API.constructor.name}`,
			error as Error
		);
		return [];
	}
};

const saveToStorage = (key: string, value: any): void => {
	try {
		localStorage.setItem(key, JSON.stringify(value));
		logger.info(`Saved to localStorage: ${key}`);
	} catch (error) {
		logger.error(
			`Failed to save to localStorage key: ${key}`,
			error as Error
		);
	}
};

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
		queryKey: ['polygons'],
		queryFn: () => loadFromApi(API_URL_KEYS.POI),
	});
    const {data: beacons = []} = useQuery<Beacon[]>({
		queryKey: ['beacons'],
		queryFn: () => loadFromApi(API_URL_KEYS.BEACONS),
	});
    const {data: nodes = []} = useQuery<RouteNode[]>({
		queryKey: ['nodes'],
		queryFn: () => loadFromApi(API_URL_KEYS.NODES),
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

	// Change queue state
	const [changeQueue, setChangeQueue] = useState<ChangeQueueItem[]>(() =>
		loadQueueFromStorage()
	);
	const [saveStatus, setSaveStatus] = useState<
		"idle" | "saving" | "success" | "error"
	>("idle");
	const [saveError, setSaveError] = useState<string | null>(null);

	const poisMutations = useEntityMutations('pois', polygonsApi);
	const beaconsMutations = useEntityMutations('beacons', beaconsApi);
	const routeNodesMutations = useEntityMutations('routeNodes', routeNodesApi);
	// Sync queue to local storage
	useEffect(() => {
		saveQueueToStorage(changeQueue);
	}, [changeQueue]);

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
			(currentPolygons || []).forEach((p) => {
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
			(currentBeacons || []).forEach((b) => {
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
				totalNodes: (currentNodes || []).length,
                visibleNodes: (currentNodes || []).filter((n) => n.properties.is_visible).length,
			});

			(currentNodes || []).forEach((node) => {
				logger.info("Processing node", {
                    nodeId: node.properties.id,
                    visible: node.properties.is_visible,
                    location: node.geometry,
                    connections: node.properties.connections,
                    isSelected: selectedNodeId === node.properties.id,
				});

                if (node.properties.is_visible) {
                    const isSelected = selectedNodeId === node.properties.id;
                    mapMarkers.current[`node-${node.properties.id}`] = new Marker({
						color: isSelected ? "#ef4444" : "#3b82f6",
					})
                        .setLngLat(node.geometry!!.coordinates)
						.addTo(mapInstance);
					logger.info("Node marker added to map", {
                        nodeId: node.properties.id,
                        markerKey: `node-${node.properties.id}`,
					});
				} else {
					logger.warn("Node not visible, skipping", {
                        nodeId: node.properties.id,
					});
				}
			});

			const renderedEdges = new Set<string>(); // Prevent duplicate lines

			logger.info("=== RENDERING CONNECTIONS ===", {
				totalNodes: currentNodes.length,
				nodeDetails: currentNodes.map(n => ({
					id: n.properties.id,
					connections: n.properties.connections,
					visible: n.properties.is_visible,
					hasGeometry: !!n.geometry
				}))
			});

			(currentNodes || []).forEach((node) => {
                if (!node.properties.is_visible || !node.geometry) return;

				logger.info("Processing node connections", {
					nodeId: node.properties.id,
					connections: node.properties.connections,
					hasConnections: (node.properties.connections || []).length > 0
				});

                (node.properties.connections || []).forEach((connectedNodeId) => {
                    const targetNode = (currentNodes || []).find(n => n.properties.id === connectedNodeId);

					logger.info("Looking for connected node", {
						fromNodeId: node.properties.id,
						lookingForId: connectedNodeId,
						foundNode: !!targetNode,
						targetNodeId: targetNode?.properties.id,
						availableNodeIds: currentNodes.map(n => n.properties.id)
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

	const handleNodeClick = (lng: number, lat: number) => {
		// Check if this click is near an existing node (using Canvas-style distance calculation)
		const clickedNode = nodes.find((node) => {
            if (!node.properties.is_visible) return false;
			// Use proper Euclidean distance like the working Canvas version
			const distance = Math.sqrt(
                (node.geometry!!.coordinates[0] - lng) ** 2 + (node.geometry!!.coordinates[0] - lat) ** 2
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
			// Clicked on an existing node
			if (currentSelectedNode) {
                if (currentSelectedNode === clickedNode.properties.id) {
					// Clicking on the same node - deselect it
					setSelectedNodeForConnection(null);
					selectedNodeForConnectionRef.current = null;
					logger.userAction("Node deselected", {
                        nodeId: clickedNode.properties.id,
					});
				} else {
					// Can't connect a node to itself or create duplicate connections
					logger.warn(
						"Cannot connect node to itself or create duplicate connection"
					);
				}
			} else {
				// Select this node for connection
                setSelectedNodeForConnection(clickedNode.properties.id);
                selectedNodeForConnectionRef.current = clickedNode.properties.id;
				logger.userAction("Node selected for connection", {
                    nodeId: clickedNode.properties.id,
				});
			}
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

			if (currentSelectedNode) {
				// Have a selected node - create new node and connect it (first connection after selecting)
				logger.info("Creating first connected node", {
					selectedNodeForConnection: currentSelectedNode,
				});
				const newNodeId = addNewNode(lng, lat, currentSelectedNode);
				setSelectedNodeForConnection(null);
				selectedNodeForConnectionRef.current = null;
				setLastPlacedNodeId(newNodeId);
				lastPlacedNodeIdRef.current = newNodeId;
			} else if (currentLastPlacedNode) {
				// Chain mode - connect to the last placed node
				logger.info("Creating chained node", {
					lastPlacedNodeId: currentLastPlacedNode,
				});
				const newNodeId = addNewNode(lng, lat, currentLastPlacedNode);
				setLastPlacedNodeId(newNodeId);
				lastPlacedNodeIdRef.current = newNodeId;
			} else if (nodes.length === 0) {
				// No nodes exist - create first isolated node (Canvas logic)
				logger.info("Creating first isolated node");
				const newNodeId = addNewNode(lng, lat, null);
				setLastPlacedNodeId(newNodeId);
				lastPlacedNodeIdRef.current = newNodeId;
			} else {
				// Canvas logic: Can't create node if nodes exist but none selected
				logger.info(
					"Cannot create node - select existing node first or clear all nodes"
				);
			}
		}
	};

	const addNewNode = (
		lng: number,
		lat: number,
		connectToNodeId: number | null
	): number => {
		// Generate a unique temporary ID (negative to distinguish from backend IDs)
		const tempId = -(Date.now() + Math.floor(Math.random() * 1000));
		
		// Create node with temporary ID and connections
		const newNode = new RouteNodeBuilder()
			.setId(tempId)
			.setFloorId(floorId)
			.setLocation(lng, lat)
			.setIsVisible(true)
			.setConnections(connectToNodeId ? [connectToNodeId] : [])
			.build();

		logger.info("Adding new node - DETAILED", {
            newNodeId: newNode.properties.id,
			newNodeCoords: [lng, lat],
			connectToNodeId,
			currentNodesCount: nodes.length,
            currentNodeIds: nodes.map((n) => n.properties.id),
			lastPlacedNodeIdRef: lastPlacedNodeIdRef.current,
			willCreateEdge: !!connectToNodeId,
		});

		// Add the new node to local state and update connections immediately
		const updatedNodes = queryClient.getQueryData<RouteNode[]>(['nodes']) || [];
		let newNodes: RouteNode[];

		if (connectToNodeId) {
			// Update the connected node to include connection back to the new node (using temp ID)
			newNodes = [...updatedNodes, newNode].map((node) =>
				node.properties.id === connectToNodeId
					? {
						...node,
						properties: {
							...node.properties,
							connections: [...(node.properties.connections || []), tempId], // Use temp ID
						}
					}
					: node
			);

			logger.info("Updated node connections", {
				connectToNodeId,
				newNodeTempId: tempId,
				totalNodes: newNodes.length,
			});
		} else {
			newNodes = [...updatedNodes, newNode];
			logger.userAction("Isolated node added", {newNode});
		}

		queryClient.setQueryData(['nodes'], newNodes);
		saveToStorage(STORAGE_KEYS.NODES, newNodes);

		// Queue the new node for saving to the backend
		queueChange({
			type: CHANGE_TYPES.ADD,
			objectType: OBJECT_TYPES.NODE,
			data: newNode,
		});

		// Don't queue connected node update here - it will be handled in the sequential save process

		logger.info("Queueing route node for creation", {
			floorId,
			nodeFloorId: newNode.properties.floor_id,
			newNode,
			coordinates: newNode.geometry!.coordinates,
			connectToNodeId,
			willUpdateConnectedNode: !!connectToNodeId
		});

		logger.info("Node creation completed", {
            newNodeId: newNode.properties.id,
			wasConnected: !!connectToNodeId,
			connectToNodeId,
		});

		// DON'T call updateMapData here - let the useEffect handle it when state updates

        return tempId;
	};

	// Clear all temporary drawing elements from the map
	const clearTempDrawing = () => {
		if (!map.current) return;

		logger.info("Clearing temporary drawing elements");

		// Remove temporary markers
		(tempDrawingMarkers.current || []).forEach((marker) => marker.remove());
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

	// Add to change queue helper
	const queueChange = (change: Omit<ChangeQueueItem, "id">) => {
		setChangeQueue((prev) => [
			...prev,
			{
				...change,
                id: change.data.id,
			},
		]);
	};

	// --- Update handlers ---

	// Polygon Save (add or edit)
	const handlePolygonSave = () => {
		if (editingPolygonId) {
			// Edit
            const polygon = polygons.find((p) => p.properties.id === editingPolygonId);
			if (polygon) {
                const updated = PolygonBuilder.fromPolygon(polygon).setName(polygonName).build();
				queryClient.setQueryData<Polygon[]>(['polygons'], (old = []) =>
					old.map(p => (p.properties.id === editingPolygonId ? updated : p))
				);
				queueChange({
					type: CHANGE_TYPES.EDIT,
					objectType: OBJECT_TYPES.POLYGON,
					data: updated,
				});
			}
		} else {
			// Add
			const newPolygon = new PolygonBuilder()
				.setFloorId(floorId)
				.setName(polygonName)
				.setDescription("")
				.setType("Room")
				.setIsVisible(true)
				.setColor("#3b82f6")
                .setCategoryId(null) // or an appropriate value
				.setGeometry(convertPointsToCoordinates(pendingPolygonPoints))
				.build();

			queryClient.setQueryData<Polygon[]>(['polygons'], (old = []) => [...old, newPolygon]);
			queueChange({
				type: CHANGE_TYPES.ADD,
				objectType: OBJECT_TYPES.POLYGON,
				data: newPolygon,
			});
		}
		setShowPolygonDialog(false);
		setPolygonName("");
        // setIsWallMode(false);
		setEditingPolygonId(null);
		setPendingPolygonPoints([]);
	};

	// Beacon Save (add or edit)
	const handleBeaconSave = () => {
		if (editingBeaconId) {
			// Edit
            const beacon = beacons.find((b) => b.properties.id === editingBeaconId);
			if (beacon) {
                const updated = BeaconBuilder.fromBeacon(beacon).setName(beaconName).build();
				queryClient.setQueryData<Beacon[]>(['beacons'], (old = []) =>
					old.map(b => (b.properties.id === editingBeaconId ? updated : b))
				);
				queueChange({
					type: CHANGE_TYPES.EDIT,
					objectType: OBJECT_TYPES.BEACON,
					data: updated,
				});
			}
		} else {
			// Add
			if (pendingBeaconLocation) {
				const newBeacon = new BeaconBuilder()
					.setFloorId(floorId)
					.setName(beaconName)
					.setGeometry(pendingBeaconLocation.lng, pendingBeaconLocation.lat)
					.setIsVisible(true)
					.setIsActive(true)
					.setBatteryLevel(100)
					.build();

				queryClient.setQueryData<Beacon[]>(['beacons'], (old = []) => [...old, newBeacon]);
				queueChange({
					type: CHANGE_TYPES.ADD,
					objectType: OBJECT_TYPES.BEACON,
					data: newBeacon,
				});
			}
		}
		setShowBeaconDialog(false);
		setBeaconName("");
		setPendingBeaconLocation(null);
		setEditingBeaconId(null);
	};

	// Node Save (add or edit) - implement similar logic if you have node editing dialog
	const handleNodeSave = () => {
		if (editingNodeId) {
			// Edit
            const node = nodes.find((n) => n.properties.id === editingNodeId);
			if (node) {
				const updated = {...node, name: nodeName};
				queryClient.setQueryData<RouteNode[]>(['nodes'], (old = []) =>
                    old.map(n => (n.properties.id === editingNodeId ? updated : n))
				);
				queueChange({
					type: CHANGE_TYPES.EDIT,
					objectType: OBJECT_TYPES.NODE,
					data: updated,
				});
			}
		} else {
			// Add (if implementing node creation via dialog)
			logger.info("Node creation via dialog not yet implemented");
		}
		setShowNodeDialog(false);
		setNodeName("");
		setEditingNodeId(null);
	};

	// // Delete handler
	const handleDeleteItem = (
		type: "polygon" | "beacon" | "node",
		id: number,
		e: React.MouseEvent<HTMLButtonElement>
	) => {
		e.stopPropagation();
		logger.userAction("Delete item clicked", {type, id});
		switch (type) {
			case "polygon":
				queryClient.setQueryData<Polygon[]>(['polygons'], (old = []) =>
					old.filter(p => p.properties.id !== id)
				);
				queueChange({
					type: CHANGE_TYPES.DELETE,
					objectType: OBJECT_TYPES.POLYGON,
					data: {id},
				});
				break;
			case "beacon":
				queryClient.setQueryData<Beacon[]>(['beacons'], (old = []) =>
					old.filter(b => b.properties.id !== id)
				);
				queueChange({
					type: CHANGE_TYPES.DELETE,
					objectType: OBJECT_TYPES.BEACON,
					data: {id},
				});
				break;
			case "node":
				queryClient.setQueryData<RouteNode[]>(['nodes'], (old = []) =>
                    old.filter(n => n.properties.id !== id)
				);

				queueChange({
					type: CHANGE_TYPES.DELETE,
					objectType: OBJECT_TYPES.NODE,
					data: {id},
				});
				break;
		}
		if (selectedItem?.type === type && selectedItem?.id === id) {
			setSelectedItem(null);
		}
	};

	// --- UI: Unsaved changes indicator ---
	const hasUnsavedChanges = changeQueue.length > 0;

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
				queryClient.setQueryData<Polygon[]>(['polygons'], (old = []) => {
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


	// Handle nodes with temporary IDs sequentially, updating connections as we go
	const handleNodesWithTempIds = async (newQueue: any[], mutationMap: any) => {
		// Find all nodes with temporary IDs (negative IDs) that need to be created
		const tempNodeChanges = newQueue.filter(change => 
			change.objectType === OBJECT_TYPES.NODE && 
			change.type === CHANGE_TYPES.ADD && 
			change.data.properties.id < 0
		);

		if (tempNodeChanges.length === 0) return;

		logger.info("Processing nodes with temporary IDs", { count: tempNodeChanges.length });

		for (const nodeChange of tempNodeChanges) {
			try {
				const tempId = nodeChange.data.properties.id;
				
				// Create the node without connections first (to avoid temp ID references)
				// Backend expects GeoJSON format for creation too
				const nodeDataWithoutConnections = {
					type: "Feature" as const,
					geometry: {
						type: "Point" as const,
						coordinates: nodeChange.data.geometry?.coordinates || [0, 0]
					},
					properties: {
						floor_id: nodeChange.data.properties.floor_id,
						is_visible: nodeChange.data.properties.is_visible,
						connections: [] // Remove connections for creation
					}
				};

				logger.info("Sending GeoJSON creation data", { nodeDataWithoutConnections });

				// Save the node and get the real ID back
				// Temporarily disable query invalidation to prevent refetching
				const originalInvalidateQueries = queryClient.invalidateQueries;
				queryClient.invalidateQueries = () => Promise.resolve();
				
				const savedNode = await routeNodesMutations.create.mutateAsync({
					data: nodeDataWithoutConnections
				});
				
				// Restore query invalidation
				queryClient.invalidateQueries = originalInvalidateQueries;

				const realId = savedNode.properties.id;

				logger.info("Node saved with real ID", { tempId, realId });

				// Update all nodes in local state: replace tempId with realId in connections
				const currentNodes = queryClient.getQueryData<RouteNode[]>(['nodes']) || [];
				const updatedNodes = currentNodes.map(node => {
					if (node.properties.id === tempId) {
						// This is the node we just saved - update it with real ID and original connections
						return {
							...savedNode,
							properties: {
								...savedNode.properties,
								connections: nodeChange.data.properties.connections.map((connId: number) => 
									connId < 0 ? connId : connId // Keep temp IDs for now, they'll be updated later
								)
							}
						};
					} else if (node.properties.connections && node.properties.connections.includes(tempId)) {
						// This node has a connection to the node we just saved - update the connection
						return {
							...node,
							properties: {
								...node.properties,
								connections: node.properties.connections.map((connId: number) => 
									connId === tempId ? realId : connId
								)
							}
						};
					}
					return node;
				});

				// Update local state
				queryClient.setQueryData(['nodes'], updatedNodes);
				saveToStorage(STORAGE_KEYS.NODES, updatedNodes);

				// Remove this change from the queue
				newQueue = newQueue.filter(q => q.id !== nodeChange.id);
				setChangeQueue([...newQueue]);

				logger.info("Updated all node connections", { 
					tempId, 
					realId, 
					updatedNodesCount: updatedNodes.length 
				});

			} catch (err) {
				logger.error("Failed to save node with temp ID", err as Error, { 
					tempId: nodeChange.data.properties.id 
				});
				throw err; // Re-throw to handle in main save function
			}
		}

		// After all temp nodes are saved, update any remaining connections
		await updateNodeConnections();
	};

	// Update node connections after all temp IDs have been resolved
	const updateNodeConnections = async () => {
		const currentNodes = queryClient.getQueryData<RouteNode[]>(['nodes']) || [];
		
		logger.info("=== DEBUGGING CONNECTION UPDATES ===", {
			totalNodes: currentNodes.length,
			allNodeDetails: currentNodes.map(n => ({
				id: n.properties.id,
				connections: n.properties.connections,
				hasConnections: !!(n.properties.connections && n.properties.connections.length > 0),
				idIsReal: n.properties.id > 0,
				allConnectionsReal: n.properties.connections ? n.properties.connections.every(connId => connId > 0) : false
			}))
		});
		
		// Find nodes that have connections (regardless of ID type for now)
		const nodesWithConnections = currentNodes.filter(node => 
			node.properties.connections && node.properties.connections.length > 0
		);

		logger.info("Nodes with any connections", {
			count: nodesWithConnections.length,
			details: nodesWithConnections.map(n => ({
				id: n.properties.id,
				connections: n.properties.connections
			}))
		});

		// Only update nodes that have connections with REAL IDs (positive numbers)
		const nodesToUpdate = nodesWithConnections.filter(node => 
			node.properties.id > 0 && // Only real IDs
			node.properties.connections.every(connId => connId > 0) // Only real connection IDs
		);

		logger.info("Nodes ready for connection updates (filtered)", {
			nodesToUpdate: nodesToUpdate.length,
			nodeDetails: nodesToUpdate.map(n => ({
				id: n.properties.id,
				connections: n.properties.connections
			}))
		});

		if (nodesToUpdate.length === 0) {
			logger.warn("❌ NO NODES READY FOR CONNECTION UPDATES - this is why connections disappear!");
			return;
		}

		// Temporarily disable query invalidation to prevent refetching during connection updates
		const originalInvalidateQueries = queryClient.invalidateQueries;
		queryClient.invalidateQueries = () => Promise.resolve();

		for (const node of nodesToUpdate) {
			try {
				logger.info("About to update node connections", {
					nodeId: node.properties.id,
					connections: node.properties.connections
				});

				// Send only properties with flattened coordinates
				const updateData = {
					floor_id: node.properties.floor_id,
					is_visible: node.properties.is_visible,
					connections: node.properties.connections, // Now all real IDs
					// Include flattened coordinate data
					...(node.geometry && node.geometry.coordinates && {
						longitude: node.geometry.coordinates[0],
						latitude: node.geometry.coordinates[1]
					})
				};

				logger.info("Sending connection update with REAL IDs", { updateData });

				// Bypass BaseApi.update to avoid ID corruption - call API directly
				const apiUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5090';
				const token = localStorage.getItem('jwtToken');
				
				const response = await fetch(`${apiUrl}/api/RouteNode/${node.properties.id}`, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
						...(token && { 'Authorization': `Bearer ${token}` })
					},
					body: JSON.stringify(updateData)
				});

				if (!response.ok) {
					const errorText = await response.text();
					throw new Error(`HTTP ${response.status}: ${errorText}`);
				}
				logger.info("Successfully updated node connections", { 
					nodeId: node.properties.id, 
					connections: node.properties.connections 
				});
			} catch (err) {
				logger.error("Failed to update node connections", err as Error, { 
					nodeId: node.properties.id 
				});
			}
		}

		// Restore query invalidation
		queryClient.invalidateQueries = originalInvalidateQueries;
	};

	const handleSave = async () => {
		if (changeQueue.length === 0) return;
		setSaveStatus("saving");
		setSaveError(null);
		let newQueue = [...changeQueue];

		const mutationMap = {
			[OBJECT_TYPES.POLYGON]: poisMutations,
			[OBJECT_TYPES.BEACON]: beaconsMutations,
			[OBJECT_TYPES.NODE]: routeNodesMutations,
		};

		// First, handle nodes with temporary IDs sequentially
		await handleNodesWithTempIds(newQueue, mutationMap);

		// Then handle remaining changes (polygons, beacons, node updates)
		for (const change of newQueue) {
			// Skip nodes with temp IDs as they were already handled
			if (change.objectType === OBJECT_TYPES.NODE && 
				change.type === CHANGE_TYPES.ADD && 
				change.data.properties.id < 0) {
				continue;
			}

			try {
				const mutations = mutationMap[change.objectType];
				if (!mutations) throw new Error(`No mutations defined for objectType ${change.objectType}`);

				if (change.type === CHANGE_TYPES.ADD) {
					await mutations.create.mutateAsync(change);
				} else if (change.type === CHANGE_TYPES.EDIT) {
					await mutations.update.mutateAsync(change);
				} else if (change.type === CHANGE_TYPES.DELETE) {
					await mutations.delete.mutateAsync(change.data.id);
				}
				// Remove from queue on success
				newQueue = newQueue.filter((q) => q.id !== change.id);
				setChangeQueue([...newQueue]);
			} catch (err) {
				setSaveStatus("error");

				// Provide more helpful error messages
				let errorMessage: string = UI_MESSAGES.FLOOR_EDITOR_SAVE_ERROR;
				if (err instanceof Error) {
					if (err.message.includes("404")) {
						errorMessage = `${UI_MESSAGES.FLOOR_EDITOR_BACKEND_ERROR} Object not found (404).`;
					} else if (
						err.message.includes("Failed to fetch") ||
						err.message.includes("Network")
					) {
						errorMessage = `${UI_MESSAGES.FLOOR_EDITOR_BACKEND_ERROR} Cannot connect to server.`;
					} else {
						errorMessage = `${UI_MESSAGES.FLOOR_EDITOR_SAVE_ERROR}: ${err.message}`;
					}
				}

				setSaveError(errorMessage);
				logger.error("Save operation failed", err as Error, {
					changeId: change.id,
					changeType: change.type,
					objectType: change.objectType,
				});

				// Stop processing further, keep failed and remaining in queue
				break;
			}
		}

		if (newQueue.length === 0) {
			// Final refresh to sync with backend after all updates are complete
			await queryClient.invalidateQueries({queryKey: ['nodes']});
			
			setSaveStatus("success");
			setTimeout(() => setSaveStatus("idle"), 2000);
		} else {
			setSaveStatus("error");
		}
	};

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
						{hasUnsavedChanges && (
							<span className="unsaved-changes-indicator">
								{UI_MESSAGES.FLOOR_EDITOR_UNSAVED_CHANGES} (
								{changeQueue.length})
							</span>
						)}
						{saveStatus === "saving" && (
							<span className="save-status saving">
								{UI_MESSAGES.FLOOR_EDITOR_SAVE_IN_PROGRESS}
							</span>
						)}
						{saveStatus === "success" && (
							<span className="save-status success">
								{UI_MESSAGES.FLOOR_EDITOR_SAVE_SUCCESS}
							</span>
						)}
						{saveError && (
							<span className="save-status error">
								{saveError}
							</span>
						)}
						<Button
							variant="PRIMARY"
							onClick={handleSave}
							disabled={
								!hasUnsavedChanges || saveStatus === "saving"
							}
						>
							{saveStatus === "saving"
								? UI_MESSAGES.FLOOR_EDITOR_SAVE_IN_PROGRESS
								: UI_MESSAGES.FLOOR_EDITOR_SAVE_BUTTON}
						</Button>
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
					onClearAll={() => {
						logger.userAction("Clear all button clicked");
						queryClient.setQueryData<Polygon[]>(['polygons'], []);
						queryClient.setQueryData<Beacon[]>(['beacons'], []);
						queryClient.setQueryData<RouteNode[]>(['nodes'], []);
						queueChange({
							type: CHANGE_TYPES.DELETE,
							objectType: OBJECT_TYPES.POLYGON,
							data: {id: "all"},
						});
						queueChange({
							type: CHANGE_TYPES.DELETE,
							objectType: OBJECT_TYPES.BEACON,
							data: {id: "all"},
						});
						queueChange({
							type: CHANGE_TYPES.DELETE,
							objectType: OBJECT_TYPES.NODE,
							data: {id: "all"},
						});
						logger.info("All data cleared from state and queue");
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