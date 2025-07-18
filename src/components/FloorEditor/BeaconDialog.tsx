import React from 'react';
import { createLogger } from '../../utils/logger';
import { Button, Input } from '../common';

const logger = createLogger('BeaconDialog');

interface BeaconDialogProps {
  show: boolean;
  beaconName: string;
  onNameChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const BeaconDialog: React.FC<BeaconDialogProps> = ({
  show,
  beaconName,
  onNameChange,
  onSave,
  onCancel
}) => {
  logger.debug('BeaconDialog rendered', { show, beaconName });

  if (!show) return null;

  return (
    <div className="dialog-overlay">
      <div className="dialog-content">
        <h2>Add New Beacon</h2>
        <Input
          id="beacon-name"
          name="beacon-name"
          label="Beacon Name"
          value={beaconName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Enter beacon name"
        />
        <div className="dialog-buttons">
          <Button variant="SECONDARY" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="PRIMARY" onClick={onSave} disabled={!beaconName.trim()}>
            Add Beacon
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BeaconDialog; 