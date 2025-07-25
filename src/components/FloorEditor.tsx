import {config, Map, Marker, Popup} from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {MAPTILER_API_KEY, MAPTILER_STYLE_URL} from "../constants/api";
import {UI_MESSAGES} from "../constants/ui";
import {beaconsApi, Floor, FloorLayoutData, floorsApi, poisApi, routeEdgesApi, routeNodesApi,} from "../utils/api";
import {createLogger} from "../utils/logger";
import {Button, Container, Header} from "./common";
import "./FloorEditor.css";
import BeaconDialog from "./FloorEditor/BeaconDialog";
import DrawingToolbar, {DrawingTool} from "./FloorEditor/DrawingToolbar";
import LayersPanel from "./FloorEditor/LayersPanel";
import MapContainer from "./FloorEditor/MapContainer";
import PolygonDialog from "./FloorEditor/PolygonDialog";
import RouteNodeDialog from "./FloorEditor/RouteNodeDialog";

const logger = createLogger("FloorEditor");

// Local storage keys
const STORAGE_KEYS = {
	POLYGONS: "floorEditor_polygons",
	BEACONS: "floorEditor_beacons",
	NODES: "floorEditor_nodes",
	EDGES: "floorEditor_edges",
	CHANGE_QUEUE: "floorEditor_changeQueue",
} as const;

// Change queue types
const CHANGE_TYPES = {
	ADD: "add",
	EDIT: "edit",
	DELETE: "delete",
} as const;

const OBJECT_TYPES = {
	POLYGON: "polygon",
	BEACON: "beacon",
	NODE: "node",
} as const;

interface ChangeQueueItem {
	id: string; // unique for queue
	type: (typeof CHANGE_TYPES)[keyof typeof CHANGE_TYPES];
	objectType: (typeof OBJECT_TYPES)[keyof typeof OBJECT_TYPES];
	data: any; // the object data (for add/edit), or { id } for delete
}

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

// Restore local storage utilities for polygons, beacons, nodes, edges
const loadFromStorage = (key: string, defaultValue: any): any => {
	try {
		const stored = localStorage.getItem(key);
		return stored ? JSON.parse(stored) : defaultValue;
	} catch (error) {
		logger.warn(
			`Failed to load from localStorage key: ${key}`,
			error as Error
		);
		return defaultValue;
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

interface FloorEditorProps {
	floorId: string;
	onBack: () => void;
}

// Sample data interfaces
interface Point {
	x: number;
	y: number;
}

interface Polygon {
	id: string;
	name: string;
	points: Point[];
	type: "poi" | "wall";
	visible: boolean;
	color: string;
}

interface Beacon {
	id: string;
	name: string;
	x: number;
	y: number;
	visible: boolean;
}

interface RouteNode {
	id: string;
	x: number;
	y: number;
	connections: string[];
	visible: boolean;
}

interface Edge {
	id: string;
	fromNodeId: string;
	toNodeId: string;
	visible: boolean;
}

// // Sample data
// const SAMPLE_POLYGONS: Polygon[] = [
// 	{
// 		id: "1",
// 		name: "Classroom A",
// 		points: [
// 			{ x: 50.1422, y: 26.3133 },
// 			{ x: 50.1424, y: 26.3133 },
// 			{ x: 50.1424, y: 26.3134 },
// 			{ x: 50.1422, y: 26.3134 },
// 		],
// 		type: "poi",
// 		visible: true,
// 		color: "#3b82f6",
// 	},
// 	{
// 		id: "2",
// 		name: "Classroom B",
// 		points: [
// 			{ x: 50.1425, y: 26.3133 },
// 			{ x: 50.1427, y: 26.3133 },
// 			{ x: 50.1427, y: 26.3134 },
// 			{ x: 50.1425, y: 26.3134 },
// 		],
// 		type: "poi",
// 		visible: true,
// 		color: "#10b981",
// 	},
// 	{
// 		id: "3",
// 		name: "Hallway Wall",
// 		points: [
// 			{ x: 50.14215, y: 26.31345 },
// 			{ x: 50.14275, y: 26.31345 },
// 			{ x: 50.14275, y: 26.31347 },
// 			{ x: 50.14215, y: 26.31347 },
// 		],
// 		type: "wall",
// 		visible: true,
// 		color: "#6b7280",
// 	},
// ];
//
// const SAMPLE_BEACONS: Beacon[] = [
// 	{ id: "1", name: "Beacon 1", x: 50.1423, y: 26.31335, visible: true },
// 	{ id: "2", name: "Beacon 2", x: 50.1426, y: 26.31335, visible: true },
// 	{ id: "3", name: "Beacon 3", x: 50.14245, y: 26.3135, visible: true },
// ];
//
// const SAMPLE_NODES: RouteNode[] = [
// 	{ id: "1", x: 50.1423, y: 26.31348, connections: ["2"], visible: true },
// 	{
// 		id: "2",
// 		x: 50.1426,
// 		y: 26.31348,
// 		connections: ["1", "3"],
// 		visible: true,
// 	},
// 	{ id: "3", x: 50.14245, y: 26.31355, connections: ["2"], visible: true },
// ];

// const SAMPLE_EDGES: Edge[] = [
// 	{ id: "1", fromNodeId: "1", toNodeId: "2", visible: true },
// 	{ id: "2", fromNodeId: "2", toNodeId: "3", visible: true },
// ];

const FloorEditor: React.FC<FloorEditorProps> = ({ floorId, onBack }) => {
	// Remove the immediate console.log and replace with logger
	logger.info("FloorEditor component starting", { floorId });

	const [floor, setFloor] = useState<Floor | null>(null);
	const [floorData, setFloorData] = useState<FloorLayoutData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

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

	// Track if we've loaded initial data
	const initialDataLoaded = useRef<boolean>(false);

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
	const [polygons, setPolygons] = useState<Polygon[]>(() =>
		loadFromStorage(STORAGE_KEYS.POLYGONS, [...SAMPLE_POLYGONS])
	);
	const [beacons, setBeacons] = useState<Beacon[]>(() =>
		loadFromStorage(STORAGE_KEYS.BEACONS, [...SAMPLE_BEACONS])
	);
	const [nodes, setNodes] = useState<RouteNode[]>(() =>
		loadFromStorage(STORAGE_KEYS.NODES, [...SAMPLE_NODES])
	);
	const [edges, setEdges] = useState<Edge[]>(() =>
		loadFromStorage(STORAGE_KEYS.EDGES, [...SAMPLE_EDGES])
	);

	// Route node creation state
	const [selectedNodeForConnection, setSelectedNodeForConnection] = useState<
		string | null
	>(null);
	const selectedNodeForConnectionRef = useRef<string | null>(null);
	const [lastPlacedNodeId, setLastPlacedNodeId] = useState<string | null>(
		null
	);
	const lastPlacedNodeIdRef = useRef<string | null>(null);

	// Selection state
	const [selectedItem, setSelectedItem] = useState<{
		type: "polygon" | "beacon" | "node";
		id: string;
	} | null>(null);

	// Layer filter state
	const [layerFilter, setLayerFilter] = useState<
		"polygons" | "beacons" | "nodes"
	>("polygons");

	// Polygon dialog state
	const [showPolygonDialog, setShowPolygonDialog] = useState(false);
	const [polygonName, setPolygonName] = useState("");
	const [isWallMode, setIsWallMode] = useState(false);

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
	const [editingPolygonId, setEditingPolygonId] = useState<string | null>(
		null
	);

	// Change queue state
	const [changeQueue, setChangeQueue] = useState<ChangeQueueItem[]>(() =>
		loadQueueFromStorage()
	);
	const [saveStatus, setSaveStatus] = useState<
		"idle" | "saving" | "success" | "error"
	>("idle");
	const [saveError, setSaveError] = useState<string | null>(null);

	// Sync queue to local storage
	useEffect(() => {
		saveQueueToStorage(changeQueue);
	}, [changeQueue]);

	useEffect(() => {
		logger.info("FloorEditor component mounted", { floorId });
		loadFloorData();

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
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [floorId]);

	// NOTE: Map initialization useEffect moved to after initializeMap function declaration

	// Function to update map with current data (called manually when needed)
	const updateMapData = useCallback(
		(
			currentPolygons: Polygon[],
			currentBeacons: Beacon[],
			currentNodes: RouteNode[],
			originalEdges: Edge[],
			selectedNodeId?: string | null
		) => {
			if (!map.current) return;

			// Clean up orphaned edges before rendering
			const nodeIds = new Set(currentNodes.map((n) => n.id));
			const validEdges = originalEdges.filter((edge: Edge) => {
				const isValid =
					nodeIds.has(edge.fromNodeId) && nodeIds.has(edge.toNodeId);
				if (!isValid) {
					logger.warn("Skipping orphaned edge during render", {
						edgeId: edge.id,
						fromNodeId: edge.fromNodeId,
						toNodeId: edge.toNodeId,
					});
				}
				return isValid;
			});

			// Use validated edges for rendering
			const renderEdges = validEdges;

			logger.info("Updating map with current data", {
				polygonsCount: currentPolygons.length,
				beaconsCount: currentBeacons.length,
				nodesCount: currentNodes.length,
				edgesCount: validEdges.length,
				originalEdgesCount: originalEdges.length,
				selectedNodeId,
				nodeIds: currentNodes.map((n) => n.id),
				edgeIds: renderEdges.map((e: Edge) => e.id),
				nodeDetails: currentNodes.map((n) => ({
					id: n.id,
					x: n.x,
					y: n.y,
					visible: n.visible,
				})),
				edgeDetails: renderEdges.map((e: Edge) => ({
					id: e.id,
					from: e.fromNodeId,
					to: e.toNodeId,
					visible: e.visible,
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
			currentPolygons.forEach((polygon) => {
				if (polygon.visible && polygon.points.length >= 3) {
					const coordinates = polygon.points.map((p) => [p.x, p.y]);
					coordinates.push(coordinates[0]); // Close the polygon

					const sourceId = `polygon-source-${polygon.id}`;
					const layerId = `polygon-layer-${polygon.id}`;

					mapInstance.addSource(sourceId, {
						type: "geojson",
						data: {
							type: "Feature",
							geometry: {
								type: "Polygon",
								coordinates: [coordinates],
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

					// Add center marker for interaction
					const centerX =
						polygon.points.reduce((sum, p) => sum + p.x, 0) /
						polygon.points.length;
					const centerY =
						polygon.points.reduce((sum, p) => sum + p.y, 0) /
						polygon.points.length;

					const marker = new Marker({
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

					mapMarkers.current[`polygon-${polygon.id}`] = marker;
				}
			});

			// Add beacons
			currentBeacons.forEach((beacon) => {
				if (beacon.visible) {
					const marker = new Marker({ color: "#fbbf24" })
						.setLngLat([beacon.x, beacon.y])
						.setPopup(
							new Popup().setHTML(
								`<strong>${beacon.name}</strong><br>Type: Beacon`
							)
						)
						.addTo(mapInstance);

					mapMarkers.current[`beacon-${beacon.id}`] = marker;
				}
			});

			// Add nodes
			logger.info("Processing nodes for rendering", {
				totalNodes: currentNodes.length,
				visibleNodes: currentNodes.filter((n) => n.visible).length,
			});

			currentNodes.forEach((node) => {
				logger.info("Processing node", {
					nodeId: node.id,
					visible: node.visible,
					x: node.x,
					y: node.y,
					connections: node.connections,
					isSelected: selectedNodeId === node.id,
				});

				if (node.visible) {
					const isSelected = selectedNodeId === node.id;
					const marker = new Marker({
						color: isSelected ? "#ef4444" : "#3b82f6",
					})
						.setLngLat([node.x, node.y])
						.addTo(mapInstance);

					mapMarkers.current[`node-${node.id}`] = marker;
					logger.info("Node marker added to map", {
						nodeId: node.id,
						markerKey: `node-${node.id}`,
					});
				} else {
					logger.warn("Node not visible, skipping", {
						nodeId: node.id,
					});
				}
			});

			// Add route lines between connected nodes
			logger.info("Processing edges for rendering", {
				totalEdges: renderEdges.length,
				visibleEdges: renderEdges.filter((e) => e.visible).length,
			});

			renderEdges.forEach((edge) => {
				logger.info("Processing edge", {
					edgeId: edge.id,
					visible: edge.visible,
					fromNodeId: edge.fromNodeId,
					toNodeId: edge.toNodeId,
				});

				if (edge.visible) {
					const fromNode = currentNodes.find(
						(n) => n.id === edge.fromNodeId
					);
					const toNode = currentNodes.find(
						(n) => n.id === edge.toNodeId
					);

					logger.info("Edge node lookup", {
						edgeId: edge.id,
						lookingForFromNodeId: edge.fromNodeId,
						lookingForToNodeId: edge.toNodeId,
						availableNodeIds: currentNodes.map((n) => n.id),
						fromNode: fromNode
							? { id: fromNode.id, visible: fromNode.visible }
							: null,
						toNode: toNode
							? { id: toNode.id, visible: toNode.visible }
							: null,
					});

					if (
						fromNode &&
						toNode &&
						fromNode.visible &&
						toNode.visible
					) {
						const sourceId = `edge-source-${edge.id}`;
						const layerId = `edge-layer-${edge.id}`;

						logger.info("Adding edge to map", {
							edgeId: edge.id,
							sourceId,
							layerId,
							fromCoords: [fromNode.x, fromNode.y],
							toCoords: [toNode.x, toNode.y],
						});

						mapInstance.addSource(sourceId, {
							type: "geojson",
							data: {
								type: "Feature",
								geometry: {
									type: "LineString",
									coordinates: [
										[fromNode.x, fromNode.y],
										[toNode.x, toNode.y],
									],
								},
								properties: {},
							},
						});

						mapInstance.addLayer({
							id: layerId,
							type: "line",
							source: sourceId,
							paint: {
								"line-color": "#3b82f6", // Blue color as requested
								"line-width": 3,
								"line-opacity": 0.8,
							},
						});

						// Track sources and layers
						mapSources.current[`edge-${edge.id}`] = sourceId;
						mapLayers.current[`edge-${edge.id}`] = layerId;

						logger.info("Edge layer added successfully", {
							edgeId: edge.id,
							sourceId,
							layerId,
						});
					} else {
						logger.warn("Edge nodes not found or not visible", {
							edgeId: edge.id,
							fromNodeId: edge.fromNodeId,
							toNodeId: edge.toNodeId,
							fromNodeFound: !!fromNode,
							toNodeFound: !!toNode,
							fromNodeVisible: fromNode?.visible,
							toNodeVisible: toNode?.visible,
							availableNodeIds: currentNodes.map((n) => n.id),
							"fromNodeId in available": currentNodes.some(
								(n) => n.id === edge.fromNodeId
							),
							"toNodeId in available": currentNodes.some(
								(n) => n.id === edge.toNodeId
							),
						});
					}
				} else {
					logger.warn("Edge not visible, skipping", {
						edgeId: edge.id,
					});
				}
			});

			// Add highlighting for selected object
			if (selectedItem) {
				const { type, id } = selectedItem;

				if (type === "polygon") {
					const polygon = currentPolygons.find((p) => p.id === id);
					if (polygon && polygon.visible) {
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
					const beacon = currentBeacons.find((b) => b.id === id);
					if (beacon && beacon.visible) {
						// Highlight selected beacon
						const marker = mapMarkers.current[`beacon-${id}`];
						if (marker) {
							marker.remove();
							const highlightedMarker = new Marker({
								color: "#ef4444",
								scale: 1.2,
							})
								.setLngLat([beacon.x, beacon.y])
								.setPopup(
									new Popup().setHTML(
										`<strong>${beacon.name}</strong><br>Type: Beacon (SELECTED)`
									)
								)
								.addTo(mapInstance);
							mapMarkers.current[`beacon-${id}`] =
								highlightedMarker;
						}
					}
				} else if (type === "node") {
					const node = currentNodes.find((n) => n.id === id);
					if (node && node.visible) {
						// Highlight selected node
						const marker = mapMarkers.current[`node-${id}`];
						if (marker) {
							marker.remove();
							const highlightedMarker = new Marker({
								color: "#ef4444",
								scale: 1.2,
							})
								.setLngLat([node.x, node.y])
								.addTo(mapInstance);
							mapMarkers.current[`node-${id}`] =
								highlightedMarker;
						}
					}
				}
			}

			logger.info("Map data updated successfully");
		},
		[selectedItem]
	); // Add selectedItem as dependency

	// Clean up orphaned edges that reference non-existent nodes
	const cleanupOrphanedEdges = useCallback(() => {
		const currentNodes = JSON.parse(
			localStorage.getItem("floorEditor_nodes") || "[]"
		);
		const currentEdges = JSON.parse(
			localStorage.getItem("floorEditor_edges") || "[]"
		);
		const nodeIds = new Set(currentNodes.map((n: any) => n.id));

		const validEdges = currentEdges.filter((edge: any) => {
			const isValid =
				nodeIds.has(edge.fromNodeId) && nodeIds.has(edge.toNodeId);
			if (!isValid) {
				logger.warn("Removing orphaned edge", {
					edgeId: edge.id,
					fromNodeId: edge.fromNodeId,
					toNodeId: edge.toNodeId,
					availableNodeIds: Array.from(nodeIds),
				});
			}
			return isValid;
		});

		if (validEdges.length !== currentEdges.length) {
			localStorage.setItem(
				"floorEditor_edges",
				JSON.stringify(validEdges)
			);
			setEdges(validEdges);
			logger.info("Cleaned up orphaned edges", {
				originalCount: currentEdges.length,
				cleanedCount: validEdges.length,
				removedCount: currentEdges.length - validEdges.length,
			});
		}
	}, []);

	// Load initial sample data and update map when data changes
	useEffect(() => {
		if (!mapLoading && map.current) {
			if (!initialDataLoaded.current) {
				logger.info("Adding initial sample data to map");
				// Clean up any orphaned edges first
				cleanupOrphanedEdges();
				initialDataLoaded.current = true;
			}
			updateMapData(
				polygons,
				beacons,
				nodes,
				edges,
				selectedNodeForConnection
			);
		}
	}, [
		mapLoading,
		polygons,
		beacons,
		nodes,
		edges,
		selectedNodeForConnection,
	]);

	const getUserLocationAndCenter = (mapInstance: Map) => {
		if ("geolocation" in navigator) {
			logger.info(
				"🌍 Requesting user location permission - this should show a browser popup"
			);

			navigator.geolocation.getCurrentPosition(
				(position) => {
					const { latitude, longitude } = position.coords;
					logger.info(
						"🎯 User location obtained, centering map NOW!",
						{ latitude, longitude }
					);

					// Force center the map
					mapInstance.flyTo({
						center: [longitude, latitude],
						zoom: 18,
						duration: 2000,
					});

					// Add a marker at user's location
					new Marker({ color: "#ef4444" })
						.setLngLat([longitude, latitude])
						.setPopup(
							new Popup().setHTML(
								"<strong>🎯 Your Location</strong>"
							)
						)
						.addTo(mapInstance);
				},
				(error) => {
					logger.warn(
						"Geolocation error - using default location",
						error
					);
					logger.info("Geolocation error details", {
						code: error.code,
						message: error.message,
					});
					// Keep default location (Honolulu)
				},
				{
					enableHighAccuracy: true,
					timeout: 15000, // Increased timeout
					maximumAge: 0, // Don't use cached location
				}
			);
		} else {
			logger.warn("Geolocation not supported by this browser");
		}
	};

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
				setError(null); // Clear any previous errors since map loaded successfully
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
					setError("Map failed to load. Please check your API key.");
					setMapLoading(false);
				} else {
					// Map already loaded successfully, just log the error but don't show to user
					logger.warn(
						"Map error after successful load (ignoring)",
						new Error(e.error?.message || "Map error occurred")
					);
				}
			});

			// Mouse move event to track coordinates (TEMPORARILY DISABLED to fix infinite re-renders)
			// mapInstance.on('mousemove', (e) => {
			//   // Clear previous timeout
			//   if (coordinateUpdateTimeout.current) {
			//     clearTimeout(coordinateUpdateTimeout.current);
			//   }
			//
			//   // Throttle coordinate updates to every 100ms
			//   coordinateUpdateTimeout.current = setTimeout(() => {
			//     updateCoordinates(e.lngLat.lng, e.lngLat.lat);
			//   }, 100);
			// });

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
					setError(
						"Map loading timeout. Please check your internet connection and API key."
					);
					setMapLoading(false);
				}
				mapLoadTimeout.current = null;
			}, 30000);
		} catch (error) {
			logger.error("Failed to initialize map", error as Error);
			setError(
				"Failed to initialize map. Please check the MapTiler configuration."
			);
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

		const { lng, lat } = e.lngLat;
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
		setPendingBeaconLocation({ lng, lat });
		setBeaconName(`Beacon ${beacons.length + 1}`); // Default name
		setShowBeaconDialog(true);

		logger.userAction("Beacon dialog opened", { location: { lng, lat } });
	};

	const handleNodeClick = (lng: number, lat: number) => {
		// Check if this click is near an existing node (using Canvas-style distance calculation)
		const clickedNode = nodes.find((node) => {
			if (!node.visible) return false;
			// Use proper Euclidean distance like the working Canvas version
			const distance = Math.sqrt(
				(node.x - lng) ** 2 + (node.y - lat) ** 2
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
			clickedNodeId: clickedNode?.id || "none",
		});

		if (clickedNode) {
			// Clicked on an existing node
			if (currentSelectedNode) {
				if (currentSelectedNode === clickedNode.id) {
					// Clicking on the same node - deselect it
					setSelectedNodeForConnection(null);
					selectedNodeForConnectionRef.current = null;
					logger.userAction("Node deselected", {
						nodeId: clickedNode.id,
					});
				} else {
					// Can't connect a node to itself or create duplicate connections
					logger.warn(
						"Cannot connect node to itself or create duplicate connection"
					);
				}
			} else {
				// Select this node for connection
				setSelectedNodeForConnection(clickedNode.id);
				selectedNodeForConnectionRef.current = clickedNode.id;
				logger.userAction("Node selected for connection", {
					nodeId: clickedNode.id,
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
		connectToNodeId: string | null
	): string => {
		const newNode: RouteNode = {
			id: Date.now().toString(),
			x: lng,
			y: lat,
			connections: connectToNodeId ? [connectToNodeId] : [],
			visible: true,
		};

		logger.info("Adding new node - DETAILED", {
			newNodeId: newNode.id,
			newNodeCoords: [lng, lat],
			connectToNodeId,
			currentNodesCount: nodes.length,
			currentEdgesCount: edges.length,
			currentNodeIds: nodes.map((n) => n.id),
			currentEdgeIds: edges.map((e) => e.id),
			lastPlacedNodeIdRef: lastPlacedNodeIdRef.current,
			willCreateEdge: !!connectToNodeId,
		});

		// CRITICAL FIX: Update state atomically to prevent race conditions
		// Use functional updates to ensure we're working with the latest state
		setNodes((prevNodes) => {
			const finalNodes = [...prevNodes, newNode];
			if (connectToNodeId) {
				const updatedNodes = finalNodes.map((node) =>
					node.id === connectToNodeId
						? {
								...node,
								connections: [...node.connections, newNode.id],
						  }
						: node
				);

				// Save to localStorage with the updated nodes
				saveToStorage(STORAGE_KEYS.NODES, updatedNodes);

				logger.info("Updated node connections", {
					connectToNodeId,
					newNodeId: newNode.id,
					totalNodes: updatedNodes.length,
				});

				return updatedNodes;
			} else {
				// Save isolated node to localStorage
				saveToStorage(STORAGE_KEYS.NODES, finalNodes);
				logger.userAction("Isolated node added", { newNode });
				return finalNodes;
			}
		});

		if (connectToNodeId) {
			setEdges((prevEdges) => {
				const newEdge: Edge = {
					id: `edge_${connectToNodeId}_to_${
						newNode.id
					}_${Date.now()}`,
					fromNodeId: connectToNodeId,
					toNodeId: newNode.id,
					visible: true,
				};
				const finalEdges = [...prevEdges, newEdge];

				// Save to localStorage with the final state
				saveToStorage(STORAGE_KEYS.EDGES, finalEdges);

				logger.info("Edge created and saved", {
					newEdge,
					totalEdges: finalEdges.length,
					edgeDetails: {
						from: connectToNodeId,
						to: newNode.id,
						id: newEdge.id,
					},
				});

				logger.userAction("Connected node added", {
					newNode,
					connectedToNodeId: connectToNodeId,
					newEdge,
				});

				return finalEdges;
			});
		}

		logger.info("Node creation completed", {
			newNodeId: newNode.id,
			wasConnected: !!connectToNodeId,
			connectToNodeId,
		});

		// DON'T call updateMapData here - let the useEffect handle it when state updates

		return newNode.id;
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

		const marker = new Marker({ element: markerElement })
			.setLngLat([lng, lat])
			.addTo(map.current);

		tempDrawingMarkers.current.push(marker);

		logger.info("Added polygon point marker", {
			point: { lng, lat },
			pointIndex,
			isFirst,
			color,
		});
	};

	// Add a line between two points
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

	// Check if the clicked point is close to the first point (to close the polygon)
	const isCloseToFirstPoint = (
		lng: number,
		lat: number,
		firstPoint: Point
	): boolean => {
		const deltaLng = Math.abs(lng - firstPoint.x);
		const deltaLat = Math.abs(lat - firstPoint.y);
		const maxDelta = 0.0005; // About 50 meters - much easier to click accurately

		logger.info("Checking if close to first point", {
			clickedPoint: { lng, lat },
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
		const newPoint: Point = { x: lng, y: lat };

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
			setCurrentPolygonPoints([...pendingPolygonPointsRef.current]); // Don't include the closing point

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

			setPendingPolygonCenter({ lng: centerX, lat: centerY });
			setPolygonName("");
			setIsWallMode(false);
			setShowPolygonDialog(true);

			logger.info("🎉 Showing polygon dialog", {
				center: { lng: centerX, lat: centerY },
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

	const loadFloorData = async () => {
		const numericFloorId = parseInt(floorId, 10);
		logger.userAction("Loading floor data", {
			originalFloorId: floorId,
			originalType: typeof floorId,
			numericFloorId,
			isValidNumber: !isNaN(numericFloorId),
		});
		setLoading(true);
		setError(null);

		if (isNaN(numericFloorId)) {
			const errorMsg = `Invalid floor ID: ${floorId} cannot be converted to a number`;
			logger.error(errorMsg, new Error(errorMsg));
			setError(errorMsg);
			setLoading(false);
			return;
		}

		try {
			const [floorInfo, pois, routeNodes, routeEdges] = await Promise.all(
				[
					floorsApi.getById(numericFloorId),
					poisApi.getByFloor(numericFloorId.toString()),
					routeNodesApi.getByFloor(numericFloorId.toString()),
					routeEdgesApi.getByFloor(numericFloorId.toString()),
				]
			);

			// Convert to legacy NavigationNode and NavigationEdge format for compatibility
			const nodes = routeNodes.map((node) => ({
				id: node.id,
				floorId: node.floorId,
				x: node.x,
				y: node.y,
				type: node.nodeType || "waypoint",
			}));

			const edges = routeEdges.map((edge) => ({
				id: edge.id,
				floorId: edge.floorId,
				fromNodeId: edge.fromNodeId,
				toNodeId: edge.toNodeId,
				weight: edge.weight,
			}));

			const layoutData: FloorLayoutData = {
				pois,
				nodes,
				edges,
			};

			setFloor(floorInfo);
			setFloorData(layoutData);
			logger.info("Floor data loaded successfully", {
				floorId: numericFloorId,
				floorName: floorInfo.name,
				poisCount: layoutData.pois.length,
				nodesCount: layoutData.nodes.length,
				edgesCount: layoutData.edges.length,
			});
		} catch (error) {
			logger.error("Failed to load floor data", error as Error, {
				floorId: numericFloorId,
				originalFloorId: floorId,
				errorType: (error as Error).constructor.name,
				errorMessage: (error as Error).message,
			});
			setError(UI_MESSAGES.ERROR_GENERIC);
		} finally {
			setLoading(false);
		}
	};

	const handleToolChange = (tool: DrawingTool) => {
		logger.info("Tool change requested", {
			from: activeTool,
			to: tool,
			isDrawingPolygon,
			pendingPoints: pendingPolygonPoints.length,
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
			setCurrentPolygonPoints([]);
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
				id: `${change.type}_${
					change.objectType
				}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
			},
		]);
	};

	// --- Update handlers ---

	// Polygon Save (add or edit)
	const handlePolygonSave = () => {
		if (editingPolygonId) {
			// Edit
			const polygon = polygons.find((p) => p.id === editingPolygonId);
			if (polygon) {
				const updated = {
					...polygon,
					name: polygonName,
					type: isWallMode ? ("wall" as "wall") : ("poi" as "poi"),
				};
				setPolygons((prev) =>
					prev.map((p) => (p.id === editingPolygonId ? updated : p))
				);
				queueChange({
					type: CHANGE_TYPES.EDIT,
					objectType: OBJECT_TYPES.POLYGON,
					data: updated,
				});
			}
		} else {
			// Add
			const newId = `${Date.now()}_${Math.random()
				.toString(36)
				.substr(2, 5)}`;
			const newPolygon = {
				id: newId,
				name: polygonName,
				points: pendingPolygonPoints,
				type: isWallMode ? ("wall" as "wall") : ("poi" as "poi"),
				visible: true,
				color: "#3b82f6",
			};
			setPolygons((prev) => [...prev, newPolygon]);
			queueChange({
				type: CHANGE_TYPES.ADD,
				objectType: OBJECT_TYPES.POLYGON,
				data: newPolygon,
			});
		}
		setShowPolygonDialog(false);
		setPolygonName("");
		setIsWallMode(false);
		setEditingPolygonId(null);
		setPendingPolygonPoints([]);
	};

	// Beacon Save (add or edit)
	const handleBeaconSave = () => {
		if (editingBeaconId) {
			// Edit
			const beacon = beacons.find((b) => b.id === editingBeaconId);
			if (beacon) {
				const updated = { ...beacon, name: beaconName };
				setBeacons((prev) =>
					prev.map((b) => (b.id === editingBeaconId ? updated : b))
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
				const newId = `${Date.now()}_${Math.random()
					.toString(36)
					.substr(2, 5)}`;
				const newBeacon = {
					id: newId,
					name: beaconName,
					x: pendingBeaconLocation.lng,
					y: pendingBeaconLocation.lat,
					visible: true,
				};
				setBeacons((prev) => [...prev, newBeacon]);
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
			const node = nodes.find((n) => n.id === editingNodeId);
			if (node) {
				const updated = { ...node, name: nodeName };
				setNodes((prev) =>
					prev.map((n) => (n.id === editingNodeId ? updated : n))
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

	// Delete handler
	const handleDeleteItem = (
		type: "polygon" | "beacon" | "node",
		id: string,
		e: React.MouseEvent<HTMLButtonElement>
	) => {
		e.stopPropagation();
		logger.userAction("Delete item clicked", { type, id });
		switch (type) {
			case "polygon":
				setPolygons((prev) => prev.filter((p) => p.id !== id));
				queueChange({
					type: CHANGE_TYPES.DELETE,
					objectType: OBJECT_TYPES.POLYGON,
					data: { id },
				});
				break;
			case "beacon":
				setBeacons((prev) => prev.filter((b) => b.id !== id));
				queueChange({
					type: CHANGE_TYPES.DELETE,
					objectType: OBJECT_TYPES.BEACON,
					data: { id },
				});
				break;
			case "node":
				setNodes((prev) => prev.filter((n) => n.id !== id));
				setEdges((prev) =>
					prev.filter((e) => e.fromNodeId !== id && e.toNodeId !== id)
				);
				queueChange({
					type: CHANGE_TYPES.DELETE,
					objectType: OBJECT_TYPES.NODE,
					data: { id },
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
		id: string
	) => {
		logger.userAction("Layer visibility toggled", { type, id });

		if (!map.current) return;

		const mapInstance = map.current;

		switch (type) {
			case "polygon":
				setPolygons((prev) =>
					prev.map((p) => {
						if (p.id === id) {
							const newVisible = !p.visible;

							// Update map visibility
							const marker = mapMarkers.current[`polygon-${id}`];
							const layerId = mapLayers.current[`polygon-${id}`];
							const borderLayerId =
								mapLayers.current[`polygon-border-${id}`];

							if (marker) {
								if (newVisible) {
									marker.addTo(mapInstance);
								} else {
									marker.remove();
								}
							}

							if (layerId && mapInstance.getLayer(layerId)) {
								mapInstance.setLayoutProperty(
									layerId,
									"visibility",
									newVisible ? "visible" : "none"
								);
							}

							if (
								borderLayerId &&
								mapInstance.getLayer(borderLayerId)
							) {
								mapInstance.setLayoutProperty(
									borderLayerId,
									"visibility",
									newVisible ? "visible" : "none"
								);
							}

							return { ...p, visible: newVisible };
						}
						return p;
					})
				);
				break;

			case "beacon":
				setBeacons((prev) =>
					prev.map((b) => {
						if (b.id === id) {
							const newVisible = !b.visible;

							// Update map visibility
							const marker = mapMarkers.current[`beacon-${id}`];
							if (marker) {
								if (newVisible) {
									marker.addTo(mapInstance);
								} else {
									marker.remove();
								}
							}

							return { ...b, visible: newVisible };
						}
						return b;
					})
				);
				break;

			case "node":
				setNodes((prev) =>
					prev.map((n) => {
						if (n.id === id) {
							const newVisible = !n.visible;

							// Update map visibility
							const marker = mapMarkers.current[`node-${id}`];
							if (marker) {
								if (newVisible) {
									marker.addTo(mapInstance);
								} else {
									marker.remove();
								}
							}

							// Also update any edges connected to this node
							edges.forEach((edge) => {
								if (
									edge.fromNodeId === id ||
									edge.toNodeId === id
								) {
									const layerId =
										mapLayers.current[`edge-${edge.id}`];
									if (
										layerId &&
										mapInstance.getLayer(layerId)
									) {
										const fromNode = nodes.find(
											(node) =>
												node.id === edge.fromNodeId
										);
										const toNode = nodes.find(
											(node) => node.id === edge.toNodeId
										);
										const shouldShowEdge =
											fromNode?.visible &&
											toNode?.visible &&
											edge.visible;
										mapInstance.setLayoutProperty(
											layerId,
											"visibility",
											shouldShowEdge ? "visible" : "none"
										);
									}
								}
							});

							return { ...n, visible: newVisible };
						}
						return n;
					})
				);
				break;
		}
	};

	const handleSave = async () => {
		if (changeQueue.length === 0) return;
		setSaveStatus("saving");
		setSaveError(null);
		let newQueue = [...changeQueue];

		for (const change of changeQueue) {
			try {
				if (change.objectType === OBJECT_TYPES.POLYGON) {
					// POI = polygon of type 'poi', wall = polygon of type 'wall'
					if (change.type === CHANGE_TYPES.ADD) {
						// Always create new polygons
						await poisApi.create({
							floorId: parseInt(floorId),
							name: change.data.name,
							poiType: change.data.type,
							isVisible: change.data.visible,
						});
					} else if (change.type === CHANGE_TYPES.EDIT) {
						// Only update if ID is numeric (from backend), otherwise create new
						const id = change.data.id;
						if (
							!isNaN(parseInt(id)) &&
							parseInt(id).toString() === id.toString()
						) {
							await poisApi.update(parseInt(id), {
								name: change.data.name,
								poiType: change.data.type,
								isVisible: change.data.visible,
							});
						} else {
							// Sample data with string ID - create as new
							await poisApi.create({
								floorId: parseInt(floorId),
								name: change.data.name,
								poiType: change.data.type,
								isVisible: change.data.visible,
							});
						}
					} else if (change.type === CHANGE_TYPES.DELETE) {
						// Only delete if ID is numeric (from backend)
						const id = change.data.id;
						if (
							!isNaN(parseInt(id)) &&
							parseInt(id).toString() === id.toString()
						) {
							await poisApi.delete(parseInt(id));
						}
						// If it's sample data, just remove from local state (already done)
					}
				} else if (change.objectType === OBJECT_TYPES.BEACON) {
					if (change.type === CHANGE_TYPES.ADD) {
						await beaconsApi.create({
							floorId: parseInt(floorId),
							name: change.data.name,
							x: change.data.x,
							y: change.data.y,
							isActive: true,
							isVisible: change.data.visible,
						});
					} else if (change.type === CHANGE_TYPES.EDIT) {
						const id = change.data.id;
						if (
							!isNaN(parseInt(id)) &&
							parseInt(id).toString() === id.toString()
						) {
							await beaconsApi.update(parseInt(id), {
								name: change.data.name,
								x: change.data.x,
								y: change.data.y,
								isVisible: change.data.visible,
							});
						} else {
							await beaconsApi.create({
								floorId: parseInt(floorId),
								name: change.data.name,
								x: change.data.x,
								y: change.data.y,
								isActive: true,
								isVisible: change.data.visible,
							});
						}
					} else if (change.type === CHANGE_TYPES.DELETE) {
						const id = change.data.id;
						if (
							!isNaN(parseInt(id)) &&
							parseInt(id).toString() === id.toString()
						) {
							await beaconsApi.delete(parseInt(id));
						}
					}
				} else if (change.objectType === OBJECT_TYPES.NODE) {
					if (change.type === CHANGE_TYPES.ADD) {
						await routeNodesApi.create({
							floorId: parseInt(floorId),
							x: change.data.x,
							y: change.data.y,
							nodeType: "waypoint",
							isVisible: change.data.visible,
						});
					} else if (change.type === CHANGE_TYPES.EDIT) {
						const id = change.data.id;
						if (
							!isNaN(parseInt(id)) &&
							parseInt(id).toString() === id.toString()
						) {
							await routeNodesApi.update(parseInt(id), {
								x: change.data.x,
								y: change.data.y,
								nodeType: "waypoint",
								isVisible: change.data.visible,
							});
						} else {
							await routeNodesApi.create({
								floorId: parseInt(floorId),
								x: change.data.x,
								y: change.data.y,
								nodeType: "waypoint",
								isVisible: change.data.visible,
							});
						}
					} else if (change.type === CHANGE_TYPES.DELETE) {
						const id = change.data.id;
						if (
							!isNaN(parseInt(id)) &&
							parseInt(id).toString() === id.toString()
						) {
							await routeNodesApi.delete(parseInt(id));
						}
					}
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
			setSaveStatus("success");
			setTimeout(() => setSaveStatus("idle"), 2000);
		} else {
			setSaveStatus("error");
		}
	};

	// Add missing state
	const [editingBeaconId, setEditingBeaconId] = useState<string | null>(null);
	const [showNodeDialog, setShowNodeDialog] = useState(false);
	const [nodeName, setNodeName] = useState("");
	const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

	// Add missing handler functions
	const handlePolygonCancel = () => {
		setShowPolygonDialog(false);
		setPolygonName("");
		setIsWallMode(false);
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
		id: string
	) => {
		setSelectedItem({ type, id });
		setActiveTool("select");
		logger.userAction("Layer item selected", { type, id });
	};

	const handleEditItem = (
		type: "polygon" | "beacon" | "node",
		id: string,
		e: React.MouseEvent<HTMLButtonElement>
	) => {
		e.stopPropagation();
		logger.userAction("Edit item clicked", { type, id });

		switch (type) {
			case "polygon":
				const polygon = polygons.find((p) => p.id === id);
				if (polygon) {
					setPolygonName(polygon.name);
					setIsWallMode(polygon.type === "wall");
					setEditingPolygonId(id);
					setShowPolygonDialog(true);
					setSelectedItem({ type, id });
				}
				break;
			case "beacon":
				const beacon = beacons.find((b) => b.id === id);
				if (beacon) {
					setBeaconName(beacon.name);
					setEditingBeaconId(id);
					setShowBeaconDialog(true);
					setSelectedItem({ type, id });
				}
				break;
			case "node":
				const node = nodes.find((n) => n.id === id);
				if (node) {
					setNodeName(`Node ${node.id}`);
					setEditingNodeId(id);
					setShowNodeDialog(true);
					setSelectedItem({ type, id });
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
						setPolygons([]);
						setBeacons([]);
						setNodes([]);
						setEdges([]);
						queueChange({
							type: CHANGE_TYPES.DELETE,
							objectType: OBJECT_TYPES.POLYGON,
							data: { id: "all" },
						});
						queueChange({
							type: CHANGE_TYPES.DELETE,
							objectType: OBJECT_TYPES.BEACON,
							data: { id: "all" },
						});
						queueChange({
							type: CHANGE_TYPES.DELETE,
							objectType: OBJECT_TYPES.NODE,
							data: { id: "all" },
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
				isWallMode={isWallMode}
				isEditing={!!editingPolygonId}
				onNameChange={setPolygonName}
				onWallModeChange={setIsWallMode}
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

export default FloorEditor;
