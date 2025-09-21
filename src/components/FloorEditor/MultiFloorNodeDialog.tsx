import React, { useState, useEffect } from 'react';
import { createLogger } from '../../utils/logger';
import { Button } from '../common';
import { Floor } from '../../interfaces/Floor';
import './MultiFloorNodeDialog.css';

const logger = createLogger('MultiFloorNodeDialog');

export type NodeType = 'elevator' | 'stairs';

interface MultiFloorNodeDialogProps {
  show: boolean;
  currentFloorId: number;
  availableFloors: Floor[];
  onSave: (nodeType: NodeType, selectedFloors: number[]) => void;
  onCancel: () => void;
}

const MultiFloorNodeDialog: React.FC<MultiFloorNodeDialogProps> = ({
  show,
  currentFloorId,
  availableFloors,
  onSave,
  onCancel
}) => {
  const [nodeType, setNodeType] = useState<NodeType>('elevator');
  const [selectedFloors, setSelectedFloors] = useState<Set<number>>(new Set([currentFloorId]));

  useEffect(() => {
    if (show) {
      // Reset state when dialog opens
      setNodeType('elevator');
      setSelectedFloors(new Set([currentFloorId]));
    }
  }, [show, currentFloorId]);

  logger.debug('MultiFloorNodeDialog rendered', { 
    show, 
    nodeType, 
    selectedFloors: Array.from(selectedFloors),
    availableFloors: availableFloors.length 
  });

  if (!show) return null;

  const handleFloorToggle = (floorId: number) => {
    const newSelectedFloors = new Set(selectedFloors);
    if (newSelectedFloors.has(floorId)) {
      // Don't allow unchecking the current floor
      if (floorId !== currentFloorId) {
        newSelectedFloors.delete(floorId);
      }
    } else {
      newSelectedFloors.add(floorId);
    }
    setSelectedFloors(newSelectedFloors);
  };

  const handleSave = () => {
    const floorsArray = Array.from(selectedFloors);
    logger.userAction('Multi-floor node creation initiated', {
      nodeType,
      selectedFloors: floorsArray,
      currentFloorId
    });
    onSave(nodeType, floorsArray);
  };

  const sortedFloors = [...availableFloors].sort((a, b) => a.floorNumber - b.floorNumber);

  return (
    <div className="dialog-overlay">
      <div className="dialog-content">
        <h2>Create Multi-Floor Node</h2>
        
        <div className="form-section">
          <h3>Node Type</h3>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                value="elevator"
                checked={nodeType === 'elevator'}
                onChange={(e) => setNodeType(e.target.value as NodeType)}
              />
              <span className="radio-icon">🛗</span>
              Elevator
            </label>
            <label className="radio-label">
              <input
                type="radio"
                value="stairs"
                checked={nodeType === 'stairs'}
                onChange={(e) => setNodeType(e.target.value as NodeType)}
              />
              <span className="radio-icon">🚶</span>
              Stairs
            </label>
          </div>
        </div>

        <div className="form-section">
          <h3>Select Floors</h3>
          <p className="form-description">
            Choose which floors this {nodeType} should connect. 
            Current floor ({availableFloors.find(f => f.id === currentFloorId)?.name}) is required.
          </p>
          <div className="floor-selection">
            {sortedFloors.map((floor) => (
              <label key={floor.id} className="floor-checkbox">
                <input
                  type="checkbox"
                  checked={selectedFloors.has(floor.id)}
                  onChange={() => handleFloorToggle(floor.id)}
                  disabled={floor.id === currentFloorId}
                />
                <span className="checkmark"></span>
                <span className="floor-info">
                  <strong>{floor.name}</strong>
                  {floor.id === currentFloorId && <span className="current-floor"> (Current)</span>}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="dialog-buttons">
          <Button variant="SECONDARY" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            variant="PRIMARY" 
            onClick={handleSave} 
            disabled={selectedFloors.size < 2}
          >
            Create {nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} Nodes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MultiFloorNodeDialog;