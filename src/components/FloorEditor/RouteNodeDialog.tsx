import React from 'react';
import { UI_MESSAGES } from '../../constants/ui';
import { createLogger } from '../../utils/logger';
import { Button, Input } from '../common';

const logger = createLogger('RouteNodeDialog');

interface RouteNodeDialogProps {
  show: boolean;
  nodeName: string;
  isEditing?: boolean;
  level?: number | null;
  onNameChange: (value: string) => void;
  onLevelChange?: (value: number | null) => void;
  onSave: () => void;
  onCancel: () => void;
}

const RouteNodeDialog: React.FC<RouteNodeDialogProps> = ({
  show,
  nodeName,
  isEditing = false,
  level,
  onNameChange,
  onLevelChange,
  onSave,
  onCancel
}) => {
  logger.debug('RouteNodeDialog rendered', { show, nodeName, isEditing, level });

  if (!show) return null;

  const handleLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onLevelChange) {
      const value = e.target.value;
      onLevelChange(value === '' ? null : parseInt(value, 10));
    }
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog-content">
        <h2>{isEditing ? UI_MESSAGES.FLOOR_EDITOR_EDIT_NODE_TITLE : 'Add New Route Node'}</h2>
        <Input
          id="node-name"
          name="node-name"
          label="Node Name"
          value={nodeName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Enter node name"
        />
        <div style={{ marginTop: '16px' }}>
          <label htmlFor="node-level" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
            Level
          </label>
          <select
            id="node-level"
            value={level === null || level === undefined ? '' : level}
            onChange={handleLevelChange}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: 'white'
            }}
          >
            <option value="">None</option>
            <option value="1">Level 1</option>
            <option value="2">Level 2</option>
            <option value="3">Level 3</option>
          </select>
        </div>
        <div className="dialog-buttons">
          <Button variant="SECONDARY" onClick={onCancel}>
            {UI_MESSAGES.FLOOR_EDITOR_EDIT_CANCEL}
          </Button>
          <Button variant="PRIMARY" onClick={onSave} disabled={!nodeName.trim()}>
            {isEditing ? UI_MESSAGES.FLOOR_EDITOR_EDIT_SAVE : 'Add Node'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RouteNodeDialog; 