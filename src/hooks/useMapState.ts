import { useRef, useState, useCallback } from "react";
import { Map, Marker } from "@maptiler/sdk";
import { MapMarker } from "../types/common";

export interface MapState {
    mapLoading: boolean;
    mapLoadedSuccessfully: boolean;
    currentCoordinates: { lng: number; lat: number } | null;
}

export interface MapRefs {
    mapMarkers: React.MutableRefObject<{ [key: string]: Marker }>;
    mapLayers: React.MutableRefObject<{ [key: string]: string }>;
    mapSources: React.MutableRefObject<{ [key: string]: string }>;
    tempDrawingMarkers: React.MutableRefObject<Marker[]>;
    tempDrawingLines: React.MutableRefObject<{ [key: string]: string }>;
    mapLoadTimeout: React.MutableRefObject<NodeJS.Timeout | null>;
    coordinateUpdateTimeout: React.MutableRefObject<NodeJS.Timeout | null>;
}

export function useMapState() {
    // Map state
    const [mapLoading, setMapLoading] = useState(true);
    const [mapLoadedSuccessfully, setMapLoadedSuccessfully] = useState(false);
    const [currentCoordinates, setCurrentCoordinates] = useState<{
        lng: number;
        lat: number;
    } | null>(null);

    // Map references
    const mapMarkers = useRef<{ [key: string]: Marker }>({});
    const mapLayers = useRef<{ [key: string]: string }>({});
    const mapSources = useRef<{ [key: string]: string }>({});
    const tempDrawingMarkers = useRef<Marker[]>([]);
    const tempDrawingLines = useRef<{ [key: string]: string }>({});
    const mapLoadTimeout = useRef<NodeJS.Timeout | null>(null);
    const coordinateUpdateTimeout = useRef<NodeJS.Timeout | null>(null);

    // Memoized coordinate update function
    const updateCoordinates = useCallback((lng: number, lat: number) => {
        setCurrentCoordinates({
            lng: Number(lng.toFixed(6)),
            lat: Number(lat.toFixed(6)),
        });
    }, []);

    const clearMapRefs = useCallback(() => {
        // Clear existing markers and layers
        Object.values(mapMarkers.current).forEach((marker) => {
            if (marker && typeof marker.remove === 'function') {
                try {
                    marker.remove();
                } catch (error) {
                    console.warn('Error removing marker:', error);
                }
            }
        });
        mapMarkers.current = {};
        mapLayers.current = {};
        mapSources.current = {};
    }, []);

    const clearTempDrawing = useCallback((map: Map | null) => {
        if (!map) return;

        // Remove temporary markers
        tempDrawingMarkers.current.forEach((marker) => {
            if (marker && typeof marker.remove === 'function') {
                try {
                    marker.remove();
                } catch (error) {
                    console.warn('Error removing temp marker:', error);
                }
            }
        });
        tempDrawingMarkers.current = [];

        // Remove temporary lines
        Object.entries(tempDrawingLines.current).forEach(([layerId, sourceId]) => {
            if (map.getLayer(layerId)) {
                map.removeLayer(layerId);
            }
            if (map.getSource(sourceId)) {
                map.removeSource(sourceId);
            }
        });
        tempDrawingLines.current = {};
    }, []);

    const cleanup = useCallback(() => {
        // Clean up timeouts
        if (mapLoadTimeout.current) {
            clearTimeout(mapLoadTimeout.current);
            mapLoadTimeout.current = null;
        }

        if (coordinateUpdateTimeout.current) {
            clearTimeout(coordinateUpdateTimeout.current);
            coordinateUpdateTimeout.current = null;
        }
    }, []);

    return {
        // State
        mapLoading,
        setMapLoading,
        mapLoadedSuccessfully,
        setMapLoadedSuccessfully,
        currentCoordinates,
        updateCoordinates,
        
        // Refs
        mapMarkers,
        mapLayers,
        mapSources,
        tempDrawingMarkers,
        tempDrawingLines,
        mapLoadTimeout,
        coordinateUpdateTimeout,
        
        // Methods
        clearMapRefs,
        clearTempDrawing,
        cleanup
    };
}