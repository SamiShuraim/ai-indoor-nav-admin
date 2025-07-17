import { Map, Marker, Popup, config } from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MAPTILER_API_KEY, MAPTILER_STYLE_URL } from '../constants/api';
import { UI_MESSAGES } from '../constants/ui';
import { Floor, FloorLayoutData, floorLayoutApi, floorsApi } from '../utils/api';
import { createLogger } from '../utils/logger';
import { Button, Container, Header, Input } from './common';
import './FloorEditor.css';

const logger = createLogger('FloorEditor');

// Local storage keys
const STORAGE_KEYS = {
  POLYGONS: 'floorEditor_polygons',
  BEACONS: 'floorEditor_beacons', 
  NODES: 'floorEditor_nodes',
  EDGES: 'floorEditor_edges'
} as const;

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

// Drawing tool types
type DrawingTool = 'select' | 'pan' | 'poi' | 'beacons' | 'nodes' | 'walls';

// Sample data interfaces (keeping your existing structure)
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

// Sample data (keeping your existing data)
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
  // Immediate log to see if component is being created
  console.log('FloorEditor component starting - immediate console log', { floorId });
  logger.info('FloorEditor component render start', { floorId });
  
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
  
  // Map markers and layers tracking
  const mapMarkers = useRef<{ [key: string]: any }>({});
  const mapLayers = useRef<{ [key: string]: string }>({});
  
  // Timeout reference for cleanup
  const mapLoadTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Throttle coordinate updates to prevent infinite re-renders
  const coordinateUpdateTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Memoized coordinate update function
  const updateCoordinates = useCallback((lng: number, lat: number) => {
    setCurrentCoordinates({
      lng: Number(lng.toFixed(6)),
      lat: Number(lat.toFixed(6))
    });
  }, []);
  
  // Drawing state (keeping your existing structure)
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

  // Load sample data to map once it's ready
  useEffect(() => {
    if (!mapLoading && map.current) {
      console.log('🗺️ Map is ready, loading sample data...');
      // Add sample data to the map with proper visualization
      logger.info('Adding all sample data to map with proper visualization');
      
      const mapInstance = map.current;
      
      // Clear existing markers and layers
      Object.values(mapMarkers.current).forEach(marker => marker.remove());
      mapMarkers.current = {};
      Object.values(mapLayers.current).forEach(layerId => {
        if (mapInstance.getLayer(layerId)) {
          mapInstance.removeLayer(layerId);
        }
        if (mapInstance.getSource(layerId)) {
          mapInstance.removeSource(layerId);
        }
      });
      mapLayers.current = {};
      
      // Add polygons as filled areas
      polygons.forEach(polygon => {
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
      beacons.forEach(beacon => {
        if (beacon.visible) {
          const marker = new Marker({ color: '#fbbf24' })
            .setLngLat([beacon.x, beacon.y])
            .setPopup(new Popup().setHTML(`<strong>${beacon.name}</strong><br>Type: Beacon`))
            .addTo(mapInstance);
            
          mapMarkers.current[`beacon-${beacon.id}`] = marker;
        }
      });
      
      // Add nodes
      nodes.forEach(node => {
        if (node.visible) {
          const marker = new Marker({ color: '#3b82f6' })
            .setLngLat([node.x, node.y])
            .setPopup(new Popup().setHTML(`<strong>Node ${node.id}</strong><br>Connections: ${node.connections.length}`))
            .addTo(mapInstance);
            
          mapMarkers.current[`node-${node.id}`] = marker;
        }
      });
      
      // Add route lines between connected nodes
      edges.forEach(edge => {
        if (edge.visible) {
          const fromNode = nodes.find(n => n.id === edge.fromNodeId);
          const toNode = nodes.find(n => n.id === edge.toNodeId);
          
          if (fromNode && toNode && fromNode.visible && toNode.visible) {
            const sourceId = `edge-source-${edge.id}`;
            const layerId = `edge-layer-${edge.id}`;
            
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
                'line-color': '#8b5cf6',
                'line-width': 3,
                'line-opacity': 0.8
              }
            });
            
            mapLayers.current[`edge-${edge.id}`] = layerId;
          }
        }
      });
      
      console.log('✅ Sample data loaded to map successfully');
      logger.info('All sample data added successfully with proper visualization');
    }
  }, [mapLoading, polygons, beacons, nodes, edges]); // Re-run when data changes







  const getUserLocationAndCenter = (mapInstance: Map) => {
    if ('geolocation' in navigator) {
      logger.info('🌍 Requesting user location permission - this should show a browser popup');
      console.log('🌍 GEOLOCATION: Starting location request...');
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('🎯 GEOLOCATION SUCCESS:', { latitude, longitude });
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
            
          console.log('✅ GEOLOCATION: Map centered and marker added');
        },
        (error) => {
          console.error('❌ GEOLOCATION ERROR:', { 
            code: error.code, 
            message: error.message,
            PERMISSION_DENIED: error.code === 1,
            POSITION_UNAVAILABLE: error.code === 2,
            TIMEOUT: error.code === 3
          });
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
      console.warn('❌ Geolocation not supported by this browser');
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
        

        
        // Use fixed coordinates instead of user location
        logger.info('Using fixed coordinates instead of geolocation', { lat: 26.313387, lng: 50.142335 });
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
      console.log('🎯 SETTING UP MAP CLICK HANDLER');
      mapInstance.on('click', (e) => {
        console.log('🖱️ RAW MAP CLICK DETECTED:', e);
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
    console.log('🖱️ MAP CLICK EVENT:', { 
      hasMap: !!map.current, 
      activeTool, 
      coordinates: e.lngLat,
      eventType: e.type 
    });
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
      console.error('❌ MAP CLICK: No map instance available');
      logger.error('Map click failed - no map instance');
      return;
    }

    const { lng, lat } = e.lngLat;
    const currentTool = activeToolRef.current; // Use ref to get current tool
    console.log('🎯 PROCESSING CLICK:', { lng, lat, activeTool, activeToolRef: currentTool });

    switch (currentTool) {
      case 'beacons':
        console.log('📡 BEACON TOOL ACTIVATED - calling addBeacon');
        addBeacon(lng, lat);
        // Keep the tool active for adding multiple beacons
        break;
      case 'nodes':
        console.log('🔗 NODE TOOL ACTIVATED - calling addNode');
        addNode(lng, lat);
        // Keep the tool active for adding multiple nodes
        break;
      case 'poi':
        console.log('📍 POI TOOL ACTIVATED - calling createSimplePOI');
        createSimplePOI(lng, lat);
        // Switch back to select after creating POI
        setActiveTool('select');
        activeToolRef.current = 'select';
        break;
      case 'select':
        console.log('👆 SELECT TOOL - no action');
        break;
      case 'pan':
        console.log('✋ PAN TOOL - no action');
        break;
      default:
        console.log('❓ UNKNOWN TOOL:', activeTool);
        break;
    }
  };

    const addBeacon = (lng: number, lat: number) => {
    console.log('🚀 addBeacon CALLED:', { lng, lat, currentBeaconsCount: beacons.length });
    
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
      
      console.log('📦 NEW BEACON CREATED:', newBeacon);
      
      const updatedBeacons = [...beacons, newBeacon];
      setBeacons(updatedBeacons);
      
      // Save to localStorage
      saveToStorage(STORAGE_KEYS.BEACONS, updatedBeacons);
      
      console.log('🔄 UPDATING BEACONS STATE:', { 
        previousCount: beacons.length, 
        newBeacon: newBeacon.id,
        newCount: beacons.length + 1 
      });
      
      try {
        // Add marker to map and track it
        console.log('🗺️ ADDING MARKER TO MAP...');
        const marker = new Marker({ color: '#fbbf24' })
          .setLngLat([pendingBeaconLocation.lng, pendingBeaconLocation.lat])
          .setPopup(new Popup().setHTML(`<strong>${newBeacon.name}</strong><br>Type: Beacon`))
          .addTo(map.current);
          
        mapMarkers.current[`beacon-${newBeacon.id}`] = marker;
        console.log('✅ MARKER ADDED SUCCESSFULLY:', { 
          markerId: `beacon-${newBeacon.id}`,
          markerCount: Object.keys(mapMarkers.current).length 
        });
        
        logger.userAction('Beacon added', { beacon: newBeacon });
      } catch (error) {
        console.error('💥 ERROR ADDING MARKER:', error);
        logger.error('Failed to add beacon marker', error as Error);
      }
    }
    handleBeaconCancel();
  };

  const handleBeaconCancel = () => {
    setShowBeaconDialog(false);
    setPendingBeaconLocation(null);
    setBeaconName('');
    logger.userAction('Beacon dialog cancelled');
  };

    const addNode = (lng: number, lat: number) => {
    const newNode: RouteNode = {
      id: Date.now().toString(),
      x: lng,
      y: lat,
      connections: [],
      visible: true
    };
    
    const updatedNodes = [...nodes, newNode];
    setNodes(updatedNodes);
    
    // Save to localStorage
    saveToStorage(STORAGE_KEYS.NODES, updatedNodes);
    
    // Add marker to map and track it
    const marker = new Marker({ color: '#3b82f6' })
      .setLngLat([lng, lat])
      .setPopup(new Popup().setHTML(`<strong>Node ${newNode.id}</strong><br>Connections: ${newNode.connections.length}`))
      .addTo(map.current!);
      
    mapMarkers.current[`node-${newNode.id}`] = marker;
      
    logger.userAction('Node added', { node: newNode });
  };

  const createSimplePOI = (lng: number, lat: number) => {
    // This is a simplified POI creation - in a real implementation you'd want
    // to collect multiple points to create a polygon
    setPendingPolygonCenter({ lng, lat });
    setPolygonName('');
    setIsWallMode(false);
    setShowPolygonDialog(true);
  };

  const [pendingPolygonCenter, setPendingPolygonCenter] = useState<{ lng: number; lat: number } | null>(null);

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
    console.log('🔧 TOOL CHANGE:', { from: activeTool, to: tool });
    logger.userAction('Tool changed', { from: activeTool, to: tool });
    setActiveTool(tool);
    activeToolRef.current = tool; // Keep ref in sync
    setSelectedItem(null);
    console.log('✅ TOOL CHANGED TO:', tool);
  };

  const handlePolygonSave = () => {
    if (pendingPolygonCenter && polygonName.trim() && map.current) {
      const newPolygon: Polygon = {
        id: Date.now().toString(),
        name: polygonName.trim(),
        points: [
          { x: pendingPolygonCenter.lng - 0.00005, y: pendingPolygonCenter.lat + 0.00005 },
          { x: pendingPolygonCenter.lng + 0.00005, y: pendingPolygonCenter.lat + 0.00005 },
          { x: pendingPolygonCenter.lng + 0.00005, y: pendingPolygonCenter.lat - 0.00005 },
          { x: pendingPolygonCenter.lng - 0.00005, y: pendingPolygonCenter.lat - 0.00005 }
        ],
        type: isWallMode ? 'wall' : 'poi',
        visible: true,
        color: isWallMode ? '#6b7280' : '#3b82f6'
      };
      
      const updatedPolygons = [...polygons, newPolygon];
      setPolygons(updatedPolygons);
      
      // Save to localStorage
      saveToStorage(STORAGE_KEYS.POLYGONS, updatedPolygons);
      
      // Add polygon to map with proper visualization
      const mapInstance = map.current;
      const coordinates = newPolygon.points.map(p => [p.x, p.y]);
      coordinates.push(coordinates[0]); // Close the polygon
      
      const sourceId = `polygon-source-${newPolygon.id}`;
      const layerId = `polygon-layer-${newPolygon.id}`;
      
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
          'fill-color': newPolygon.color,
          'fill-opacity': 0.6
        }
      });
      
      // Add border
      const borderLayerId = `polygon-border-${newPolygon.id}`;
      mapInstance.addLayer({
        id: borderLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': newPolygon.color,
          'line-width': 2
        }
      });
      
      mapLayers.current[`polygon-${newPolygon.id}`] = layerId;
      mapLayers.current[`polygon-border-${newPolygon.id}`] = borderLayerId;
      
      // Add center marker for interaction
      const centerX = newPolygon.points.reduce((sum, p) => sum + p.x, 0) / newPolygon.points.length;
      const centerY = newPolygon.points.reduce((sum, p) => sum + p.y, 0) / newPolygon.points.length;
      
      const marker = new Marker({ color: newPolygon.color, scale: 0.8 })
        .setLngLat([centerX, centerY])
        .setPopup(new Popup().setHTML(`<strong>${newPolygon.name}</strong><br>Type: ${newPolygon.type}`))
        .addTo(mapInstance);
        
      mapMarkers.current[`polygon-${newPolygon.id}`] = marker;
      
      logger.userAction('Polygon saved', { 
        name: polygonName.trim(), 
        isWall: isWallMode,
        coordinates: pendingPolygonCenter
      });
    }
    handlePolygonCancel();
  };

  const handlePolygonCancel = () => {
    setShowPolygonDialog(false);
    setPendingPolygonCenter(null);
    setPolygonName('');
    setIsWallMode(false);
    logger.userAction('Polygon dialog cancelled');
  };

  const handleClearAll = () => {
    logger.userAction('Clear all clicked');
    setPolygons([]);
    setBeacons([]);
    setNodes([]);
    setEdges([]);
    setSelectedItem(null);
    
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
  console.log('🔍 RENDER DEBUG:', { 
    floorId, 
    activeTool, 
    loading,
    mapLoading,
    hasFloorData: !!floorData,
    coordinates: currentCoordinates,
    renderTime: new Date().toISOString()
  });
  
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
        <div className="drawing-toolbar">
          {/* Tool instruction message */}
          {activeTool !== 'select' && activeTool !== 'pan' && (
            <div className="tool-instruction">
              {activeTool === 'poi' && '📍 Click on the map to add a POI/Room'}
              {activeTool === 'beacons' && '📡 Click on the map to add beacons'}
              {activeTool === 'nodes' && '🔗 Click on the map to add route nodes'}
            </div>
          )}
          <div className="tool-group">
            <button 
              className={`tool-button ${activeTool === 'select' ? 'active' : ''}`}
              onClick={() => handleToolChange('select')}
              title={UI_MESSAGES.FLOOR_EDITOR_SELECT_MODE}
            >
              <span className="tool-icon">🖱️</span>
              Select
            </button>
            
            <button 
              className={`tool-button ${activeTool === 'pan' ? 'active' : ''}`}
              onClick={() => handleToolChange('pan')}
              title={UI_MESSAGES.FLOOR_EDITOR_PAN_MODE}
            >
              <span className="tool-icon">✋</span>
              Pan
            </button>
            
            <button 
              className={`tool-button ${activeTool === 'poi' ? 'active' : ''}`}
              onClick={() => handleToolChange('poi')}
              title={UI_MESSAGES.FLOOR_EDITOR_TOOL_POI}
            >
              <span className="tool-icon">📍</span>
              {UI_MESSAGES.FLOOR_EDITOR_TOOL_POI}
            </button>
            
            <button 
              className={`tool-button ${activeTool === 'beacons' ? 'active' : ''}`}
              onClick={() => handleToolChange('beacons')}
              title={UI_MESSAGES.FLOOR_EDITOR_TOOL_BEACONS}
            >
              <span className="tool-icon">📡</span>
              {UI_MESSAGES.FLOOR_EDITOR_TOOL_BEACONS}
            </button>
            
            <button 
              className={`tool-button ${activeTool === 'nodes' ? 'active' : ''}`}
              onClick={() => handleToolChange('nodes')}
              title={UI_MESSAGES.FLOOR_EDITOR_TOOL_NODES}
            >
              <span className="tool-icon">🔗</span>
              {UI_MESSAGES.FLOOR_EDITOR_TOOL_NODES}
            </button>
          </div>

          <div className="tool-group">
            <Button variant="DANGER" onClick={handleClearAll}>
              {UI_MESSAGES.FLOOR_EDITOR_CLEAR_ALL}
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="editor-main">
          {/* Map Container */}
          <div className="map-container">
            {mapLoading && (
              <div className="map-loading-overlay">
                <div className="loading-message">{UI_MESSAGES.FLOOR_EDITOR_MAP_LOADING}</div>
              </div>
            )}
            <div ref={mapContainer} className={`map-wrapper tool-${activeTool}`} />
            
            {/* Coordinates Display */}
            {currentCoordinates && (
              <div className="coordinates-display">
                <span className="coordinates-label">{UI_MESSAGES.FLOOR_EDITOR_COORDINATES_LABEL}</span>
                <span className="coordinates-value">
                  {currentCoordinates.lat.toFixed(6)}, {currentCoordinates.lng.toFixed(6)}
                </span>
              </div>
            )}
          </div>

          {/* Layers Panel */}
          <div className="layers-panel">
            <div className="layers-header">
              <h3>{UI_MESSAGES.FLOOR_EDITOR_LAYERS_TITLE}</h3>
              
              {/* Filter buttons */}
              <div className="layer-filters">
                <button 
                  className={`filter-button ${layerFilter === 'polygons' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('polygons')}
                >
                  Polygons
                </button>
                <button 
                  className={`filter-button ${layerFilter === 'beacons' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('beacons')}
                >
                  Beacons
                </button>
                <button 
                  className={`filter-button ${layerFilter === 'nodes' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('nodes')}
                >
                  Route Nodes
                </button>
              </div>
            </div>
            
            <div className="layers-content">
              {(() => {
                const filteredData = getFilteredData();
                
                return (
                  <>
                    {/* Polygons */}
                    {filteredData.polygons.length > 0 && (
                      <div className="layer-group">
                        <h4>Polygons ({filteredData.polygons.length})</h4>
                        {filteredData.polygons.map(polygon => (
                          <div 
                            key={polygon.id} 
                            className={`layer-item ${selectedItem?.type === 'polygon' && selectedItem?.id === polygon.id ? 'selected' : ''}`}
                            onClick={() => handleLayerItemClick('polygon', polygon.id)}
                          >
                            <button
                              className="visibility-toggle"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLayerVisibility('polygon', polygon.id);
                              }}
                              title={polygon.visible ? UI_MESSAGES.FLOOR_EDITOR_LAYER_VISIBLE : UI_MESSAGES.FLOOR_EDITOR_LAYER_HIDDEN}
                            >
                              {polygon.visible ? '👁️' : '🚫'}
                            </button>
                            <div className="layer-color" style={{ backgroundColor: polygon.color }}></div>
                            <span className="layer-name">{polygon.name}</span>
                            <span className="layer-type">({polygon.type})</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Beacons */}
                    {filteredData.beacons.length > 0 && (
                      <div className="layer-group">
                        <h4>Beacons ({filteredData.beacons.length})</h4>
                        {filteredData.beacons.map(beacon => (
                          <div 
                            key={beacon.id} 
                            className={`layer-item ${selectedItem?.type === 'beacon' && selectedItem?.id === beacon.id ? 'selected' : ''}`}
                            onClick={() => handleLayerItemClick('beacon', beacon.id)}
                          >
                            <button
                              className="visibility-toggle"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLayerVisibility('beacon', beacon.id);
                              }}
                              title={beacon.visible ? UI_MESSAGES.FLOOR_EDITOR_LAYER_VISIBLE : UI_MESSAGES.FLOOR_EDITOR_LAYER_HIDDEN}
                            >
                              {beacon.visible ? '👁️' : '🚫'}
                            </button>
                            <div className="layer-color beacon-color"></div>
                            <span className="layer-name">{beacon.name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Nodes */}
                    {filteredData.nodes.length > 0 && (
                      <div className="layer-group">
                        <h4>Route Nodes ({filteredData.nodes.length})</h4>
                        {filteredData.nodes.map(node => (
                          <div 
                            key={node.id} 
                            className={`layer-item ${selectedItem?.type === 'node' && selectedItem?.id === node.id ? 'selected' : ''}`}
                            onClick={() => handleLayerItemClick('node', node.id)}
                          >
                            <button
                              className="visibility-toggle"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLayerVisibility('node', node.id);
                              }}
                              title={node.visible ? UI_MESSAGES.FLOOR_EDITOR_LAYER_VISIBLE : UI_MESSAGES.FLOOR_EDITOR_LAYER_HIDDEN}
                            >
                              {node.visible ? '👁️' : '🚫'}
                            </button>
                            <div className="layer-color node-color"></div>
                            <span className="layer-name">Node {node.id}</span>
                            <span className="layer-connections">({node.connections.length} connections)</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {filteredData.polygons.length === 0 && filteredData.beacons.length === 0 && filteredData.nodes.length === 0 && (
                      <div className="no-layers-message">
                        {`No ${layerFilter} found`}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Polygon Dialog */}
      {showPolygonDialog && (
        <div className="dialog-overlay">
          <div className="dialog-content">
            <h2>{UI_MESSAGES.FLOOR_EDITOR_POLYGON_DIALOG_TITLE}</h2>
            <Input
              id="polygon-name"
              name="polygon-name"
              label={UI_MESSAGES.FLOOR_EDITOR_POLYGON_NAME_LABEL}
              value={polygonName}
              onChange={(e) => setPolygonName(e.target.value)}
              placeholder={UI_MESSAGES.FLOOR_EDITOR_POLYGON_NAME_PLACEHOLDER}
            />
            <div className="dialog-checkbox">
              <label>
                <input 
                  type="checkbox" 
                  checked={isWallMode}
                  onChange={(e) => setIsWallMode(e.target.checked)}
                />
                {UI_MESSAGES.FLOOR_EDITOR_POLYGON_IS_WALL_LABEL}
              </label>
            </div>
            <div className="dialog-buttons">
              <Button variant="SECONDARY" onClick={handlePolygonCancel}>
                {UI_MESSAGES.FLOOR_EDITOR_POLYGON_CANCEL}
              </Button>
              <Button variant="PRIMARY" onClick={handlePolygonSave} disabled={!polygonName.trim()}>
                {UI_MESSAGES.FLOOR_EDITOR_POLYGON_SAVE}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Beacon Dialog */}
      {showBeaconDialog && (
        <div className="dialog-overlay">
          <div className="dialog-content">
            <h2>Add New Beacon</h2>
            <Input
              id="beacon-name"
              name="beacon-name"
              label="Beacon Name"
              value={beaconName}
              onChange={(e) => setBeaconName(e.target.value)}
              placeholder="Enter beacon name"
            />
            <div className="dialog-buttons">
              <Button variant="SECONDARY" onClick={handleBeaconCancel}>
                Cancel
              </Button>
              <Button variant="PRIMARY" onClick={handleBeaconSave} disabled={!beaconName.trim()}>
                Add Beacon
              </Button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
};

export default FloorEditor; 