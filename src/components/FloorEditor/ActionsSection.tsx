import React from 'react';
import {createLogger} from '../../utils/logger';

const logger = createLogger('ActionsSection');

interface ActionsSectionProps {
  // Bidirectional button props
  nodesCount: number;
  isBidirectionalFixed: boolean;
  hasNewNodesAdded: boolean;
  onFixBidirectional: () => void;
  isFixingBidirectional: boolean;
  
  // POI recalculate button props
  floorId: number;
  onRecalculatePoiNodes: () => void;
  isRecalculatingPoiNodes: boolean;
}

const ActionsSection: React.FC<ActionsSectionProps> = ({
  nodesCount,
  isBidirectionalFixed,
  hasNewNodesAdded,
  onFixBidirectional,
  isFixingBidirectional,
  floorId,
  onRecalculatePoiNodes,
  isRecalculatingPoiNodes
}) => {
  logger.debug('ActionsSection rendered', { 
    nodesCount, 
    isBidirectionalFixed, 
    hasNewNodesAdded, 
    floorId 
  });

  return (
    <div className="actions-section">
      <h3 className="actions-title">Actions</h3>
      <div className="actions-buttons">
        {/* Bidirectional Connections Button */}
        {nodesCount > 0 && (
          <button
            className={`action-button bidirectional-button ${
              hasNewNodesAdded && !isBidirectionalFixed ? 'needs-fixing' : 
              isBidirectionalFixed ? 'fixed' : 'neutral'
            }`}
            onClick={onFixBidirectional}
            disabled={isFixingBidirectional}
            title={
              hasNewNodesAdded && !isBidirectionalFixed 
                ? 'Fix bidirectional connections (new nodes added)'
                : isBidirectionalFixed 
                ? 'Connections are bidirectional'
                : 'Make all connections bidirectional'
            }
          >
            <span className="action-icon">
              {isFixingBidirectional ? '⏳' : hasNewNodesAdded && !isBidirectionalFixed ? '⚠️' : '✅'}
            </span>
            <span className="action-text">
              {isFixingBidirectional ? 'Fixing...' : 'Fix Bidirectional'}
            </span>
          </button>
        )}

        {/* Calculate Nearest Nodes for POIs Button */}
        <button
          className="action-button recalculate-button"
          onClick={onRecalculatePoiNodes}
          disabled={isRecalculatingPoiNodes}
          title="Recalculate closest nodes for all POIs on this floor"
        >
          <span className="action-icon">
            {isRecalculatingPoiNodes ? '⏳' : '🎯'}
          </span>
          <span className="action-text">
            {isRecalculatingPoiNodes ? 'Calculating...' : 'Calculate POI Nodes'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default ActionsSection;