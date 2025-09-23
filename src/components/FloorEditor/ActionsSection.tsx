import React from 'react';
import {createLogger} from '../../utils/logger';

const logger = createLogger('ActionsSection');

interface ActionsSectionProps {
  // POI recalculate button props
  floorId: number;
  onRecalculatePoiNodes: () => void;
  isRecalculatingPoiNodes: boolean;
}

const ActionsSection: React.FC<ActionsSectionProps> = ({
  floorId,
  onRecalculatePoiNodes,
  isRecalculatingPoiNodes
}) => {
  logger.debug('ActionsSection rendered', { 
    floorId 
  });

  return (
    <div className="actions-section">
      <h3 className="actions-title">Actions</h3>
      <div className="actions-buttons">
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