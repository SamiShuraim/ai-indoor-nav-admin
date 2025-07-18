import React from 'react';
import { UI_MESSAGES } from '../../constants/ui';
import { createLogger } from '../../utils/logger';
import { Button, Input } from '../common';

const logger = createLogger('PolygonDialog');

interface PolygonDialogProps {
  show: boolean;
  polygonName: string;
  isWallMode: boolean;
  isEditing?: boolean;
  onNameChange: (value: string) => void;
  onWallModeChange: (isWall: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
}

const PolygonDialog: React.FC<PolygonDialogProps> = ({
  show,
  polygonName,
  isWallMode,
  isEditing = false,
  onNameChange,
  onWallModeChange,
  onSave,
  onCancel
}) => {
  logger.debug('PolygonDialog rendered', { show, polygonName, isWallMode });

  if (!show) return null;

  return (
    <div className="dialog-overlay">
      <div className="dialog-content">
        <h2>{isEditing ? UI_MESSAGES.FLOOR_EDITOR_POLYGON_EDIT_TITLE : UI_MESSAGES.FLOOR_EDITOR_POLYGON_DIALOG_TITLE}</h2>
        <Input
          id="polygon-name"
          name="polygon-name"
          label={UI_MESSAGES.FLOOR_EDITOR_POLYGON_NAME_LABEL}
          value={polygonName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={UI_MESSAGES.FLOOR_EDITOR_POLYGON_NAME_PLACEHOLDER}
        />
        <div className="dialog-checkbox">
          <label>
            <input 
              type="checkbox" 
              checked={isWallMode}
              onChange={(e) => onWallModeChange(e.target.checked)}
            />
            {UI_MESSAGES.FLOOR_EDITOR_POLYGON_IS_WALL_LABEL}
          </label>
        </div>
        <div className="dialog-buttons">
          <Button variant="SECONDARY" onClick={onCancel}>
            {UI_MESSAGES.FLOOR_EDITOR_POLYGON_CANCEL}
          </Button>
          <Button variant="PRIMARY" onClick={onSave} disabled={!polygonName.trim()}>
            {UI_MESSAGES.FLOOR_EDITOR_POLYGON_SAVE}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PolygonDialog; 