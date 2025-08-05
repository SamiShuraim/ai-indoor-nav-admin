import React, {useEffect, useState} from 'react';
import {beaconTypesApi} from '../../utils/api';
import {createLogger} from '../../utils/logger';
import Button from '../common/Button';
import Card from '../common/Card';
import Input from '../common/Input';
import './BeaconForm.css';
import {BeaconType} from "../../interfaces/BeaconType";
import {Beacon} from "../../interfaces/Beacon";

const logger = createLogger('BeaconForm');

interface BeaconFormProps {
  beacon?: Beacon | null;
  floorId: number;
  onSave: (beacon: Omit<Beacon, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdate: (id: number, beacon: Partial<Omit<Beacon, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  onCancel: () => void;
}

interface BeaconFormData {
  name: string;
  uuid: string;
  majorId: number | null;
  minorId: number | null;
  beaconTypeId: number | null;
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [x, y] as [longitude, latitude]
  } | null;
  isVisible: boolean;
  batteryLevel: number | null;
}

const BeaconForm: React.FC<BeaconFormProps> = ({ beacon, floorId, onSave, onUpdate, onCancel }) => {
  const [formData, setFormData] = useState<BeaconFormData>({
    name: '',
    uuid: '',
    majorId: null,
    minorId: null,
    beaconTypeId: null,
    geometry: null,
    isVisible: true,
    batteryLevel: null,
  });

  const [beaconTypes, setBeaconTypes] = useState<BeaconType[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!beacon?.properties.id;

  // Load beacon types on component mount
  useEffect(() => {
    loadBeaconTypes();
  }, []);

  // Initialize form data when editing
  useEffect(() => {
    if (beacon) {
      const b = beacon.properties;
      setFormData({
        name: b.name || '',
        uuid: b.uuid || '',
        majorId: b.majorId || null,
        minorId: b.minorId || null,
        beaconTypeId: b.beaconTypeId || null,
        geometry: beacon.geometry || null,
        isVisible: b.isVisible ?? true,
        batteryLevel: b.batteryLevel || null,
      });
    }
  }, [beacon]);

  const loadBeaconTypes = async () => {
    try {
      setLoading(true);
      const typesData = await beaconTypesApi.getAll();
      setBeaconTypes(typesData);
      logger.info('Beacon types loaded', { count: typesData.length });
    } catch (error) {
      logger.error('Failed to load beacon types', error as Error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.name.length > 255) {
      newErrors.name = 'Name must be less than 255 characters';
    }

    // UUID validation (optional but if provided, must be valid format)
    if (formData.uuid && !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(formData.uuid)) {
      newErrors.uuid = 'UUID must be in valid format (e.g., 123e4567-e89b-12d3-a456-426614174000)';
    }

    // Major ID validation
    if (formData.majorId !== null && (formData.majorId < 0 || formData.majorId > 65535)) {
      newErrors.majorId = 'Major ID must be between 0 and 65535';
    }

    // Minor ID validation
    if (formData.minorId !== null && (formData.minorId < 0 || formData.minorId > 65535)) {
      newErrors.minorId = 'Minor ID must be between 0 and 65535';
    }

    // Battery level validation
    if (formData.batteryLevel !== null && (formData.batteryLevel < 0 || formData.batteryLevel > 100)) {
      newErrors.batteryLevel = 'Battery level must be between 0 and 100';
    }

    // // Installation date validation
    // if (formData.installationDate && !/^\d{4}-\d{2}-\d{2}$/.test(formData.installationDate)) {
    //   newErrors.installationDate = 'Installation date must be in YYYY-MM-DD format';
    // }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof BeaconFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const generateUUID = () => {
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    handleInputChange('uuid', uuid);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    //   e.preventDefault();
    //
    //   if (!validateForm()) {
    //     return;
    //   }
    //
    //   setIsSubmitting(true);
    //
    //   try {
    //     const beaconData = {
    //       floorId,
    //       name: formData.name.trim(),
    //       uuid: formData.uuid.trim() || undefined,
    //       majorId: formData.majorId || undefined,
    //       minorId: formData.minorId || undefined,
    //       beaconTypeId: formData.beaconTypeId || undefined,
    //       geometry: formData.geometry || undefined,
    //       isVisible: formData.isVisible,
    //       batteryLevel: formData.batteryLevel || undefined,
    //     };
    //
    //     if (isEditing && beacon?.id) {
    //       await onUpdate(beacon.id, beaconData);
    //       logger.info('Beacon updated successfully', { beaconId: beacon.id });
    //     } else {
    //       await onSave(beaconData);
    //       logger.info('Beacon created successfully');
    //     }
    //   } catch (error) {
    //     logger.error('Failed to save beacon', error as Error);
    //   } finally {
    //     setIsSubmitting(false);
    //   }
  };

  const handleCancel = () => {
    if (isSubmitting) return;
    onCancel();
  };

  return (
    <Card className="beacon-form-card" title={isEditing ? 'Edit Beacon' : 'Create New Beacon'}>
      <div className="beacon-form-header">
        <h2>{isEditing ? 'Edit Beacon' : 'Create New Beacon'}</h2>
        <Button variant="SECONDARY" onClick={handleCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="beacon-form">
        <div className="form-section">
          <h3>Basic Information</h3>
          
          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <Input
              id="name"
              name="name"
              label="Name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter beacon name"
              error={errors.name}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="beaconType">Beacon Type</label>
            <select
              id="beaconType"
              value={formData.beaconTypeId || ''}
              onChange={(e) => handleInputChange('beaconTypeId', e.target.value ? parseInt(e.target.value) : null)}
              disabled={loading}
            >
              <option value="">Select a beacon type</option>
              {beaconTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-section">
          <h3>iBeacon Configuration</h3>
          
          <div className="form-group">
            <label htmlFor="uuid">UUID</label>
            <div className="uuid-input-group">
              <Input
                id="uuid"
                name="uuid"
                label="UUID"
                type="text"
                value={formData.uuid}
                onChange={(e) => handleInputChange('uuid', e.target.value)}
                placeholder="Enter UUID (e.g., 123e4567-e89b-12d3-a456-426614174000)"
                error={errors.uuid}
              />
              <Button
                type="button"
                variant="SECONDARY"
                onClick={generateUUID}
                className="generate-uuid-btn"
              >
                Generate
              </Button>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="majorId">Major ID</label>
              <Input
                id="majorId"
                name="majorId"
                label="Major ID"
                type="number"
                value={formData.majorId?.toString() || ''}
                onChange={(e) => handleInputChange('majorId', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Enter major ID (0-65535)"
                error={errors.majorId}
              />
            </div>

            <div className="form-group">
              <label htmlFor="minorId">Minor ID</label>
              <Input
                id="minorId"
                name="minorId"
                label="Minor ID"
                type="number"
                value={formData.minorId?.toString() || ''}
                onChange={(e) => handleInputChange('minorId', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Enter minor ID (0-65535)"
                error={errors.minorId}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Location</h3>

          {/*<div className="form-row">*/}
          {/*  <div className="form-group">*/}
          {/*    <label htmlFor="x">X Coordinate (Longitude) *</label>*/}
          {/*    <Input*/}
          {/*      id="x"*/}
          {/*      name="x"*/}
          {/*      label="X Coordinate"*/}
          {/*      type="number"*/}
          {/*      value={formData.x.toString()}*/}
          {/*      onChange={(e) => handleInputChange('x', parseFloat(e.target.value) || 0)}*/}
          {/*      placeholder="Enter X coordinate"*/}
          {/*      error={errors.x}*/}
          {/*      required*/}
          {/*    />*/}
          {/*  </div>*/}

          {/*  <div className="form-group">*/}
          {/*    <label htmlFor="y">Y Coordinate (Latitude) *</label>*/}
          {/*    <Input*/}
          {/*      id="y"*/}
          {/*      name="y"*/}
          {/*      label="Y Coordinate"*/}
          {/*      type="number"*/}
          {/*      value={formData.y.toString()}*/}
          {/*      onChange={(e) => handleInputChange('y', parseFloat(e.target.value) || 0)}*/}
          {/*      placeholder="Enter Y coordinate"*/}
          {/*      error={errors.y}*/}
          {/*      required*/}
          {/*    />*/}
          {/*  </div>*/}
          {/*</div>*/}

          {/*<div className="form-group">*/}
          {/*  <label htmlFor="z">Z Coordinate (Height/Elevation)</label>*/}
          {/*  <Input*/}
          {/*    id="z"*/}
          {/*    name="z"*/}
          {/*    label="Z Coordinate"*/}
          {/*    type="number"*/}
          {/*    value={formData.z.toString()}*/}
          {/*    onChange={(e) => handleInputChange('z', parseFloat(e.target.value) || 0)}*/}
          {/*    placeholder="Enter Z coordinate (height in meters)"*/}
          {/*    error={errors.z}*/}
          {/*  />*/}
          {/*</div>*/}

          <div className="coordinate-help">
            <p>
              <strong>Coordinate Format:</strong> Use decimal degrees (e.g., 50.142200, 26.313300)
            </p>
            <p>
              <strong>Range:</strong> X: -180 to 180, Y: -90 to 90, Z: -1000 to 1000 meters
            </p>
          </div>
        </div>

        <div className="form-section">
          <h3>Status & Configuration</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="batteryLevel">Battery Level (%)</label>
              <Input
                id="batteryLevel"
                name="batteryLevel"
                label="Battery Level"
                type="number"
                value={formData.batteryLevel?.toString() || ''}
                onChange={(e) => handleInputChange('batteryLevel', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Enter battery level (0-100)"
                error={errors.batteryLevel}
              />
            </div>

            {/*  <div className="form-group">*/}
            {/*    <label htmlFor="installationDate">Installation Date</label>*/}
            {/*    <input*/}
            {/*      id="installationDate"*/}
            {/*      type="date"*/}
            {/*      value={formData.installationDate}*/}
            {/*      onChange={(e) => handleInputChange('installationDate', e.target.value)}*/}
            {/*      placeholder="Select installation date"*/}
            {/*      className={errors.installationDate ? 'error' : ''}*/}
            {/*    />*/}
            {/*    {errors.installationDate && <span className="error-message">{errors.installationDate}</span>}*/}
            {/*  </div>*/}
            {/*</div>*/}

            {/*<div className="form-row">*/}
            {/*  <div className="form-group">*/}
            {/*    <label className="checkbox-label">*/}
            {/*      <input*/}
            {/*        type="checkbox"*/}
            {/*        checked={formData.isActive}*/}
            {/*        onChange={(e) => handleInputChange('isActive', e.target.checked)}*/}
            {/*      />*/}
            {/*      <span className="checkmark"></span>*/}
            {/*      Active beacon*/}
            {/*    </label>*/}
            {/*  </div>*/}

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
        </div>

        <div className="form-actions">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="submit-button"
          >
            {isSubmitting ? 'Saving...' : (isEditing ? 'Update Beacon' : 'Create Beacon')}
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

export default BeaconForm; 