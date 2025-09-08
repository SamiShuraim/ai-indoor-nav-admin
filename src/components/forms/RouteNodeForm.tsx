import React, {useState} from 'react';
import {createLogger} from '../../utils/logger';
import Button from '../common/Button';
import Card from '../common/Card';
import Input from '../common/Input';
import './RouteNodeForm.css';
import {RouteNode} from "../../interfaces/RouteNode";

const logger = createLogger('RouteNodeForm');

interface RouteNodeFormProps {
  routeNode?: RouteNode | null;
  floorId: number;
  onSave: (routeNode: Omit<RouteNode, 'properties'> & { properties: Omit<RouteNode['properties'], 'id' | 'created_at' | 'updated_at'> }) => Promise<void>;
  onUpdate: (id: number, routeNode: Partial<Omit<RouteNode, 'properties'> & { properties: Partial<Omit<RouteNode['properties'], 'id' | 'created_at' | 'updated_at'>> }>) => Promise<void>;
  onCancel: () => void;
}

interface RouteNodeFormData {
  nodeType: string;
  x: number;
  y: number;
  isVisible: boolean;
}

const NODE_TYPES = [
  'waypoint',
  'entrance',
  'exit',
  'junction',
  'stairs',
  'elevator',
  'escalator',
  'door',
  'landmark',
  'checkpoint'
] as const;

const RouteNodeForm: React.FC<RouteNodeFormProps> = ({ routeNode, floorId, onSave, onUpdate, onCancel }) => {
  const [formData, setFormData] = useState<RouteNodeFormData>({
    nodeType: 'waypoint',
    x: 0,
    y: 0,
    isVisible: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

    const isEditing = !!routeNode?.properties.id;

  // // Initialize form data when editing
  // useEffect(() => {
  //   if (routeNode) {
  //     setFormData({
  //       nodeType: routeNode.nodeType || 'waypoint',
  //       x: routeNode.x || 0,
  //       y: routeNode.y || 0,
  //       isVisible: routeNode.isVisible ?? true
  //     });
  //   }
  // }, [routeNode]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!NODE_TYPES.includes(formData.nodeType as any)) {
      newErrors.nodeType = 'Invalid node type';
    }

    if (formData.x < -180 || formData.x > 180) {
      newErrors.x = 'X coordinate must be between -180 and 180';
    }

    if (formData.y < -90 || formData.y > 90) {
      newErrors.y = 'Y coordinate must be between -90 and 90';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof RouteNodeFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    //   try {
    //     const routeNodeData = {
    //       floorId,
    //       nodeType: formData.nodeType,
    //       x: formData.x,
    //       y: formData.y,
    //       isVisible: formData.isVisible
    //     };
    //
    //     if (isEditing && routeNode?.id) {
    //       await onUpdate(routeNode.id, routeNodeData);
    //       logger.info('Route node updated successfully', { nodeId: routeNode.id });
    //     } else {
    //       await onSave(routeNodeData);
    //       logger.info('Route node created successfully');
    //     }
    //   } catch (error) {
    //     logger.error('Failed to save route node', error as Error);
    //   } finally {
    //     setIsSubmitting(false);
    //   }
  };

  const handleCancel = () => {
    if (isSubmitting) return;
    onCancel();
  };

  const getNodeTypeDescription = (type: string): string => {
    const descriptions: Record<string, string> = {
      waypoint: 'General navigation point',
      entrance: 'Building or area entrance',
      exit: 'Building or area exit',
      junction: 'Path intersection point',
      stairs: 'Staircase location',
      elevator: 'Elevator location',
      escalator: 'Escalator location',
      door: 'Door or gateway',
      landmark: 'Notable reference point',
      checkpoint: 'Navigation checkpoint'
    };
    return descriptions[type] || 'Navigation node';
  };

  return (
    <Card className="route-node-form-card" title={isEditing ? 'Edit Route Node' : 'Create New Route Node'}>
      <div className="route-node-form-header">
        <h2>{isEditing ? 'Edit Route Node' : 'Create New Route Node'}</h2>
        <Button variant="SECONDARY" onClick={handleCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="route-node-form">
        <div className="form-section">
          <h3>Node Configuration</h3>
          
          <div className="form-group">
            <label htmlFor="nodeType">Node Type *</label>
            <select
              id="nodeType"
              value={formData.nodeType}
              onChange={(e) => handleInputChange('nodeType', e.target.value)}
              className={errors.nodeType ? 'error' : ''}
            >
              {NODE_TYPES.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
            {errors.nodeType && <span className="error-message">{errors.nodeType}</span>}
            <div className="field-description">
              {getNodeTypeDescription(formData.nodeType)}
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.isVisible}
                onChange={(e) => handleInputChange('isVisible', e.target.checked)}
              />
              <span className="checkmark"></span>
              Visible on map
            </label>
          </div>
        </div>

        <div className="form-section">
          <h3>Location</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="x">X Coordinate (Longitude) *</label>
              <Input
                id="x"
                name="x"
                label="X Coordinate"
                type="number"
                value={formData.x.toString()}
                onChange={(e) => handleInputChange('x', parseFloat(e.target.value) || 0)}
                placeholder="Enter X coordinate"
                error={errors.x}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="y">Y Coordinate (Latitude) *</label>
              <Input
                id="y"
                name="y"
                label="Y Coordinate"
                type="number"
                value={formData.y.toString()}
                onChange={(e) => handleInputChange('y', parseFloat(e.target.value) || 0)}
                placeholder="Enter Y coordinate"
                error={errors.y}
                required
              />
            </div>
          </div>

          <div className="coordinate-help">
            <p>
              <strong>Coordinate Format:</strong> Use decimal degrees (e.g., 50.142200, 26.313300)
            </p>
            <p>
              <strong>Range:</strong> X: -180 to 180, Y: -90 to 90
            </p>
          </div>
        </div>

        <div className="form-section">
          <h3>Node Information</h3>
          
          <div className="node-info">
            <div className="info-item">
              <span className="info-label">Node ID:</span>
                <span className="info-value">{isEditing ? routeNode?.properties.id : 'Will be assigned'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Floor ID:</span>
              <span className="info-value">{floorId}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Created:</span>
              <span className="info-value">
                {isEditing && routeNode?.properties.created_at
                  ? new Date(routeNode.properties.created_at).toLocaleString()
                  : 'Will be set on creation'
                }
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Last Updated:</span>
              <span className="info-value">
                {isEditing && routeNode?.properties.updated_at
                  ? new Date(routeNode.properties.updated_at).toLocaleString()
                  : 'Will be set on creation'
                }
              </span>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="submit-button"
          >
            {isSubmitting ? 'Saving...' : (isEditing ? 'Update Node' : 'Create Node')}
          </Button>
          
          <Button
            type="button"
            variant="SECONDARY"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default RouteNodeForm; 