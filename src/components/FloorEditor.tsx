import React, { useEffect, useRef, useState } from 'react';
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
  const [floor, setFloor] = useState<Floor | null>(null);
  const [floorData, setFloorData] = useState<FloorLayoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Drawing state
  const [activeTool, setActiveTool] = useState<DrawingTool>('select');
  const [polygons, setPolygons] = useState<Polygon[]>(SAMPLE_POLYGONS);
  const [beacons, setBeacons] = useState<Beacon[]>(SAMPLE_BEACONS);
  const [nodes, setNodes] = useState<RouteNode[]>(SAMPLE_NODES);
  const [edges, setEdges] = useState<Edge[]>(SAMPLE_EDGES);
  const [currentDrawing, setCurrentDrawing] = useState<Point[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // Selection state
  const [selectedItem, setSelectedItem] = useState<{type: 'polygon' | 'beacon' | 'node', id: string} | null>(null);
  
  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null);
  
  // Polygon dialog state
  const [showPolygonDialog, setShowPolygonDialog] = useState(false);
  const [pendingPolygon, setPendingPolygon] = useState<Point[]>([]);
  const [polygonName, setPolygonName] = useState('');
  const [isWallMode, setIsWallMode] = useState(false);
  
  // Canvas ref
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  useEffect(() => {
    logger.info('FloorEditor component mounted', { floorId });
    loadFloorData();
    
    return () => {
      logger.info('FloorEditor component unmounted');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorId]);

  // Resize canvas to fit container
  const resizeCanvas = () => {
    if (containerRef.current) {
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const newWidth = Math.floor(rect.width - 32); // Subtract padding
      const newHeight = Math.floor(rect.height - 32); // Subtract padding
      
      if (newWidth > 0 && newHeight > 0) {
        setCanvasSize({ width: newWidth, height: newHeight });
        logger.debug('Canvas resized', { width: newWidth, height: newHeight });
      }
    }
  };

  // Handle window resize and initial sizing
  useEffect(() => {
    resizeCanvas();
    
    const handleResize = () => {
      resizeCanvas();
    };
    
    window.addEventListener('resize', handleResize);
    
    // Also resize on container size changes (using ResizeObserver if available)
    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        resizeCanvas();
      });
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    drawCanvas();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polygons, beacons, nodes, edges, zoom, pan, currentDrawing, selectedNodeId, selectedItem, canvasSize]);

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

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply zoom and pan
    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(pan.x, pan.y);

    // Draw grid
    drawGrid(ctx);

    // Draw polygons
    polygons.forEach(polygon => {
      if (polygon.visible) {
        drawPolygon(ctx, polygon);
      }
    });

    // Draw edges
    edges.forEach(edge => {
      if (edge.visible) {
        drawEdge(ctx, edge);
      }
    });

    // Draw beacons
    beacons.forEach(beacon => {
      if (beacon.visible) {
        drawBeacon(ctx, beacon);
      }
    });

    // Draw nodes
    nodes.forEach(node => {
      if (node.visible) {
        drawNode(ctx, node, node.id === selectedNodeId);
      }
    });

    // Draw current drawing
    if (currentDrawing.length > 0) {
      drawCurrentDrawing(ctx);
    }

    ctx.restore();
  };

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    const gridSize = 20;
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;

    for (let x = 0; x < canvasSize.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasSize.height);
      ctx.stroke();
    }

    for (let y = 0; y < canvasSize.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasSize.width, y);
      ctx.stroke();
    }
  };

  const drawPolygon = (ctx: CanvasRenderingContext2D, polygon: Polygon) => {
    if (polygon.points.length < 3) return;

    const isSelected = selectedItem?.type === 'polygon' && selectedItem?.id === polygon.id;
    
    ctx.fillStyle = polygon.color + (isSelected ? '60' : '40'); // More opacity if selected
    ctx.strokeStyle = isSelected ? '#ef4444' : polygon.color;
    ctx.lineWidth = isSelected ? 3 : 2;

    ctx.beginPath();
    ctx.moveTo(polygon.points[0].x, polygon.points[0].y);
    for (let i = 1; i < polygon.points.length; i++) {
      ctx.lineTo(polygon.points[i].x, polygon.points[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw selection highlight
    if (isSelected) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw label
    const centerX = polygon.points.reduce((sum, p) => sum + p.x, 0) / polygon.points.length;
    const centerY = polygon.points.reduce((sum, p) => sum + p.y, 0) / polygon.points.length;
    
    ctx.fillStyle = isSelected ? '#ef4444' : '#000';
    ctx.font = isSelected ? 'bold 12px Arial' : '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(polygon.name, centerX, centerY);
  };

  const drawBeacon = (ctx: CanvasRenderingContext2D, beacon: Beacon) => {
    const isSelected = selectedItem?.type === 'beacon' && selectedItem?.id === beacon.id;
    
    ctx.fillStyle = isSelected ? '#ef4444' : '#fbbf24';
    ctx.strokeStyle = isSelected ? '#dc2626' : '#f59e0b';
    ctx.lineWidth = isSelected ? 3 : 2;

    ctx.beginPath();
    ctx.arc(beacon.x, beacon.y, isSelected ? 10 : 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Draw selection highlight
    if (isSelected) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(beacon.x, beacon.y, 15, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw label
    ctx.fillStyle = isSelected ? '#ef4444' : '#000';
    ctx.font = isSelected ? 'bold 10px Arial' : '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(beacon.name, beacon.x, beacon.y - (isSelected ? 20 : 15));
  };

  const drawNode = (ctx: CanvasRenderingContext2D, node: RouteNode, selected: boolean) => {
    const isItemSelected = selectedItem?.type === 'node' && selectedItem?.id === node.id;
    const isActivelySelected = selected || isItemSelected;
    
    ctx.fillStyle = isActivelySelected ? '#ef4444' : '#3b82f6';
    ctx.strokeStyle = isActivelySelected ? '#dc2626' : '#2563eb';
    ctx.lineWidth = isActivelySelected ? 3 : 2;

    ctx.beginPath();
    ctx.arc(node.x, node.y, isActivelySelected ? 10 : 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Draw selection highlight for item selection
    if (isItemSelected) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(node.x, node.y, 15, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw node ID
    ctx.fillStyle = '#fff';
    ctx.font = isActivelySelected ? 'bold 10px Arial' : '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(node.id, node.x, node.y + 3);
  };

  const drawEdge = (ctx: CanvasRenderingContext2D, edge: Edge) => {
    const fromNode = nodes.find(n => n.id === edge.fromNodeId);
    const toNode = nodes.find(n => n.id === edge.toNodeId);
    
    if (!fromNode || !toNode) return;

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(fromNode.x, fromNode.y);
    ctx.lineTo(toNode.x, toNode.y);
    ctx.stroke();
  };

  const drawCurrentDrawing = (ctx: CanvasRenderingContext2D) => {
    if (currentDrawing.length < 2) return;

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(currentDrawing[0].x, currentDrawing[0].y);
    for (let i = 1; i < currentDrawing.length; i++) {
      ctx.lineTo(currentDrawing[i].x, currentDrawing[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw points
    ctx.fillStyle = '#ef4444';
    currentDrawing.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, index === 0 ? 6 : 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Highlight first point if we have at least 3 points (potential completion)
    if (currentDrawing.length >= 3) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(currentDrawing[0].x, currentDrawing[0].y, 10, 0, 2 * Math.PI);
      ctx.stroke();
    }
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom - pan.x;
    const y = (e.clientY - rect.top) / zoom - pan.y;
    return { x, y };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'pan') {
      setIsPanning(true);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      setLastPanPoint({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'pan' && isPanning && lastPanPoint) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      
      const currentPoint = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      
      const deltaX = (currentPoint.x - lastPanPoint.x) / zoom;
      const deltaY = (currentPoint.y - lastPanPoint.y) / zoom;
      
      setPan(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastPanPoint(currentPoint);
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    setLastPanPoint(null);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'pan') return; // Don't handle clicks in pan mode
    
    const { x, y } = getCanvasCoordinates(e);
    logger.userAction('Canvas clicked', { x, y, activeTool });

    switch (activeTool) {
      case 'poi':
        handlePoiClick(x, y);
        break;
      case 'beacons':
        handleBeaconClick(x, y);
        break;
      case 'nodes':
        handleNodeClick(x, y);
        break;
      case 'select':
        handleSelectClick(x, y);
        break;
    }
  };

  const handlePoiClick = (x: number, y: number) => {
    const newDrawing = [...currentDrawing, { x, y }];
    
    // Check if we're completing the polygon (clicking near the first point)
    if (newDrawing.length >= 3) {
      const firstPoint = newDrawing[0];
      const distance = Math.sqrt((firstPoint.x - x) ** 2 + (firstPoint.y - y) ** 2);
      
      // If within 15 pixels of the first point, complete the polygon
      if (distance <= 15) {
        logger.userAction('Polygon completed by clicking near first point', { 
          pointCount: newDrawing.length - 1, // Don't count the duplicate last point
          distance 
        });
        
        // Remove the last point (which is duplicate of first) and show dialog
        const completedPolygon = newDrawing.slice(0, -1);
        setPendingPolygon(completedPolygon);
        setCurrentDrawing([]);
        setPolygonName('');
        setIsWallMode(false);
        setShowPolygonDialog(true);
        return;
      }
    }
    
    setCurrentDrawing(newDrawing);
  };

  const handleBeaconClick = (x: number, y: number) => {
    const newBeacon: Beacon = {
      id: Date.now().toString(),
      name: `Beacon ${beacons.length + 1}`,
      x,
      y,
      visible: true
    };
    setBeacons(prev => [...prev, newBeacon]);
  };

  const handleNodeClick = (x: number, y: number) => {
    // Check if clicking on existing node
    const clickedNode = nodes.find(node => {
      const distance = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
      return distance < 15;
    });

    if (clickedNode) {
      if (selectedNodeId && selectedNodeId !== clickedNode.id) {
        // Create edge between selected node and clicked node
        const newEdge: Edge = {
          id: Date.now().toString(),
          fromNodeId: selectedNodeId,
          toNodeId: clickedNode.id,
          visible: true
        };
        setEdges(prev => [...prev, newEdge]);
        
        // Update node connections
        setNodes(prev => prev.map(node => {
          if (node.id === selectedNodeId) {
            return { ...node, connections: [...node.connections, clickedNode.id] };
          }
          if (node.id === clickedNode.id) {
            return { ...node, connections: [...node.connections, selectedNodeId] };
          }
          return node;
        }));
        
        setSelectedNodeId(null);
      } else {
        setSelectedNodeId(clickedNode.id);
      }
    } else {
      // Create new node only if no nodes exist or a node is selected
      if (nodes.length === 0 || selectedNodeId) {
        const newNode: RouteNode = {
          id: Date.now().toString(),
          x,
          y,
          connections: [],
          visible: true
        };
        
        if (selectedNodeId) {
          // Create edge to selected node
          const newEdge: Edge = {
            id: Date.now().toString(),
            fromNodeId: selectedNodeId,
            toNodeId: newNode.id,
            visible: true
          };
          setEdges(prev => [...prev, newEdge]);
          
          // Update connections
          newNode.connections = [selectedNodeId];
          setNodes(prev => prev.map(node => {
            if (node.id === selectedNodeId) {
              return { ...node, connections: [...node.connections, newNode.id] };
            }
            return node;
          }));
        }
        
        setNodes(prev => [...prev, newNode]);
        setSelectedNodeId(newNode.id);
      }
    }
  };

  const handleSelectClick = (x: number, y: number) => {
    // Check for polygon selection (using point-in-polygon algorithm)
    for (const polygon of polygons) {
      if (polygon.visible && isPointInPolygon({ x, y }, polygon.points)) {
        setSelectedItem({ type: 'polygon', id: polygon.id });
        setSelectedNodeId(null);
        logger.userAction('Polygon selected', { polygonId: polygon.id, name: polygon.name });
        return;
      }
    }

    // Check for beacon selection
    for (const beacon of beacons) {
      if (beacon.visible) {
        const distance = Math.sqrt((beacon.x - x) ** 2 + (beacon.y - y) ** 2);
        if (distance <= 15) {
          setSelectedItem({ type: 'beacon', id: beacon.id });
          setSelectedNodeId(null);
          logger.userAction('Beacon selected', { beaconId: beacon.id, name: beacon.name });
          return;
        }
      }
    }

    // Check for node selection
    for (const node of nodes) {
      if (node.visible) {
        const distance = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
        if (distance <= 15) {
          setSelectedItem({ type: 'node', id: node.id });
          setSelectedNodeId(null);
          logger.userAction('Node selected', { nodeId: node.id });
          return;
        }
      }
    }

    // No item selected - clear selection
    setSelectedItem(null);
    setSelectedNodeId(null);
  };

  // Point-in-polygon algorithm (ray casting)
  const isPointInPolygon = (point: Point, polygon: Point[]): boolean => {
    let inside = false;
    let j = polygon.length - 1;
    
    for (let i = 0; i < polygon.length; i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;
      
      if (((yi > point.y) !== (yj > point.y)) && 
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
      j = i;
    }
    
    return inside;
  };

  const handleToolChange = (tool: DrawingTool) => {
    logger.userAction('Tool changed', { tool });
    setActiveTool(tool);
    setCurrentDrawing([]);
    setSelectedNodeId(null);
    if (tool !== 'select') {
      setSelectedItem(null); // Clear item selection when switching away from select tool
    }
  };

  const handlePolygonSave = () => {
    if (pendingPolygon.length >= 3 && polygonName.trim()) {
      const newPolygon: Polygon = {
        id: Date.now().toString(),
        name: polygonName.trim(),
        points: [...pendingPolygon],
        type: isWallMode ? 'wall' : 'poi',
        visible: true,
        color: isWallMode ? '#6b7280' : '#3b82f6'
      };
      setPolygons(prev => [...prev, newPolygon]);
      logger.userAction('Polygon saved', { 
        name: polygonName.trim(), 
        isWall: isWallMode,
        pointCount: pendingPolygon.length 
      });
    }
    handlePolygonCancel();
  };

  const handlePolygonCancel = () => {
    setShowPolygonDialog(false);
    setPendingPolygon([]);
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
    setCurrentDrawing([]);
    setSelectedNodeId(null);
  };

  const handleLayerItemClick = (type: 'polygon' | 'beacon' | 'node', id: string) => {
    setSelectedItem({ type, id });
    setActiveTool('select'); // Switch to select tool when selecting from layers
    logger.userAction('Layer item selected', { type, id });
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

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.5));
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  logger.debug('FloorEditor component rendering', { 
    floorId, 
    activeTool, 
    loading,
    hasFloorData: !!floorData 
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
              title="Pan/Move Map"
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
            <button 
              className="tool-button"
              onClick={handleZoomIn}
              title={UI_MESSAGES.FLOOR_EDITOR_ZOOM_IN}
            >
              <span className="tool-icon">🔍+</span>
            </button>
            
            <button 
              className="tool-button"
              onClick={handleZoomOut}
              title={UI_MESSAGES.FLOOR_EDITOR_ZOOM_OUT}
            >
              <span className="tool-icon">🔍-</span>
            </button>
            
            <button 
              className="tool-button"
              onClick={handleResetView}
              title={UI_MESSAGES.FLOOR_EDITOR_RESET_VIEW}
            >
              <span className="tool-icon">🎯</span>
            </button>
            
            <Button variant="DANGER" onClick={handleClearAll}>
              {UI_MESSAGES.FLOOR_EDITOR_CLEAR_ALL}
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="editor-main">
          {/* Map Canvas */}
          <div ref={containerRef} className="map-container">
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              onClick={handleCanvasClick}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              className={`map-canvas ${activeTool === 'pan' ? 'pan-mode' : activeTool === 'select' ? 'select-mode' : ''}`}
            />
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
    </Container>
  );
};

export default FloorEditor; 