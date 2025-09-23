import { useState, useRef, useCallback } from "react";
import { Point } from "@maptiler/sdk";
import { DrawingTool } from "../components/FloorEditor/DrawingToolbar";

export interface DrawingState {
    activeTool: DrawingTool;
    isDrawingPolygon: boolean;
    currentPolygonPoints: Point[];
    pendingPolygonPoints: Point[];
    pendingPolygonCenter: { lng: number; lat: number } | null;
    editingPolygonId: number | null;
    selectedNodeForConnection: number | null;
    lastPlacedNodeId: number | null;
    selectedItem: { type: "polygon" | "beacon" | "node"; id: number } | null;
}

export function useDrawingState() {
    // Drawing state
    const [activeTool, setActiveTool] = useState<DrawingTool>("select");
    const activeToolRef = useRef<DrawingTool>("select");
    
    // Polygon drawing state
    const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
    const [currentPolygonPoints, setCurrentPolygonPoints] = useState<Point[]>([]);
    const [pendingPolygonPoints, setPendingPolygonPoints] = useState<Point[]>([]);
    const [pendingPolygonCenter, setPendingPolygonCenter] = useState<{ lng: number; lat: number } | null>(null);
    const [editingPolygonId, setEditingPolygonId] = useState<number | null>(null);
    
    // Use refs to prevent state loss during re-renders
    const pendingPolygonPointsRef = useRef<Point[]>([]);
    const isDrawingPolygonRef = useRef<boolean>(false);
    
    // Route node creation state
    const [selectedNodeForConnection, setSelectedNodeForConnection] = useState<number | null>(null);
    const selectedNodeForConnectionRef = useRef<number | null>(null);
    const [lastPlacedNodeId, setLastPlacedNodeId] = useState<number | null>(null);
    const lastPlacedNodeIdRef = useRef<number | null>(null);
    
    // Selection state
    const [selectedItem, setSelectedItem] = useState<{
        type: "polygon" | "beacon" | "node";
        id: number;
    } | null>(null);

    // Update refs when state changes
    const updateRefs = useCallback(() => {
        activeToolRef.current = activeTool;
        pendingPolygonPointsRef.current = pendingPolygonPoints;
        isDrawingPolygonRef.current = isDrawingPolygon;
        selectedNodeForConnectionRef.current = selectedNodeForConnection;
        lastPlacedNodeIdRef.current = lastPlacedNodeId;
    }, [activeTool, pendingPolygonPoints, isDrawingPolygon, selectedNodeForConnection, lastPlacedNodeId]);

    const handleToolChange = useCallback((tool: DrawingTool) => {
        // If switching away from POI tool, clear any polygon drawing state
        if (activeTool === "poi" && tool !== "poi" && isDrawingPolygonRef.current) {
            isDrawingPolygonRef.current = false;
            pendingPolygonPointsRef.current = [];
            setIsDrawingPolygon(false);
            setCurrentPolygonPoints([]);
            setPendingPolygonPoints([]);
        }

        // If switching away from nodes tool, clear node selection state
        if (activeTool === "nodes" && tool !== "nodes") {
            setSelectedNodeForConnection(null);
            setLastPlacedNodeId(null);
            lastPlacedNodeIdRef.current = null;
        }

        setActiveTool(tool);
        activeToolRef.current = tool;
        setSelectedItem(null);
    }, [activeTool]);

    const resetPolygonDrawing = useCallback(() => {
        isDrawingPolygonRef.current = false;
        pendingPolygonPointsRef.current = [];
        setIsDrawingPolygon(false);
        setCurrentPolygonPoints([]);
        setPendingPolygonPoints([]);
        setPendingPolygonCenter(null);
        setEditingPolygonId(null);
    }, []);

    const resetNodeSelection = useCallback(() => {
        setSelectedNodeForConnection(null);
        setLastPlacedNodeId(null);
        selectedNodeForConnectionRef.current = null;
        lastPlacedNodeIdRef.current = null;
    }, []);

    return {
        // State
        activeTool,
        setActiveTool,
        isDrawingPolygon,
        setIsDrawingPolygon,
        currentPolygonPoints,
        setCurrentPolygonPoints,
        pendingPolygonPoints,
        setPendingPolygonPoints,
        pendingPolygonCenter,
        setPendingPolygonCenter,
        editingPolygonId,
        setEditingPolygonId,
        selectedNodeForConnection,
        setSelectedNodeForConnection,
        lastPlacedNodeId,
        setLastPlacedNodeId,
        selectedItem,
        setSelectedItem,
        
        // Refs
        activeToolRef,
        pendingPolygonPointsRef,
        isDrawingPolygonRef,
        selectedNodeForConnectionRef,
        lastPlacedNodeIdRef,
        
        // Methods
        updateRefs,
        handleToolChange,
        resetPolygonDrawing,
        resetNodeSelection
    };
}