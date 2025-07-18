import { Map, Marker, Popup, config } from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import React, { useEffect, useRef, useState } from 'react';
import { MAPTILER_API_KEY, MAPTILER_STYLE_URL } from '../constants/api';
import { UI_MESSAGES } from '../constants/ui';
import { Floor, FloorLayoutData, floorLayoutApi, floorsApi } from '../utils/api';
import { createLogger } from '../utils/logger';
import { Button, Container, Header, Input } from './common';
import './FloorEditor.css';

const logger = createLogger('FloorEditor');

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
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      { x: 200, y: 180 },
      { x: 100, y: 180 }
    ],
    type: 'poi',
    visible: true,
    color: '#3b82f6'
  },
  {
    id: '2',
    name: 'Classroom B',
    points: [
      { x: 250, y: 100 },
      { x: 350, y: 100 },
      { x: 350, y: 180 },
      { x: 250, y: 180 }
    ],
    type: 'poi',
    visible: true,
    color: '#10b981'
  },
  {
    id: '3',
    name: 'Hallway Wall',
    points: [
      { x: 80, y: 200 },
      { x: 370, y: 200 },
      { x: 370, y: 210 },
      { x: 80, y: 210 }
    ],
    type: 'wall',
    visible: true,
    color: '#6b7280'
  }
];

const SAMPLE_BEACONS: Beacon[] = [
  { id: '1', name: 'Beacon 1', x: 150, y: 140, visible: true },
  { id: '2', name: 'Beacon 2', x: 300, y: 140, visible: true },
  { id: '3', name: 'Beacon 3', x: 225, y: 250, visible: true }
];

const SAMPLE_NODES: RouteNode[] = [
  { id: '1', x: 150, y: 220, connections: ['2'], visible: true },
  { id: '2', x: 300, y: 220, connections: ['1', '3'], visible: true },
  { id: '3', x: 225, y: 300, connections: ['2'], visible: true }
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
  
  // Drawing state (keeping your existing structure)
  const [activeTool, setActiveTool] = useState<DrawingTool>('select');
  const [polygons, setPolygons] = useState<Polygon[]>(SAMPLE_POLYGONS);
  const [beacons, setBeacons] = useState<Beacon[]>(SAMPLE_BEACONS);
  const [nodes, setNodes] = useState<RouteNode[]>(SAMPLE_NODES);
  const [edges, setEdges] = useState<Edge[]>(SAMPLE_EDGES);
  
  // Selection state
  const [selectedItem, setSelectedItem] = useState<{type: 'polygon' | 'beacon' | 'node', id: string} | null>(null);
  
  // Polygon dialog state
  const [showPolygonDialog, setShowPolygonDialog] = useState(false);
  const [polygonName, setPolygonName] = useState('');
  const [isWallMode, setIsWallMode] = useState(false);
  const [editingPolygonId, setEditingPolygonId] = useState<string | null>(null);

  useEffect(() => {
    logger.info('FloorEditor component mounted', { floorId });
    loadFloorData();
    
    return () => {
      logger.info('FloorEditor component unmounted');
      if (map.current) {
        map.current.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorId]);

  // Separate effect for map initialization - only after loading is complete and container is ready
  useEffect(() => {
    if (!loading && mapContainer.current && !map.current) {
      logger.info('Initializing map after loading complete');
      initializeMap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

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

  const initializeMap = () => {
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
        center: [-157.8583, 21.3099], // Honolulu coordinates as default
        zoom: 15
      });

      map.current = mapInstance;

      mapInstance.on('load', () => {
        setMapLoading(false);
        logger.info('Map loaded successfully');
        
        // Immediately ask for user's location with better handling
        getUserLocationAndCenter(mapInstance);
      });

      mapInstance.on('error', (e) => {
        logger.error('Map error event', new Error(e.error?.message || 'Map error occurred'));
        setError('Map failed to load. Please check your API key.');
        setMapLoading(false);
      });

      // Mouse move event to track coordinates
      mapInstance.on('mousemove', (e) => {
        setCurrentCoordinates({
          lng: Number(e.lngLat.lng.toFixed(6)),
          lat: Number(e.lngLat.lat.toFixed(6))
        });
      });

      // Click handlers for different tools
      mapInstance.on('click', (e) => {
        handleMapClick(e);
      });

      // Set a timeout to catch cases where the map never loads
      setTimeout(() => {
        if (mapLoading) {
          logger.error('Map loading timeout - map failed to load within 30 seconds');
          setError('Map loading timeout. Please check your internet connection and API key.');
          setMapLoading(false);
        }
      }, 30000);

    } catch (error) {
      logger.error('Failed to initialize map', error as Error);
      setError('Failed to initialize map. Please check the MapTiler configuration.');
      setMapLoading(false);
    }
  };

  const handleMapClick = (e: any) => {
    if (!map.current) return;

    const { lng, lat } = e.lngLat;
    logger.userAction('Map clicked', { lng, lat, activeTool });

    switch (activeTool) {
      case 'beacons':
        addBeacon(lng, lat);
        break;
      case 'nodes':
        addNode(lng, lat);
        break;
      case 'poi':
        // For POI/polygon creation, you might want to collect multiple points
        // This is a simplified version
        createSimplePOI(lng, lat);
        break;
      default:
        break;
    }
  };

  const addBeacon = (lng: number, lat: number) => {
    const newBeacon: Beacon = {
      id: Date.now().toString(),
      name: `Beacon ${beacons.length + 1}`,
      x: lng,
      y: lat,
      visible: true
    };
    
    setBeacons(prev => [...prev, newBeacon]);
    
    // Add marker to map
    new Marker({ color: '#fbbf24' })
      .setLngLat([lng, lat])
      .setPopup(new Popup().setHTML(`<strong>${newBeacon.name}</strong>`))
      .addTo(map.current!);
      
    logger.userAction('Beacon added', { beacon: newBeacon });
  };

  const addNode = (lng: number, lat: number) => {
    const newNode: RouteNode = {
      id: Date.now().toString(),
      x: lng,
      y: lat,
      connections: [],
      visible: true
    };
    
    setNodes(prev => [...prev, newNode]);
    
    // Add marker to map
    new Marker({ color: '#3b82f6' })
      .setLngLat([lng, lat])
      .setPopup(new Popup().setHTML(`<strong>Node ${newNode.id}</strong>`))
      .addTo(map.current!);
      
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
    logger.userAction('Tool changed', { tool });
    setActiveTool(tool);
    setSelectedItem(null);
  };

  const handlePolygonSave = () => {
    if (!polygonName.trim()) return;

    if (editingPolygonId) {
      // Editing existing polygon
      setPolygons(prev => prev.map(p => 
        p.id === editingPolygonId 
          ? { 
              ...p, 
              name: polygonName.trim(),
              type: isWallMode ? 'wall' : 'poi',
              color: isWallMode ? '#6b7280' : '#3b82f6'
            }
          : p
      ));
      
      logger.userAction('Polygon edited', { 
        id: editingPolygonId,
        name: polygonName.trim(), 
        isWall: isWallMode
      });
    } else if (pendingPolygonCenter) {
      // Creating new polygon
      const newPolygon: Polygon = {
        id: Date.now().toString(),
        name: polygonName.trim(),
        points: [
          { x: pendingPolygonCenter.lng - 0.0001, y: pendingPolygonCenter.lat + 0.0001 },
          { x: pendingPolygonCenter.lng + 0.0001, y: pendingPolygonCenter.lat + 0.0001 },
          { x: pendingPolygonCenter.lng + 0.0001, y: pendingPolygonCenter.lat - 0.0001 },
          { x: pendingPolygonCenter.lng - 0.0001, y: pendingPolygonCenter.lat - 0.0001 }
        ],
        type: isWallMode ? 'wall' : 'poi',
        visible: true,
        color: isWallMode ? '#6b7280' : '#3b82f6'
      };
      setPolygons(prev => [...prev, newPolygon]);
      
      // Add polygon to map
      new Marker({ color: newPolygon.color })
        .setLngLat([newPolygon.points[0].x, newPolygon.points[0].y])
        .setPopup(new Popup().setHTML(`<strong>${newPolygon.name}</strong><br>Type: ${newPolygon.type}`))
        .addTo(map.current!);
      
      logger.userAction('Polygon created', { 
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
    setEditingPolygonId(null);
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

  const handleEditItem = (type: 'polygon' | 'beacon' | 'node', id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    logger.userAction('Edit item clicked', { type, id });
    
    switch (type) {
      case 'polygon':
        const polygon = polygons.find(p => p.id === id);
        if (polygon) {
          setPolygonName(polygon.name);
          setIsWallMode(polygon.type === 'wall');
          setEditingPolygonId(id);
          setPendingPolygonCenter(null); // Clear this to indicate we're editing, not creating
          setShowPolygonDialog(true);
          setSelectedItem({ type, id });
        }
        break;
      case 'beacon':
        // TODO: Implement beacon editing dialog
        logger.info('Beacon editing not yet implemented', { id });
        break;
      case 'node':
        // TODO: Implement node editing dialog
        logger.info('Node editing not yet implemented', { id });
        break;
    }
  };

  const handleDeleteItem = (type: 'polygon' | 'beacon' | 'node', id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    logger.userAction('Delete item clicked', { type, id });
    
    switch (type) {
      case 'polygon':
        setPolygons(prev => prev.filter(p => p.id !== id));
        break;
      case 'beacon':
        setBeacons(prev => prev.filter(b => b.id !== id));
        break;
      case 'node':
        setNodes(prev => prev.filter(n => n.id !== id));
        // Also remove any edges connected to this node
        setEdges(prev => prev.filter(e => e.fromNodeId !== id && e.toNodeId !== id));
        break;
    }
    
    // Clear selection if the deleted item was selected
    if (selectedItem?.type === type && selectedItem?.id === id) {
      setSelectedItem(null);
    }
    
    // TODO: Remove marker from map when backend integration is complete
  };

  const toggleLayerVisibility = (type: 'polygon' | 'beacon' | 'node', id: string) => {
    logger.userAction('Layer visibility toggled', { type, id });
    
    switch (type) {
      case 'polygon':
        setPolygons(prev => prev.map(p => 
          p.id === id ? { ...p, visible: !p.visible } : p
        ));
        break;
      case 'beacon':
        setBeacons(prev => prev.map(b => 
          b.id === id ? { ...b, visible: !b.visible } : b
        ));
        break;
      case 'node':
        setNodes(prev => prev.map(n => 
          n.id === id ? { ...n, visible: !n.visible } : n
        ));
        break;
    }
  };

  const handleSave = async () => {
    logger.userAction('Save button clicked');
    // TODO: Implement save functionality when backend is ready
    logger.info('Save functionality not yet implemented');
  };

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
            <div ref={mapContainer} className="map-wrapper" />
            
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
            </div>
            
            <div className="layers-content">
              {/* Polygons */}
              {polygons.length > 0 && (
                <div className="layer-group">
                  <h4>Polygons ({polygons.length})</h4>
                  {polygons.map(polygon => (
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
                      <div className="layer-actions">
                        <button
                          className="layer-action-button edit-button"
                          onClick={(e) => handleEditItem('polygon', polygon.id, e)}
                          title="Edit polygon"
                        >
                          ✏️
                        </button>
                        <button
                          className="layer-action-button delete-button"
                          onClick={(e) => handleDeleteItem('polygon', polygon.id, e)}
                          title="Delete polygon"
                        >
                          ❌
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Beacons */}
              {beacons.length > 0 && (
                <div className="layer-group">
                  <h4>Beacons ({beacons.length})</h4>
                  {beacons.map(beacon => (
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
                      <div className="layer-actions">
                        <button
                          className="layer-action-button edit-button"
                          onClick={(e) => handleEditItem('beacon', beacon.id, e)}
                          title="Edit beacon"
                        >
                          ✏️
                        </button>
                        <button
                          className="layer-action-button delete-button"
                          onClick={(e) => handleDeleteItem('beacon', beacon.id, e)}
                          title="Delete beacon"
                        >
                          ❌
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Nodes */}
              {nodes.length > 0 && (
                <div className="layer-group">
                  <h4>Route Nodes ({nodes.length})</h4>
                  {nodes.map(node => (
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
                      <div className="layer-actions">
                        <button
                          className="layer-action-button edit-button"
                          onClick={(e) => handleEditItem('node', node.id, e)}
                          title="Edit node"
                        >
                          ✏️
                        </button>
                        <button
                          className="layer-action-button delete-button"
                          onClick={(e) => handleDeleteItem('node', node.id, e)}
                          title="Delete node"
                        >
                          ❌
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {polygons.length === 0 && beacons.length === 0 && nodes.length === 0 && (
                <div className="no-layers-message">
                  {UI_MESSAGES.FLOOR_EDITOR_NO_LAYERS}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Polygon Dialog */}
      {showPolygonDialog && (
        <div className="dialog-overlay">
          <div className="dialog-content">
            <h2>{editingPolygonId ? UI_MESSAGES.FLOOR_EDITOR_POLYGON_EDIT_TITLE : UI_MESSAGES.FLOOR_EDITOR_POLYGON_DIALOG_TITLE}</h2>
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
    </Container>
  );
};

export default FloorEditor; 