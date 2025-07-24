import React from 'react';
import { UI_MESSAGES } from '../../constants/ui';
import { createLogger } from '../../utils/logger';
import { Button, Input } from '../common';

const logger = createLogger('RouteNodeDialog');

interface RouteNodeDialogProps {
  show: boolean;
  nodeName: string;
  isEditing?: boolean;
  onNameChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const RouteNodeDialog: React.FC<RouteNodeDialogProps> = ({
  show,
  nodeName,
  isEditing = false,
  onNameChange,
  onSave,
  onCancel
}) => {
  logger.debug('RouteNodeDialog rendered', { show, nodeName, isEditing });

  if (!show) return null;

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