import React, { useEffect, useState } from 'react';
import { POI, PoiCategory, poiCategoriesApi } from '../../utils/api';
import { createLogger } from '../../utils/logger';
import Button from '../common/Button';
import Card from '../common/Card';
import Input from '../common/Input';
import './POIForm.css';

const logger = createLogger('POIForm');

interface POIFormProps {
  poi?: POI | null;
  floorId: number;
  onSave: (poi: Omit<POI, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdate: (id: number, poi: Partial<Omit<POI, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  onCancel: () => void;
}

interface POIFormData {
  name: string;
  description: string;
  poiType: string;
  categoryId: number | null;
  color: string;
  isVisible: boolean;
  x: number;
  y: number;
}

const POI_TYPES = [
  'room',
  'office',
  'classroom',
  'laboratory',
  'conference',
  'bathroom',
  'elevator',
  'stairs',
  'entrance',
  'exit',
  'facility',
  'area',
  'zone'
] as const;

const DEFAULT_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280'  // Gray
];

const POIForm: React.FC<POIFormProps> = ({ poi, floorId, onSave, onUpdate, onCancel }) => {
  const [formData, setFormData] = useState<POIFormData>({
    name: '',
    description: '',
    poiType: 'room',
    categoryId: null,
    color: '#3B82F6',
    isVisible: true,
    x: 0,
    y: 0
  });

  const [categories, setCategories] = useState<PoiCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!poi?.id;

  // Load categories on component mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Initialize form data when editing
  useEffect(() => {
    if (poi) {
      setFormData({
        name: poi.name || '',
        description: poi.description || '',
        poiType: poi.poiType || 'room',
        categoryId: poi.categoryId || null,
        color: poi.color || '#3B82F6',
        isVisible: poi.isVisible ?? true,
        x: 0, // POI coordinates will be handled separately with POI points
        y: 0  // POI coordinates will be handled separately with POI points
      });
    }
  }, [poi]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const categoriesData = await poiCategoriesApi.getAll();
      setCategories(categoriesData);
      logger.info('POI categories loaded', { count: categoriesData.length });
    } catch (error) {
      logger.error('Failed to load POI categories', error as Error);
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

    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }

    if (!POI_TYPES.includes(formData.poiType as any)) {
      newErrors.poiType = 'Invalid POI type';
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

  const handleInputChange = (field: keyof POIFormData, value: any) => {
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
    
    try {
      const poiData = {
        floorId,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        poiType: formData.poiType,
        categoryId: formData.categoryId || undefined,
        color: formData.color,
        isVisible: formData.isVisible,
        x: formData.x,
        y: formData.y
      };

      if (isEditing && poi?.id) {
        await onUpdate(poi.id, poiData);
        logger.info('POI updated successfully', { poiId: poi.id });
      } else {
        await onSave(poiData);
        logger.info('POI created successfully');
      }
    } catch (error) {
      logger.error('Failed to save POI', error as Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isSubmitting) return;
    onCancel();
  };

  return (
    <Card className="poi-form-card" title={isEditing ? 'Edit POI' : 'Create New POI'}>
      <div className="poi-form-header">
        <h2>{isEditing ? 'Edit POI' : 'Create New POI'}</h2>
        <Button variant="SECONDARY" onClick={handleCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="poi-form">
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
              placeholder="Enter POI name"
              error={errors.name}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter POI description"
              rows={3}
              className={errors.description ? 'error' : ''}
            />
            {errors.description && <span className="error-message">{errors.description}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="poiType">Type *</label>
              <select
                id="poiType"
                value={formData.poiType}
                onChange={(e) => handleInputChange('poiType', e.target.value)}
                className={errors.poiType ? 'error' : ''}
              >
                {POI_TYPES.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
              {errors.poiType && <span className="error-message">{errors.poiType}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={formData.categoryId || ''}
                onChange={(e) => handleInputChange('categoryId', e.target.value ? parseInt(e.target.value) : null)}
                disabled={loading}
              >
                <option value="">Select a category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Appearance</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="color">Color</label>
              <div className="color-picker">
                <input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  className="color-input"
                />
                <div className="color-presets">
                  {DEFAULT_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      className="color-preset"
                      style={{ backgroundColor: color }}
                      onClick={() => handleInputChange('color', color)}
                    />
                  ))}
                </div>
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

        <div className="form-actions">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="submit-button"
          >
            {isSubmitting ? 'Saving...' : (isEditing ? 'Update POI' : 'Create POI')}
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

export default POIForm; 