import React from 'react';
import { UI_MESSAGES } from '../../constants/ui';
import { createLogger } from '../../utils/logger';
import { Button } from '../common';

const logger = createLogger('DrawingToolbar');

// Drawing tool types
export type DrawingTool = 'select' | 'pan' | 'poi' | 'beacons' | 'nodes';

interface DrawingToolbarProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  isDrawingPolygon: boolean;
  pendingPolygonPoints: number;
  onCancelDrawing: () => void;
  onClearAll: () => void;
}

const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  activeTool,
  onToolChange,
  isDrawingPolygon,
  pendingPolygonPoints,
  onCancelDrawing,
  onClearAll
}) => {
  logger.debug('DrawingToolbar rendered', { activeTool, isDrawingPolygon, pendingPolygonPoints });

  return (
    <div className="drawing-toolbar">
      {/* Tool instruction message */}
      {activeTool !== 'select' && activeTool !== 'pan' && (
        <div className="tool-instruction">
          {activeTool === 'poi' && !isDrawingPolygon && '📍 Click on the map to start drawing a polygon'}
          {activeTool === 'poi' && isDrawingPolygon && `📍 Drawing polygon (${pendingPolygonPoints} points). Click near start to finish.`}
          {activeTool === 'beacons' && '📡 Click on the map to add beacons'}
          {activeTool === 'nodes' && '🔗 Click on the map to add route nodes'}
        </div>
      )}
      
      <div className="tool-group">
        <button 
          className={`tool-button ${activeTool === 'select' ? 'active' : ''}`}
          onClick={() => onToolChange('select')}
          title={UI_MESSAGES.FLOOR_EDITOR_SELECT_MODE}
        >
          <span className="tool-icon">🖱️</span>
          Select
        </button>
        
        <button 
          className={`tool-button ${activeTool === 'pan' ? 'active' : ''}`}
          onClick={() => onToolChange('pan')}
          title={UI_MESSAGES.FLOOR_EDITOR_PAN_MODE}
        >
          <span className="tool-icon">✋</span>
          Pan
        </button>
        
        <button 
          className={`tool-button ${activeTool === 'poi' ? 'active' : ''}`}
          onClick={() => onToolChange('poi')}
          title={UI_MESSAGES.FLOOR_EDITOR_TOOL_POI}
        >
          <span className="tool-icon">📍</span>
          {UI_MESSAGES.FLOOR_EDITOR_TOOL_POI}
        </button>
        
        <button 
          className={`tool-button ${activeTool === 'beacons' ? 'active' : ''}`}
          onClick={() => onToolChange('beacons')}
          title={UI_MESSAGES.FLOOR_EDITOR_TOOL_BEACONS}
        >
          <span className="tool-icon">📡</span>
          {UI_MESSAGES.FLOOR_EDITOR_TOOL_BEACONS}
        </button>
        
        <button 
          className={`tool-button ${activeTool === 'nodes' ? 'active' : ''}`}
          onClick={() => onToolChange('nodes')}
          title={UI_MESSAGES.FLOOR_EDITOR_TOOL_NODES}
        >
          <span className="tool-icon">🔗</span>
          {UI_MESSAGES.FLOOR_EDITOR_TOOL_NODES}
        </button>
      </div>

      <div className="tool-group">
        {isDrawingPolygon && (
          <Button variant="SECONDARY" onClick={onCancelDrawing}>
            Cancel Drawing
          </Button>
        )}
        <Button variant="DANGER" onClick={onClearAll}>
          {UI_MESSAGES.FLOOR_EDITOR_CLEAR_ALL}
        </Button>
      </div>
    </div>
  );
};

export default DrawingToolbar; 