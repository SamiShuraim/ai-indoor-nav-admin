import { useState, useCallback } from "react";

export interface DialogState {
    // Polygon dialog
    showPolygonDialog: boolean;
    polygonName: string;
    
    // Beacon dialog
    showBeaconDialog: boolean;
    beaconName: string;
    pendingBeaconLocation: { lng: number; lat: number } | null;
    editingBeaconId: number | null;
    
    // Node dialog
    showNodeDialog: boolean;
    nodeName: string;
    editingNodeId: number | null;
    nodeLevel: number | null;
    
    // Multi-floor node dialog
    showMultiFloorNodeDialog: boolean;
    pendingMultiFloorLocation: { lng: number; lat: number } | null;
    
    // Save status
    saveStatus: "idle" | "saving" | "success" | "error";
    saveError: string | null;
}

export function useDialogState() {
    // Polygon dialog state
    const [showPolygonDialog, setShowPolygonDialog] = useState(false);
    const [polygonName, setPolygonName] = useState("");
    
    // Beacon dialog state
    const [showBeaconDialog, setShowBeaconDialog] = useState(false);
    const [beaconName, setBeaconName] = useState("");
    const [pendingBeaconLocation, setPendingBeaconLocation] = useState<{
        lng: number;
        lat: number;
    } | null>(null);
    const [editingBeaconId, setEditingBeaconId] = useState<number | null>(null);
    
    // Node dialog state
    const [showNodeDialog, setShowNodeDialog] = useState(false);
    const [nodeName, setNodeName] = useState("");
    const [editingNodeId, setEditingNodeId] = useState<number | null>(null);
    const [nodeLevel, setNodeLevel] = useState<number | null>(null);
    
    // Multi-floor node dialog state
    const [showMultiFloorNodeDialog, setShowMultiFloorNodeDialog] = useState(false);
    const [pendingMultiFloorLocation, setPendingMultiFloorLocation] = useState<{
        lng: number;
        lat: number;
    } | null>(null);
    
    // Save status
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
    const [saveError, setSaveError] = useState<string | null>(null);

    // Dialog handlers
    const openPolygonDialog = useCallback((name: string = "", editingId: number | null = null) => {
        setPolygonName(name);
        setEditingBeaconId(editingId);
        setShowPolygonDialog(true);
    }, []);

    const closePolygonDialog = useCallback(() => {
        setShowPolygonDialog(false);
        setPolygonName("");
        setEditingBeaconId(null);
    }, []);

    const openBeaconDialog = useCallback((name: string = "", location: { lng: number; lat: number } | null = null, editingId: number | null = null) => {
        setBeaconName(name);
        setPendingBeaconLocation(location);
        setEditingBeaconId(editingId);
        setShowBeaconDialog(true);
    }, []);

    const closeBeaconDialog = useCallback(() => {
        setShowBeaconDialog(false);
        setBeaconName("");
        setPendingBeaconLocation(null);
        setEditingBeaconId(null);
    }, []);

    const openNodeDialog = useCallback((name: string = "", editingId: number | null = null, level: number | null = null) => {
        setNodeName(name);
        setEditingNodeId(editingId);
        setNodeLevel(level);
        setShowNodeDialog(true);
    }, []);

    const closeNodeDialog = useCallback(() => {
        setShowNodeDialog(false);
        setNodeName("");
        setEditingNodeId(null);
        setNodeLevel(null);
    }, []);

    const openMultiFloorNodeDialog = useCallback((location: { lng: number; lat: number }) => {
        setPendingMultiFloorLocation(location);
        setShowMultiFloorNodeDialog(true);
    }, []);

    const closeMultiFloorNodeDialog = useCallback(() => {
        setShowMultiFloorNodeDialog(false);
        setPendingMultiFloorLocation(null);
    }, []);

    const updateSaveStatus = useCallback((status: "idle" | "saving" | "success" | "error", error: string | null = null) => {
        setSaveStatus(status);
        setSaveError(error);
        
        if (status === "success") {
            setTimeout(() => setSaveStatus("idle"), 2000);
        }
    }, []);

    return {
        // Polygon dialog
        showPolygonDialog,
        setShowPolygonDialog,
        polygonName,
        setPolygonName,
        openPolygonDialog,
        closePolygonDialog,
        
        // Beacon dialog
        showBeaconDialog,
        setShowBeaconDialog,
        beaconName,
        setBeaconName,
        pendingBeaconLocation,
        setPendingBeaconLocation,
        editingBeaconId,
        setEditingBeaconId,
        openBeaconDialog,
        closeBeaconDialog,
        
        // Node dialog
        showNodeDialog,
        setShowNodeDialog,
        nodeName,
        setNodeName,
        editingNodeId,
        setEditingNodeId,
        nodeLevel,
        setNodeLevel,
        openNodeDialog,
        closeNodeDialog,
        
        // Multi-floor node dialog
        showMultiFloorNodeDialog,
        setShowMultiFloorNodeDialog,
        pendingMultiFloorLocation,
        setPendingMultiFloorLocation,
        openMultiFloorNodeDialog,
        closeMultiFloorNodeDialog,
        
        // Save status
        saveStatus,
        setSaveStatus,
        saveError,
        setSaveError,
        updateSaveStatus
    };
}