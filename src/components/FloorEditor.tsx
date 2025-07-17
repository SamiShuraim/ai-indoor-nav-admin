import { Map, Marker, Popup, config } from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MAPTILER_API_KEY, MAPTILER_STYLE_URL } from '../constants/api';
import { UI_MESSAGES } from '../constants/ui';
import { Floor, FloorLayoutData, floorLayoutApi, floorsApi } from '../utils/api';
import { createLogger } from '../utils/logger';
import { Alert, Button, Container, Header } from './common';
import './FloorEditor.css';
import BeaconDialog from './FloorEditor/BeaconDialog';
import DrawingToolbar, { DrawingTool } from './FloorEditor/DrawingToolbar';
import LayersPanel from './FloorEditor/LayersPanel';
import MapContainer from './FloorEditor/MapContainer';
import PolygonDialog from './FloorEditor/PolygonDialog';

const logger = createLogger('FloorEditor');

// Local storage keys
const STORAGE_KEYS = {
  POLYGONS: 'floorEditor_polygons',
  BEACONS: 'floorEditor_beacons', 
  NODES: 'floorEditor_nodes',
  EDGES: 'floorEditor_edges'
} as const;

// Helper function to clear all localStorage data for FloorEditor
const clearStorageData = () => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
    logger.info(`Cleared localStorage key: ${key}`);
  });
  logger.userAction('All FloorEditor localStorage data cleared');
};

// Local storage utilities
const loadFromStorage = (key: string, defaultValue: any): any => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    logger.warn(`Failed to load from localStorage key: ${key}`, error as Error);
    return defaultValue;
  }
};

const saveToStorage = (key: string, value: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    logger.info(`Saved to localStorage: ${key}`);
  } catch (error) {
    logger.error(`Failed to save to localStorage key: ${key}`, error as Error);
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
  type: 'poi' | 'wall';
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

// Sample data
const SAMPLE_POLYGONS: Polygon[] = [
  {
    id: '1',
    name: 'Classroom A',
    points: [
      { x: 50.142200, y: 26.313300 },
      { x: 50.142400, y: 26.313300 },
      { x: 50.142400, y: 26.313400 },
      { x: 50.142200, y: 26.313400 }
    ],
    type: 'poi',
    visible: true,
    color: '#3b82f6'
  },
  {
    id: '2',
    name: 'Classroom B',
    points: [
      { x: 50.142500, y: 26.313300 },
      { x: 50.142700, y: 26.313300 },
      { x: 50.142700, y: 26.313400 },
      { x: 50.142500, y: 26.313400 }
    ],
    type: 'poi',
    visible: true,
    color: '#10b981'
  },
  {
    id: '3',
    name: 'Hallway Wall',
    points: [
      { x: 50.142150, y: 26.313450 },
      { x: 50.142750, y: 26.313450 },
      { x: 50.142750, y: 26.313470 },
      { x: 50.142150, y: 26.313470 }
    ],
    type: 'wall',
    visible: true,
    color: '#6b7280'
  }
];

const SAMPLE_BEACONS: Beacon[] = [
  { id: '1', name: 'Beacon 1', x: 50.142300, y: 26.313350, visible: true },
  { id: '2', name: 'Beacon 2', x: 50.142600, y: 26.313350, visible: true },
  { id: '3', name: 'Beacon 3', x: 50.142450, y: 26.313500, visible: true }
];

const SAMPLE_NODES: RouteNode[] = [
  { id: '1', x: 50.142300, y: 26.313480, connections: ['2'], visible: true },
  { id: '2', x: 50.142600, y: 26.313480, connections: ['1', '3'], visible: true },
  { id: '3', x: 50.142450, y: 26.313550, connections: ['2'], visible: true }
];

const SAMPLE_EDGES: Edge[] = [
  { id: '1', fromNodeId: '1', toNodeId: '2', visible: true },
  { id: '2', fromNodeId: '2', toNodeId: '3', visible: true }
];

const FloorEditor: React.FC<FloorEditorProps> = ({ floorId, onBack }) => {
  // Remove the immediate console.log and replace with logger
  logger.info('FloorEditor component starting', { floorId });
  
  const [floor, setFloor] = useState<Floor | null>(null);
  const [floorData, setFloorData] = useState<FloorLayoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Map state
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [currentCoordinates, setCurrentCoordinates] = useState<{ lng: number; lat: number } | null>(null);
  const [mapLoadedSuccessfully, setMapLoadedSuccessfully] = useState(false);
  const [showMapLoadedAlert, setShowMapLoadedAlert] = useState(false);
  
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
      lat: Number(lat.toFixed(6))
    });
  }, []);
  
  // Drawing state
  const [activeTool, setActiveTool] = useState<DrawingTool>('select');
  const activeToolRef = useRef<DrawingTool>('select');
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
  const [selectedNodeForConnection, setSelectedNodeForConnection] = useState<string | null>(null);
  const selectedNodeForConnectionRef = useRef<string | null>(null);
  const [lastPlacedNodeId, setLastPlacedNodeId] = useState<string | null>(null);
  const lastPlacedNodeIdRef = useRef<string | null>(null);
  
  // Selection state
  const [selectedItem, setSelectedItem] = useState<{type: 'polygon' | 'beacon' | 'node', id: string} | null>(null);
  
  // Layer filter state
  const [layerFilter, setLayerFilter] = useState<'polygons' | 'beacons' | 'nodes'>('polygons');
  
  // Polygon dialog state
  const [showPolygonDialog, setShowPolygonDialog] = useState(false);
  const [polygonName, setPolygonName] = useState('');
  const [isWallMode, setIsWallMode] = useState(false);

  // Beacon dialog state
  const [showBeaconDialog, setShowBeaconDialog] = useState(false);
  const [beaconName, setBeaconName] = useState('');
  const [pendingBeaconLocation, setPendingBeaconLocation] = useState<{ lng: number; lat: number } | null>(null);

  // Polygon drawing state
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
  const [currentPolygonPoints, setCurrentPolygonPoints] = useState<Point[]>([]);
  const [pendingPolygonPoints, setPendingPolygonPoints] = useState<Point[]>([]);
  const [pendingPolygonCenter, setPendingPolygonCenter] = useState<{ lng: number; lat: number } | null>(null);
  
  // Use refs to prevent state loss during re-renders
  const pendingPolygonPointsRef = useRef<Point[]>([]);
  const isDrawingPolygonRef = useRef<boolean>(false);

  useEffect(() => {
    logger.info('FloorEditor component mounted', { floorId });
    loadFloorData();
    
    return () => {
      logger.info('FloorEditor component unmounted');
      
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
  const updateMapData = useCallback((currentPolygons: Polygon[], currentBeacons: Beacon[], currentNodes: RouteNode[], originalEdges: Edge[], selectedNodeId?: string | null) => {
    if (!map.current) return;
    
    // Clean up orphaned edges before rendering
    const nodeIds = new Set(currentNodes.map(n => n.id));
    const validEdges = originalEdges.filter((edge: Edge) => {
      const isValid = nodeIds.has(edge.fromNodeId) && nodeIds.has(edge.toNodeId);
      if (!isValid) {
        logger.warn('Skipping orphaned edge during render', { 
          edgeId: edge.id, 
          fromNodeId: edge.fromNodeId, 
          toNodeId: edge.toNodeId 
        });
      }
      return isValid;
    });
    
    // Use validated edges for rendering
    const renderEdges = validEdges;
    
    logger.info('Updating map with current data', {
      polygonsCount: currentPolygons.length,
      beaconsCount: currentBeacons.length,
      nodesCount: currentNodes.length,
      edgesCount: validEdges.length,
      originalEdgesCount: originalEdges.length,
      selectedNodeId,
      nodeIds: currentNodes.map(n => n.id),
      edgeIds: renderEdges.map((e: Edge) => e.id),
      nodeDetails: currentNodes.map(n => ({ id: n.id, x: n.x, y: n.y, visible: n.visible })),
      edgeDetails: renderEdges.map((e: Edge) => ({ id: e.id, from: e.fromNodeId, to: e.toNodeId, visible: e.visible }))
    });
    const mapInstance = map.current;
    
    // Clear existing markers and layers
    Object.values(mapMarkers.current).forEach(marker => marker.remove());
    mapMarkers.current = {};
    
    // Remove layers
    Object.values(mapLayers.current).forEach(layerId => {
      if (mapInstance.getLayer(layerId)) {
        mapInstance.removeLayer(layerId);
      }
    });
    mapLayers.current = {};
    
    // Remove sources  
    Object.values(mapSources.current).forEach(sourceId => {
      if (mapInstance.getSource(sourceId)) {
        mapInstance.removeSource(sourceId);
      }
    });
    mapSources.current = {};
    
    // Add polygons as filled areas
    currentPolygons.forEach(polygon => {
      if (polygon.visible && polygon.points.length >= 3) {
        const coordinates = polygon.points.map(p => [p.x, p.y]);
        coordinates.push(coordinates[0]); // Close the polygon
        
        const sourceId = `polygon-source-${polygon.id}`;
        const layerId = `polygon-layer-${polygon.id}`;
        
        mapInstance.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [coordinates]
            },
            properties: {}
          }
        });
        
        mapInstance.addLayer({
          id: layerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': polygon.color,
            'fill-opacity': 0.6
          }
        });
        
        // Add border
        const borderLayerId = `polygon-border-${polygon.id}`;
        mapInstance.addLayer({
          id: borderLayerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': polygon.color,
            'line-width': 2
          }
        });
        
        // Track sources and layers
        mapSources.current[`polygon-${polygon.id}`] = sourceId;
        mapLayers.current[`polygon-${polygon.id}`] = layerId;
        mapLayers.current[`polygon-border-${polygon.id}`] = borderLayerId;
        
        // Add center marker for interaction
        const centerX = polygon.points.reduce((sum, p) => sum + p.x, 0) / polygon.points.length;
        const centerY = polygon.points.reduce((sum, p) => sum + p.y, 0) / polygon.points.length;
        
        const marker = new Marker({ color: polygon.color, scale: 0.8 })
          .setLngLat([centerX, centerY])
          .setPopup(new Popup().setHTML(`<strong>${polygon.name}</strong><br>Type: ${polygon.type}`))
          .addTo(mapInstance);
          
        mapMarkers.current[`polygon-${polygon.id}`] = marker;
      }
    });
    
    // Add beacons
    currentBeacons.forEach(beacon => {
      if (beacon.visible) {
        const marker = new Marker({ color: '#fbbf24' })
          .setLngLat([beacon.x, beacon.y])
          .setPopup(new Popup().setHTML(`<strong>${beacon.name}</strong><br>Type: Beacon`))
          .addTo(mapInstance);
          
        mapMarkers.current[`beacon-${beacon.id}`] = marker;
      }
    });
    
    // Add nodes
    logger.info('Processing nodes for rendering', { 
      totalNodes: currentNodes.length,
      visibleNodes: currentNodes.filter(n => n.visible).length 
    });
    
    currentNodes.forEach(node => {
      logger.info('Processing node', { 
        nodeId: node.id, 
        visible: node.visible, 
        x: node.x, 
        y: node.y, 
        connections: node.connections,
        isSelected: selectedNodeId === node.id 
      });
      
      if (node.visible) {
        const isSelected = selectedNodeId === node.id;
        const marker = new Marker({ color: isSelected ? '#ef4444' : '#3b82f6' })
          .setLngLat([node.x, node.y])
          .addTo(mapInstance);
          
        mapMarkers.current[`node-${node.id}`] = marker;
        logger.info('Node marker added to map', { nodeId: node.id, markerKey: `node-${node.id}` });
      } else {
        logger.warn('Node not visible, skipping', { nodeId: node.id });
      }
    });
    
    // Add route lines between connected nodes
    logger.info('Processing edges for rendering', { 
      totalEdges: renderEdges.length,
      visibleEdges: renderEdges.filter(e => e.visible).length 
    });
    
    renderEdges.forEach(edge => {
      logger.info('Processing edge', { 
        edgeId: edge.id, 
        visible: edge.visible, 
        fromNodeId: edge.fromNodeId, 
        toNodeId: edge.toNodeId 
      });
      
      if (edge.visible) {
        const fromNode = currentNodes.find(n => n.id === edge.fromNodeId);
        const toNode = currentNodes.find(n => n.id === edge.toNodeId);
        
        logger.info('Edge node lookup', { 
          edgeId: edge.id, 
          lookingForFromNodeId: edge.fromNodeId,
          lookingForToNodeId: edge.toNodeId,
          availableNodeIds: currentNodes.map(n => n.id),
          fromNode: fromNode ? { id: fromNode.id, visible: fromNode.visible } : null,
          toNode: toNode ? { id: toNode.id, visible: toNode.visible } : null
        });
        
        if (fromNode && toNode && fromNode.visible && toNode.visible) {
          const sourceId = `edge-source-${edge.id}`;
          const layerId = `edge-layer-${edge.id}`;
          
          logger.info('Adding edge to map', { 
            edgeId: edge.id, 
            sourceId, 
            layerId,
            fromCoords: [fromNode.x, fromNode.y],
            toCoords: [toNode.x, toNode.y]
          });
          
          mapInstance.addSource(sourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: [[fromNode.x, fromNode.y], [toNode.x, toNode.y]]
              },
              properties: {}
            }
          });
          
          mapInstance.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': '#3b82f6', // Blue color as requested
              'line-width': 3,
              'line-opacity': 0.8
            }
          });
          
          // Track sources and layers
          mapSources.current[`edge-${edge.id}`] = sourceId;
          mapLayers.current[`edge-${edge.id}`] = layerId;
          
          logger.info('Edge layer added successfully', { 
            edgeId: edge.id, 
            sourceId, 
            layerId 
          });
        } else {
          logger.warn('Edge nodes not found or not visible', { 
            edgeId: edge.id,
            fromNodeId: edge.fromNodeId,
            toNodeId: edge.toNodeId,
            fromNodeFound: !!fromNode,
            toNodeFound: !!toNode,
            fromNodeVisible: fromNode?.visible,
            toNodeVisible: toNode?.visible,
            availableNodeIds: currentNodes.map(n => n.id),
            'fromNodeId in available': currentNodes.some(n => n.id === edge.fromNodeId),
            'toNodeId in available': currentNodes.some(n => n.id === edge.toNodeId)
          });
        }
      } else {
        logger.warn('Edge not visible, skipping', { edgeId: edge.id });
      }
    });
    
    logger.info('Map data updated successfully');
  }, []); // Remove selectedNodeForConnection dependency - it's passed as parameter

  // Clean up orphaned edges that reference non-existent nodes
  const cleanupOrphanedEdges = useCallback(() => {
    const currentNodes = JSON.parse(localStorage.getItem('floorEditor_nodes') || '[]');
    const currentEdges = JSON.parse(localStorage.getItem('floorEditor_edges') || '[]');
    const nodeIds = new Set(currentNodes.map((n: any) => n.id));
    
    const validEdges = currentEdges.filter((edge: any) => {
      const isValid = nodeIds.has(edge.fromNodeId) && nodeIds.has(edge.toNodeId);
      if (!isValid) {
        logger.warn('Removing orphaned edge', { 
          edgeId: edge.id, 
          fromNodeId: edge.fromNodeId, 
          toNodeId: edge.toNodeId,
          availableNodeIds: Array.from(nodeIds)
        });
      }
      return isValid;
    });
    
    if (validEdges.length !== currentEdges.length) {
      localStorage.setItem('floorEditor_edges', JSON.stringify(validEdges));
      setEdges(validEdges);
      logger.info('Cleaned up orphaned edges', { 
        originalCount: currentEdges.length,
        cleanedCount: validEdges.length,
        removedCount: currentEdges.length - validEdges.length
      });
    }
  }, []);

  // Load initial sample data and update map when data changes
  useEffect(() => {
    if (!mapLoading && map.current) {
      if (!initialDataLoaded.current) {
        logger.info('Adding initial sample data to map');
        // Clean up any orphaned edges first
        cleanupOrphanedEdges();
        initialDataLoaded.current = true;
      }
      updateMapData(polygons, beacons, nodes, edges, selectedNodeForConnection);
    }
  }, [mapLoading, polygons, beacons, nodes, edges, selectedNodeForConnection]);







  const getUserLocationAndCenter = (mapInstance: Map) => {
    if ('geolocation' in navigator) {
      logger.info('🌍 Requesting user location permission - this should show a browser popup');
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          logger.info('🎯 User location obtained, centering map NOW!', { latitude, longitude });
          
          // Force center the map
          mapInstance.flyTo({
            center: [longitude, latitude],
            zoom: 18,
            duration: 2000
          });
          
          // Add a marker at user's location
          new Marker({ color: '#ef4444' })
            .setLngLat([longitude, latitude])
            .setPopup(new Popup().setHTML('<strong>🎯 Your Location</strong>'))
            .addTo(mapInstance);
            
        },
        (error) => {
          logger.warn('Geolocation error - using default location', error);
          logger.info('Geolocation error details', { 
            code: error.code, 
            message: error.message 
          });
          // Keep default location (Honolulu)
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,  // Increased timeout
          maximumAge: 0    // Don't use cached location
        }
      );
    } else {
      logger.warn('Geolocation not supported by this browser');
    }
  };

  const initializeMap = useCallback(() => {
    if (!mapContainer.current) {
      logger.warn('Map container not available');
      return;
    }

    try {
      logger.info('Initializing map', { 
        apiKey: MAPTILER_API_KEY ? 'SET' : 'NOT_SET',
        apiKeyLength: MAPTILER_API_KEY?.length || 0,
        envApiKey: process.env.REACT_APP_MAPTILER_API_KEY ? 'ENV_SET' : 'ENV_NOT_SET'
      });

      // Configure MapTiler SDK
      config.apiKey = MAPTILER_API_KEY;
      
      if (!MAPTILER_API_KEY) {
        throw new Error('MapTiler API key is not set. Please check your .env file and restart the development server.');
      }

      // Initialize map with your custom style (same as Android app)
      const mapInstance = new Map({
        container: mapContainer.current,
        style: MAPTILER_STYLE_URL, // Using your custom style URL
        center: [50.142335, 26.313387], // User's actual coordinates in Bahrain
        zoom: 18
      });

      map.current = mapInstance;

      mapInstance.on('load', () => {
        // Clear the timeout since map loaded successfully
        if (mapLoadTimeout.current) {
          clearTimeout(mapLoadTimeout.current);
          mapLoadTimeout.current = null;
        }
        
        setMapLoading(false);
        setMapLoadedSuccessfully(true);
        setError(null); // Clear any previous errors since map loaded successfully
        logger.info('Map loaded successfully');
        
        // SHOW HUGE ALERT AS REQUESTED
        setShowMapLoadedAlert(true);
        setTimeout(() => setShowMapLoadedAlert(false), 5000); // Hide after 5 seconds
      });

      mapInstance.on('error', (e) => {
        // Only show error if map hasn't loaded successfully yet
        if (!mapLoadedSuccessfully) {
          // Clear the timeout since we got an error (not a timeout)
          if (mapLoadTimeout.current) {
            clearTimeout(mapLoadTimeout.current);
            mapLoadTimeout.current = null;
          }
          
          logger.error('Map error event during initial load', new Error(e.error?.message || 'Map error occurred'));
          setError('Map failed to load. Please check your API key.');
          setMapLoading(false);
        } else {
          // Map already loaded successfully, just log the error but don't show to user
          logger.warn('Map error after successful load (ignoring)', new Error(e.error?.message || 'Map error occurred'));
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
      mapInstance.on('click', (e) => {
        handleMapClick(e);
      });

      // Set a timeout to catch cases where the map never loads
      mapLoadTimeout.current = setTimeout(() => {
        // Only show timeout error if map is still loading (not if it already loaded)
        if (mapLoading) {
          logger.error('Map loading timeout - map failed to load within 30 seconds');
          setError('Map loading timeout. Please check your internet connection and API key.');
          setMapLoading(false);
        }
        mapLoadTimeout.current = null;
      }, 30000);

    } catch (error) {
      logger.error('Failed to initialize map', error as Error);
      setError('Failed to initialize map. Please check the MapTiler configuration.');
      setMapLoading(false);
    }
  }, [updateCoordinates]);

  // Separate effect for map initialization - only after loading is complete and container is ready
  useEffect(() => {
    if (!loading && mapContainer.current && !map.current) {
      logger.info('Initializing map after loading complete');
      initializeMap();
    }
  }, [loading, initializeMap]); // Depend on loading and initializeMap

  const handleMapClick = (e: any) => {
    logger.userAction('Map clicked - DETAILED', { 
      hasMap: !!map.current, 
      activeTool, 
      lng: e.lngLat.lng, 
      lat: e.lngLat.lat,
      eventType: e.type,
      currentBeacons: beacons.length,
      currentNodes: nodes.length,
      currentPolygons: polygons.length
    });

    if (!map.current) {
      logger.error('Map click failed - no map instance');
      return;
    }

    const { lng, lat } = e.lngLat;
    const currentTool = activeToolRef.current; // Use ref to get current tool

    switch (currentTool) {
      case 'beacons':
        addBeacon(lng, lat);
        // Keep the tool active for adding multiple beacons
        break;
      case 'nodes':
        handleNodeClick(lng, lat);
        // Keep the tool active for adding multiple nodes
        break;
      case 'poi':
        addPolygonPoint(lng, lat);
        break;
      case 'select':
        break;
      case 'pan':
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
    
    logger.userAction('Beacon dialog opened', { location: { lng, lat } });
  };

  const handleBeaconSave = () => {
    if (pendingBeaconLocation && beaconName.trim() && map.current) {
      const newBeacon: Beacon = {
        id: Date.now().toString(),
        name: beaconName.trim(),
        x: pendingBeaconLocation.lng,
        y: pendingBeaconLocation.lat,
        visible: true
      };
      
      const updatedBeacons = [...beacons, newBeacon];
      setBeacons(updatedBeacons);
      
      // Save to localStorage
      saveToStorage(STORAGE_KEYS.BEACONS, updatedBeacons);
      
      // Update the map with the new beacon data
      updateMapData(polygons, updatedBeacons, nodes, edges, selectedNodeForConnection);
      
      logger.userAction('Beacon added', { beacon: newBeacon });
    }
    handleBeaconCancel();
  };

  const handleBeaconCancel = () => {
    setShowBeaconDialog(false);
    setPendingBeaconLocation(null);
    setBeaconName('');
    logger.userAction('Beacon dialog cancelled');
  };

  const handleNodeClick = (lng: number, lat: number) => {
    // Check if this click is near an existing node (using Canvas-style distance calculation)
    const clickedNode = nodes.find(node => {
      if (!node.visible) return false;
      // Use proper Euclidean distance like the working Canvas version
      const distance = Math.sqrt((node.x - lng) ** 2 + (node.y - lat) ** 2);
      return distance < 0.0001; // Adjust threshold for coordinate space instead of pixel space
    });
    
    // Use ref values for current state to avoid stale closures
    const currentSelectedNode = selectedNodeForConnectionRef.current;
    const currentLastPlacedNode = lastPlacedNodeIdRef.current;
    
    // Debug logging to understand what's happening
    logger.info('Node click detected', { 
      lng, 
      lat, 
      nodesCount: nodes.length,
      selectedNodeForConnection: currentSelectedNode,
      lastPlacedNodeId: currentLastPlacedNode,
      clickedNodeId: clickedNode?.id || 'none'
    });
    
    if (clickedNode) {
      // Clicked on an existing node
      if (currentSelectedNode) {
        if (currentSelectedNode === clickedNode.id) {
          // Clicking on the same node - deselect it
          setSelectedNodeForConnection(null);
          selectedNodeForConnectionRef.current = null;
          logger.userAction('Node deselected', { nodeId: clickedNode.id });
        } else {
          // Can't connect a node to itself or create duplicate connections
          logger.warn('Cannot connect node to itself or create duplicate connection');
        }
      } else {
        // Select this node for connection
        setSelectedNodeForConnection(clickedNode.id);
        selectedNodeForConnectionRef.current = clickedNode.id;
        logger.userAction('Node selected for connection', { nodeId: clickedNode.id });
      }
    } else {
      // Clicked on empty space
      logger.info('Clicked on empty space - DETAILED STATE', { 
        lng, 
        lat, 
        nodesLength: nodes.length, 
        selectedNodeForConnection: currentSelectedNode,
        lastPlacedNodeId: currentLastPlacedNode,
        hasSelectedNode: !!currentSelectedNode,
        hasLastPlaced: !!currentLastPlacedNode,
        'nodes.length === 0': nodes.length === 0
      });
      
      if (currentSelectedNode) {
        // Have a selected node - create new node and connect it (first connection after selecting)
        logger.info('Creating first connected node', { selectedNodeForConnection: currentSelectedNode });
        const newNodeId = addNewNode(lng, lat, currentSelectedNode);
        setSelectedNodeForConnection(null);
        selectedNodeForConnectionRef.current = null;
        setLastPlacedNodeId(newNodeId);
        lastPlacedNodeIdRef.current = newNodeId;
      } else if (currentLastPlacedNode) {
        // Chain mode - connect to the last placed node
        logger.info('Creating chained node', { lastPlacedNodeId: currentLastPlacedNode });
        const newNodeId = addNewNode(lng, lat, currentLastPlacedNode);
        setLastPlacedNodeId(newNodeId);
        lastPlacedNodeIdRef.current = newNodeId;
      } else if (nodes.length === 0) {
        // No nodes exist - create first isolated node (Canvas logic)
        logger.info('Creating first isolated node');
        const newNodeId = addNewNode(lng, lat, null);
        setLastPlacedNodeId(newNodeId);
        lastPlacedNodeIdRef.current = newNodeId;
      } else {
        // Canvas logic: Can't create node if nodes exist but none selected
        logger.info('Cannot create node - select existing node first or clear all nodes');
      }
    }
  };

  const addNewNode = (lng: number, lat: number, connectToNodeId: string | null): string => {
    const newNode: RouteNode = {
      id: Date.now().toString(),
      x: lng,
      y: lat,
      connections: connectToNodeId ? [connectToNodeId] : [],
      visible: true
    };
    
    logger.info('Adding new node - DETAILED', { 
      newNodeId: newNode.id,
      newNodeCoords: [lng, lat],
      connectToNodeId, 
      currentNodesCount: nodes.length,
      currentEdgesCount: edges.length,
      currentNodeIds: nodes.map(n => n.id),
      currentEdgeIds: edges.map(e => e.id),
      lastPlacedNodeIdRef: lastPlacedNodeIdRef.current,
      willCreateEdge: !!connectToNodeId
    });
    
    // CRITICAL FIX: Update state atomically to prevent race conditions
    // Use functional updates to ensure we're working with the latest state
    setNodes(prevNodes => {
      const finalNodes = [...prevNodes, newNode];
      if (connectToNodeId) {
        const updatedNodes = finalNodes.map(node => 
          node.id === connectToNodeId 
            ? { ...node, connections: [...node.connections, newNode.id] }
            : node
        );
        
        // Save to localStorage with the updated nodes
        saveToStorage(STORAGE_KEYS.NODES, updatedNodes);
        
        logger.info('Updated node connections', {
          connectToNodeId,
          newNodeId: newNode.id,
          totalNodes: updatedNodes.length
        });
        
        return updatedNodes;
      } else {
        // Save isolated node to localStorage
        saveToStorage(STORAGE_KEYS.NODES, finalNodes);
        logger.userAction('Isolated node added', { newNode });
        return finalNodes;
      }
    });
    
    if (connectToNodeId) {
      setEdges(prevEdges => {
        const newEdge: Edge = {
          id: `edge_${connectToNodeId}_to_${newNode.id}_${Date.now()}`,
          fromNodeId: connectToNodeId,
          toNodeId: newNode.id,
          visible: true
        };
        const finalEdges = [...prevEdges, newEdge];
        
        // Save to localStorage with the final state
        saveToStorage(STORAGE_KEYS.EDGES, finalEdges);
        
        logger.info('Edge created and saved', { 
          newEdge, 
          totalEdges: finalEdges.length,
          edgeDetails: {
            from: connectToNodeId,
            to: newNode.id,
            id: newEdge.id
          }
        });
        
        logger.userAction('Connected node added', { 
          newNode, 
          connectedToNodeId: connectToNodeId,
          newEdge 
        });
        
        return finalEdges;
      });
    }
    
    logger.info('Node creation completed', { 
      newNodeId: newNode.id,
      wasConnected: !!connectToNodeId,
      connectToNodeId
    });
    
    // DON'T call updateMapData here - let the useEffect handle it when state updates
    
    return newNode.id;
  };

  // Clear all temporary drawing elements from the map
  const clearTempDrawing = () => {
    if (!map.current) return;
    
    logger.info('Clearing temporary drawing elements');
    
    // Remove temporary markers
    tempDrawingMarkers.current.forEach(marker => marker.remove());
    tempDrawingMarkers.current = [];
    
    // Remove temporary lines
    Object.entries(tempDrawingLines.current).forEach(([layerId, sourceId]) => {
      if (map.current!.getLayer(layerId)) {
        map.current!.removeLayer(layerId);
      }
      if (map.current!.getSource(sourceId)) {
        map.current!.removeSource(sourceId);
      }
    });
    tempDrawingLines.current = {};
  };

  // Add a small circle marker at the clicked location
  const addPolygonPointMarker = (lng: number, lat: number, pointIndex: number) => {
    if (!map.current) return;
    
    const isFirst = pointIndex === 0;
    const color = isFirst ? '#ff0000' : '#00aa00'; // Red for first point, green for others
    
    // Create a simple HTML element for the marker
    const markerElement = document.createElement('div');
    markerElement.style.width = '10px';
    markerElement.style.height = '10px';
    markerElement.style.borderRadius = '50%';
    markerElement.style.backgroundColor = color;
    markerElement.style.border = '2px solid white';
    markerElement.style.boxShadow = '0 0 4px rgba(0,0,0,0.3)';
    
    const marker = new Marker({ element: markerElement })
      .setLngLat([lng, lat])
      .addTo(map.current);
      
    tempDrawingMarkers.current.push(marker);
    
    logger.info('Added polygon point marker', { 
      point: { lng, lat }, 
      pointIndex, 
      isFirst,
      color
    });
  };

  // Add a line between two points
  const addPolygonLine = (fromPoint: Point, toPoint: Point, lineId: number) => {
    if (!map.current) {
      logger.error('Cannot add polygon line - no map instance');
      return;
    }
    
    const sourceId = `temp-polygon-line-source-${Math.floor(lineId)}`;
    const layerId = `temp-polygon-line-layer-${Math.floor(lineId)}`;
    
    logger.info('ATTEMPTING to add polygon line', { 
      from: fromPoint, 
      to: toPoint, 
      lineId,
      sourceId,
      layerId,
      mapExists: !!map.current
    });
    
    try {
      // Check if source already exists and remove it
      if (map.current.getSource(sourceId)) {
        logger.warn('Source already exists, removing it first', { sourceId });
        if (map.current.getLayer(layerId)) {
          map.current.removeLayer(layerId);
        }
        map.current.removeSource(sourceId);
      }
      
      map.current.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [[fromPoint.x, fromPoint.y], [toPoint.x, toPoint.y]]
          },
          properties: {}
        }
      });
      
      map.current.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#0066ff',  // Blue lines
          'line-width': 3
        }
      });
      
      tempDrawingLines.current[layerId] = sourceId;
      
      logger.info('✅ SUCCESS - Added polygon line', { 
        from: fromPoint, 
        to: toPoint, 
        lineId,
        sourceId,
        layerId
      });
    } catch (error) {
      logger.error('❌ FAILED to add polygon line', error as Error, {
        fromPoint,
        toPoint,
        lineId,
        sourceId,
        layerId,
        errorMessage: (error as Error).message,
        mapLoaded: !!map.current
      });
    }
  };

  // Check if the clicked point is close to the first point (to close the polygon)
  const isCloseToFirstPoint = (lng: number, lat: number, firstPoint: Point): boolean => {
    const deltaLng = Math.abs(lng - firstPoint.x);
    const deltaLat = Math.abs(lat - firstPoint.y);
    const maxDelta = 0.0005; // About 50 meters - much easier to click accurately
    
    logger.info('Checking if close to first point', {
      clickedPoint: { lng, lat },
      firstPoint,
      deltaLng,
      deltaLat,
      maxDelta,
      isClose: deltaLng < maxDelta && deltaLat < maxDelta
    });
    
    return deltaLng < maxDelta && deltaLat < maxDelta;
  };

  // Handle polygon point addition with the new flow
  const addPolygonPoint = (lng: number, lat: number) => {
    const newPoint: Point = { x: lng, y: lat };
    
    logger.userAction('🎯 Polygon point clicked', { 
      point: newPoint, 
      currentPoints: pendingPolygonPointsRef.current.length,
      pendingPoints: pendingPolygonPointsRef.current,
      isDrawingPolygon: isDrawingPolygonRef.current,
      activeTool: activeTool
    });
    
    // If this is not the first point, check if it's close to the first point to close
    if (pendingPolygonPointsRef.current.length >= 3 && isCloseToFirstPoint(lng, lat, pendingPolygonPointsRef.current[0])) {
      // Close the polygon and show dialog
      logger.info('🎉 POLYGON CLOSED by clicking near first point!');
      
      // Add closing line back to first point
      const closingLineId = Math.random() * 1000000;
      addPolygonLine(pendingPolygonPointsRef.current[pendingPolygonPointsRef.current.length - 1], pendingPolygonPointsRef.current[0], closingLineId);
      
      // Store the completed polygon points and show dialog
      setCurrentPolygonPoints([...pendingPolygonPointsRef.current]); // Don't include the closing point
      
      // Calculate center for the dialog
      const centerX = pendingPolygonPointsRef.current.reduce((sum, p) => sum + p.x, 0) / pendingPolygonPointsRef.current.length;
      const centerY = pendingPolygonPointsRef.current.reduce((sum, p) => sum + p.y, 0) / pendingPolygonPointsRef.current.length;
      
      setPendingPolygonCenter({ lng: centerX, lat: centerY });
      setPolygonName('');
      setIsWallMode(false);
      setShowPolygonDialog(true);
      
      logger.info('🎉 Showing polygon dialog', { 
        center: { lng: centerX, lat: centerY },
        points: pendingPolygonPointsRef.current.length 
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
      logger.info('Started drawing polygon');
    }
    
    // Add line from previous point to this point (if not the first point)
    if (updatedPoints.length > 1) {
      const previousPoint = updatedPoints[updatedPoints.length - 2];
      const lineId = Math.random() * 1000000; // Use random number for unique ID
      logger.info('🔵 ADDING LINE between points', { 
        from: previousPoint, 
        to: newPoint, 
        lineId,
        totalPoints: updatedPoints.length 
      });
      addPolygonLine(previousPoint, newPoint, lineId);
    }
    
    logger.userAction('Polygon point added', { 
      point: newPoint, 
      totalPoints: updatedPoints.length 
    });
  };



  const loadFloorData = async () => {
    const numericFloorId = parseInt(floorId, 10);
    logger.userAction('Loading floor data', { 
      originalFloorId: floorId, 
      originalType: typeof floorId,
      numericFloorId,
      isValidNumber: !isNaN(numericFloorId)
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
      const [floorInfo, layoutData] = await Promise.all([
        floorsApi.getById(numericFloorId),
        floorLayoutApi.getFloorData(numericFloorId.toString())
      ]);
      
      setFloor(floorInfo);
      setFloorData(layoutData);
      logger.info('Floor data loaded successfully', { 
        floorId: numericFloorId, 
        floorName: floorInfo.name,
        poisCount: layoutData.pois.length,
        nodesCount: layoutData.nodes.length,
        edgesCount: layoutData.edges.length
      });
    } catch (error) {
      logger.error('Failed to load floor data', error as Error, {
        floorId: numericFloorId,
        originalFloorId: floorId,
        errorType: (error as Error).constructor.name,
        errorMessage: (error as Error).message
      });
      setError(UI_MESSAGES.ERROR_GENERIC);
    } finally {
      setLoading(false);
    }
  };

  const handleToolChange = (tool: DrawingTool) => {
    logger.info('Tool change requested', { 
      from: activeTool, 
      to: tool, 
      isDrawingPolygon,
      pendingPoints: pendingPolygonPoints.length 
    });
    
    // If switching away from POI tool, clear any polygon drawing state
    if (activeTool === 'poi' && tool !== 'poi' && isDrawingPolygonRef.current) {
      isDrawingPolygonRef.current = false;
      pendingPolygonPointsRef.current = [];
      setIsDrawingPolygon(false);
      setCurrentPolygonPoints([]);
      setPendingPolygonPoints([]);
      clearTempDrawing();
    }
    
    // If switching away from nodes tool, clear node selection state
    if (activeTool === 'nodes' && tool !== 'nodes') {
      setSelectedNodeForConnection(null);
      setLastPlacedNodeId(null);
      lastPlacedNodeIdRef.current = null;
    }
    
    setActiveTool(tool);
    activeToolRef.current = tool; // Keep ref in sync
    setSelectedItem(null);
  };

  const handlePolygonSave = () => {
    if (pendingPolygonCenter && polygonName.trim() && map.current) {
      // Use drawn points if available, otherwise create a simple rectangle
      const polygonPoints = currentPolygonPoints.length >= 3 
        ? currentPolygonPoints 
        : [
            { x: pendingPolygonCenter.lng - 0.00005, y: pendingPolygonCenter.lat + 0.00005 },
            { x: pendingPolygonCenter.lng + 0.00005, y: pendingPolygonCenter.lat + 0.00005 },
            { x: pendingPolygonCenter.lng + 0.00005, y: pendingPolygonCenter.lat - 0.00005 },
            { x: pendingPolygonCenter.lng - 0.00005, y: pendingPolygonCenter.lat - 0.00005 }
          ];
      
      const newPolygon: Polygon = {
        id: Date.now().toString(),
        name: polygonName.trim(),
        points: polygonPoints,
        type: isWallMode ? 'wall' : 'poi',
        visible: true,
        color: isWallMode ? '#6b7280' : '#3b82f6'
      };
      
      const updatedPolygons = [...polygons, newPolygon];
      setPolygons(updatedPolygons);
      
      // Save to localStorage
      saveToStorage(STORAGE_KEYS.POLYGONS, updatedPolygons);
      
      // Update the map with the new polygon data
              updateMapData(updatedPolygons, beacons, nodes, edges, selectedNodeForConnection);
      
      logger.userAction('Polygon saved', { 
        name: polygonName.trim(), 
        isWall: isWallMode,
        coordinates: pendingPolygonCenter
      });
    }
    
    // Reset polygon drawing state
    setIsDrawingPolygon(false);
    setCurrentPolygonPoints([]);
    setPendingPolygonPoints([]);
    // Clear temporary drawing visuals
    clearTempDrawing();
    
    handlePolygonCancel();
  };

  const handlePolygonCancel = () => {
    setShowPolygonDialog(false);
    setPendingPolygonCenter(null);
    setPolygonName('');
    setIsWallMode(false);
    // Reset polygon drawing state
    isDrawingPolygonRef.current = false;
    pendingPolygonPointsRef.current = [];
    setIsDrawingPolygon(false);
    setCurrentPolygonPoints([]);
    setPendingPolygonPoints([]);
    // Clear temporary drawing visuals
    clearTempDrawing();
    logger.userAction('Polygon dialog cancelled');
  };

  const handleClearAll = () => {
    logger.userAction('Clear all clicked');
    setPolygons([]);
    setBeacons([]);
    setNodes([]);
    setEdges([]);
    setSelectedItem(null);
    setSelectedNodeForConnection(null);
    setLastPlacedNodeId(null);
    lastPlacedNodeIdRef.current = null;
    
    // Clear all markers from map (simplified - in a real implementation you'd track markers)
    if (map.current) {
      // This is a simplified clear - you'd want to track and remove specific markers
      map.current.remove();
      initializeMap();
    }
  };

  const handleLayerItemClick = (type: 'polygon' | 'beacon' | 'node', id: string) => {
    setSelectedItem({ type, id });
    setActiveTool('select');
    logger.userAction('Layer item selected', { type, id });
  };

  const handleFilterChange = (filter: 'polygons' | 'beacons' | 'nodes') => {
    setLayerFilter(filter);
    logger.userAction('Layer filter changed', { filter });
  };

  const getFilteredData = () => {
    switch (layerFilter) {
      case 'polygons':
        return { polygons, beacons: [], nodes: [] };
      case 'beacons':
        return { polygons: [], beacons, nodes: [] };
      case 'nodes':
        return { polygons: [], beacons: [], nodes };
    }
  };

  const toggleLayerVisibility = (type: 'polygon' | 'beacon' | 'node', id: string) => {
    logger.userAction('Layer visibility toggled', { type, id });
    
    if (!map.current) return;
    
    const mapInstance = map.current;
    
    switch (type) {
      case 'polygon':
        setPolygons(prev => prev.map(p => {
          if (p.id === id) {
            const newVisible = !p.visible;
            
            // Update map visibility
            const marker = mapMarkers.current[`polygon-${id}`];
            const layerId = mapLayers.current[`polygon-${id}`];
            const borderLayerId = mapLayers.current[`polygon-border-${id}`];
            
            if (marker) {
              if (newVisible) {
                marker.addTo(mapInstance);
              } else {
                marker.remove();
              }
            }
            
            if (layerId && mapInstance.getLayer(layerId)) {
              mapInstance.setLayoutProperty(layerId, 'visibility', newVisible ? 'visible' : 'none');
            }
            
            if (borderLayerId && mapInstance.getLayer(borderLayerId)) {
              mapInstance.setLayoutProperty(borderLayerId, 'visibility', newVisible ? 'visible' : 'none');
            }
            
            return { ...p, visible: newVisible };
          }
          return p;
        }));
        break;
        
      case 'beacon':
        setBeacons(prev => prev.map(b => {
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
        }));
        break;
        
      case 'node':
        setNodes(prev => prev.map(n => {
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
            edges.forEach(edge => {
              if (edge.fromNodeId === id || edge.toNodeId === id) {
                const layerId = mapLayers.current[`edge-${edge.id}`];
                if (layerId && mapInstance.getLayer(layerId)) {
                  const fromNode = nodes.find(node => node.id === edge.fromNodeId);
                  const toNode = nodes.find(node => node.id === edge.toNodeId);
                  const shouldShowEdge = fromNode?.visible && toNode?.visible && edge.visible;
                  mapInstance.setLayoutProperty(layerId, 'visibility', shouldShowEdge ? 'visible' : 'none');
                }
              }
            });
            
            return { ...n, visible: newVisible };
          }
          return n;
        }));
        break;
    }
  };

  const handleSave = async () => {
    logger.userAction('Save button clicked');
    // TODO: Implement save functionality when backend is ready
    logger.info('Save functionality not yet implemented');
  };

  // Add more detailed debugging for re-render tracking
  logger.debug('FloorEditor component rendering', { 
    floorId, 
    activeTool, 
    loading,
    mapLoading,
    hasFloorData: !!floorData,
    coordinates: currentCoordinates
  });

  if (loading) {
    return (
      <Container variant="PAGE">
        <Header 
          title={UI_MESSAGES.FLOOR_EDITOR_TITLE}
          actions={
            <Button variant="SECONDARY" onClick={onBack}>
              {UI_MESSAGES.FLOOR_EDITOR_BACK_BUTTON}
            </Button>
          }
        />
        <div className="loading-message">{UI_MESSAGES.FLOOR_EDITOR_LOADING}</div>
      </Container>
    );
  }

  return (
    <Container variant="PAGE">
      {/* HUGE ALERT WHEN MAP LOADS */}
      {showMapLoadedAlert && (
        <Alert 
          type="SUCCESS" 
          message="HEEELLLLLLLLLOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO"
          className="map-loaded-alert"
        />
      )}

      <Header 
        title={`${UI_MESSAGES.FLOOR_EDITOR_TITLE} - ${floor?.name || 'Unknown Floor'}`}
        actions={
          <div className="header-actions">
            <Button variant="PRIMARY" onClick={handleSave}>
              {UI_MESSAGES.FLOOR_EDITOR_SAVE_BUTTON}
            </Button>
            <Button variant="SECONDARY" onClick={onBack}>
              {UI_MESSAGES.FLOOR_EDITOR_BACK_BUTTON}
            </Button>
          </div>
        }
      />

      {error && (
        <div className="floor-editor-error">
          {error}
        </div>
      )}

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
            logger.userAction('Polygon drawing cancelled');
          }}
          onClearAll={handleClearAll}
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
            onFilterChange={handleFilterChange}
            onLayerItemClick={handleLayerItemClick}
            onToggleVisibility={toggleLayerVisibility}
          />
        </div>
      </div>

      {/* TEMPORARY: Clear localStorage data button */}
      <div style={{ position: 'fixed', top: '10px', right: '10px', zIndex: 1000 }}>
        <button 
          onClick={() => {
            clearStorageData();
            // Reload page to reset state
            window.location.reload();
          }}
          style={{ 
            padding: '10px 15px', 
            backgroundColor: '#ef4444', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          🗑️ Clear Data
        </button>
      </div>

      {/* Polygon Dialog */}
      <PolygonDialog
        show={showPolygonDialog}
        polygonName={polygonName}
        isWallMode={isWallMode}
        onNameChange={setPolygonName}
        onWallModeChange={setIsWallMode}
        onSave={handlePolygonSave}
        onCancel={handlePolygonCancel}
      />

      {/* Beacon Dialog */}
      <BeaconDialog
        show={showBeaconDialog}
        beaconName={beaconName}
        onNameChange={setBeaconName}
        onSave={handleBeaconSave}
        onCancel={handleBeaconCancel}
      />
    </Container>
  );
};

export default FloorEditor; 