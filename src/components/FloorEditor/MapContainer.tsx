import React from 'react';
import { UI_MESSAGES } from '../../constants/ui';
import { createLogger } from '../../utils/logger';
import { DrawingTool } from './DrawingToolbar';

const logger = createLogger('MapContainer');

interface MapContainerProps {
  mapRef: React.RefObject<HTMLDivElement>;
  mapLoading: boolean;
  activeTool: DrawingTool;
  currentCoordinates: { lng: number; lat: number } | null;
  error: string | null;
}

const MapContainer: React.FC<MapContainerProps> = ({
  mapRef,
  mapLoading,
  activeTool,
  currentCoordinates,
  error
}) => {
  logger.debug('MapContainer rendered', { 
    mapLoading, 
    activeTool,
    hasCoordinates: !!currentCoordinates,
    hasError: !!error
  });

  return (
    <div className="map-container">
      {mapLoading && (
        <div className="map-loading-overlay">
          <div className="loading-message">{UI_MESSAGES.FLOOR_EDITOR_MAP_LOADING}</div>
        </div>
      )}
      
      {error && (
        <div className="map-error-overlay">
          <div className="error-message">{error}</div>
        </div>
      )}
      
      <div ref={mapRef} className={`map-wrapper tool-${activeTool}`} />
      
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
  );
};

export default MapContainer; 