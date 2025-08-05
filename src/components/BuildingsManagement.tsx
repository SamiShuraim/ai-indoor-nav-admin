import React, {useEffect, useState} from 'react';
import {API_BASE_URL, API_ENDPOINTS} from '../constants/api';
import {UI_MESSAGES} from '../constants/ui';
import {buildingsApi, floorsApi} from '../utils/api';
import {createLogger} from '../utils/logger';
import './BuildingsManagement.css';
import {Button, Card, Container, Header, Input} from './common';
import {Building} from "../interfaces/Building";
import {Floor} from "../interfaces/Floor";

const logger = createLogger('BuildingsManagement');

interface BuildingsManagementProps {
  onBack: () => void;
  onFloorEdit: (floorId: string | number) => void;
}

interface BuildingFormData {
  name: string;
  description: string;
}

interface FloorFormData {
  name: string;
  floorNumber: number;
}

const BuildingsManagement: React.FC<BuildingsManagementProps> = ({ onBack, onFloorEdit }) => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuildingForm, setShowBuildingForm] = useState(false);
  const [showFloorForm, setShowFloorForm] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null);
  const [buildingFormData, setBuildingFormData] = useState<BuildingFormData>({ name: '', description: '' });
  const [floorFormData, setFloorFormData] = useState<FloorFormData>({ name: '', floorNumber: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    logger.info('BuildingsManagement component mounted');
    loadBuildings();
    
    return () => {
      logger.info('BuildingsManagement component unmounted');
    };
  }, []);

  const loadBuildings = async () => {
    logger.userAction('Loading buildings list');
    setLoading(true);
    setError(null);
    
    try {
      const buildingsData = await buildingsApi.getAll();
      setBuildings(buildingsData);
      logger.info('Buildings loaded successfully', { count: buildingsData.length });
    } catch (error) {
      logger.error('Failed to load buildings', error as Error);
      setError(UI_MESSAGES.ERROR_GENERIC);
    } finally {
      setLoading(false);
    }
  };

  const loadFloors = async (building: Building) => {
    logger.userAction('Loading floors for building', { 
      buildingId: building.id, 
      buildingName: building.name,
      buildingIdType: typeof building.id 
    });
    setError(null);
    
    try {
      logger.info('Calling floorsApi.getByBuilding', { 
        buildingId: building.id,
        apiEndpoint: `${API_BASE_URL}${API_ENDPOINTS.FLOORS_BY_BUILDING(building.id)}`,
        expectedUrl: `${API_BASE_URL}${API_ENDPOINTS.FLOORS_BY_BUILDING(building.id)}`
      });
      
      const floorsData = await floorsApi.getByBuilding(building.id);
      setFloors(floorsData);
      setSelectedBuilding(building);
      logger.info('Floors loaded successfully', { 
        buildingId: building.id, 
        buildingName: building.name,
        floorsCount: floorsData.length,
        floorIds: floorsData.map(f => f.id),
        floorNames: floorsData.map(f => f.name)
      });
    } catch (error) {
      logger.error('Failed to load floors', error as Error, {
        buildingId: building.id,
        buildingName: building.name,
        buildingIdType: typeof building.id,
        errorType: (error as Error).constructor.name,
        errorMessage: (error as Error).message,
        stackTrace: (error as Error).stack
      });
      setError(UI_MESSAGES.ERROR_GENERIC);
    }
  };

  const handleBuildingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    logger.userAction('Building form submitted', { isEdit: !!editingBuilding });
    setError(null);

    if (!buildingFormData.name.trim()) {
      setError(UI_MESSAGES.AUTH_VALIDATION_ERROR);
      return;
    }

    try {
      if (editingBuilding) {
        await buildingsApi.update(editingBuilding.id, buildingFormData);
        logger.info('Building updated successfully', { buildingId: editingBuilding.id });
      } else {
        await buildingsApi.create(buildingFormData);
        logger.info('Building created successfully');
      }
      
      setShowBuildingForm(false);
      setEditingBuilding(null);
      setBuildingFormData({ name: '', description: '' });
      await loadBuildings();
    } catch (error) {
      logger.error('Failed to save building', error as Error);
      setError(UI_MESSAGES.ERROR_GENERIC);
    }
  };

  const handleFloorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    logger.userAction('Floor form submitted', { isEdit: !!editingFloor });
    setError(null);

    if (!selectedBuilding || !floorFormData.name.trim()) {
      setError(UI_MESSAGES.AUTH_VALIDATION_ERROR);
      return;
    }

    if (isNaN(floorFormData.floorNumber)) {
      setError('Floor number must be a valid number');
      return;
    }

    try {
      const floorData = {
        properties: {
          name: floorFormData.name.trim(),
          floorNumber: floorFormData.floorNumber,
          buildingId: selectedBuilding.id,
        },
      };

      if (editingFloor) {
        await floorsApi.update(editingFloor.id, floorData);
        logger.info('Floor updated successfully', { floorId: editingFloor.id });
      } else {
        await floorsApi.create(floorData);
        logger.info('Floor created successfully');
      }
      
      setShowFloorForm(false);
      setEditingFloor(null);
      setFloorFormData({ name: '', floorNumber: 0 });
      await loadFloors(selectedBuilding);
    } catch (error) {
      logger.error('Failed to save floor', error as Error);
      setError(UI_MESSAGES.ERROR_GENERIC);
    }
  };

  const handleDeleteBuilding = async (building: Building) => {
    if (!window.confirm(UI_MESSAGES.CONFIRM_DELETE)) return;
    
    logger.userAction('Building deletion confirmed', { buildingId: building.id });
    setError(null);

    try {
      await buildingsApi.delete(building.id);
      logger.info('Building deleted successfully', { buildingId: building.id });
      await loadBuildings();
      if (selectedBuilding?.id === building.id) {
        setSelectedBuilding(null);
        setFloors([]);
      }
    } catch (error) {
      logger.error('Failed to delete building', error as Error);
      setError(UI_MESSAGES.ERROR_GENERIC);
    }
  };

  const handleDeleteFloor = async (floor: Floor) => {
    if (!window.confirm(UI_MESSAGES.CONFIRM_DELETE)) return;
    
    logger.userAction('Floor deletion confirmed', { floorId: floor.id });
    setError(null);

    try {
      await floorsApi.delete(floor.id);
      logger.info('Floor deleted successfully', { floorId: floor.id });
      if (selectedBuilding) {
        await loadFloors(selectedBuilding);
      }
    } catch (error) {
      logger.error('Failed to delete floor', error as Error);
      setError(UI_MESSAGES.ERROR_GENERIC);
    }
  };

  const startEditBuilding = (building: Building) => {
    logger.userAction('Start editing building', { buildingId: building.id });
    setEditingBuilding(building);
    setBuildingFormData({ name: building.name, description: building.description || '' });
    setShowBuildingForm(true);
  };

  const startEditFloor = (floor: Floor) => {
    logger.userAction('Start editing floor', { floorId: floor.id });
    setEditingFloor(floor);
    setFloorFormData({ name: floor.name || '', floorNumber: floor.floorNumber || 0 });
    setShowFloorForm(true);
  };

  const cancelForm = () => {
    logger.userAction('Form cancelled');
    setShowBuildingForm(false);
    setShowFloorForm(false);
    setEditingBuilding(null);
    setEditingFloor(null);
    setBuildingFormData({ name: '', description: '' });
    setFloorFormData({ name: '', floorNumber: 0 });
    setError(null);
  };

  logger.debug('BuildingsManagement component rendering', { 
    buildingsCount: buildings.length, 
    selectedBuilding: selectedBuilding?.id,
    floorsCount: floors.length 
  });

  return (
    <Container variant="PAGE">
      <Header 
        title={UI_MESSAGES.BUILDINGS_TITLE}
        actions={
          <Button variant="SECONDARY" onClick={onBack}>
            {UI_MESSAGES.BUILDINGS_BACK_BUTTON}
          </Button>
        }
      />

      {error && (
        <div className="buildings-error">
          {error}
        </div>
      )}

      <div className="buildings-content">
        <div className="buildings-section">
          <div className="section-header">
            <h2>Buildings</h2>
            <Button 
              variant="PRIMARY" 
              onClick={() => setShowBuildingForm(true)}
            >
              {UI_MESSAGES.BUILDINGS_ADD_BUILDING_BUTTON}
            </Button>
          </div>

          {loading ? (
            <div className="loading-message">{UI_MESSAGES.BUILDINGS_LOADING}</div>
          ) : buildings.length === 0 ? (
            <div className="no-data-message">{UI_MESSAGES.BUILDINGS_NO_DATA}</div>
          ) : (
            <div className="buildings-grid">
              {buildings.map((building) => (
                <Card
                  key={building.id}
                  title={building.name}
                  description={building.description}
                  className="building-card"
                  actions={
                    <div className="building-actions">
                      <Button 
                        variant="PRIMARY" 
                        size="SMALL"
                        onClick={(e) => {
                          e?.stopPropagation();
                          loadFloors(building);
                        }}
                      >
                        {UI_MESSAGES.BUILDINGS_FLOORS_BUTTON}
                      </Button>
                      <Button 
                        variant="SECONDARY" 
                        size="SMALL"
                        onClick={(e) => {
                          e?.stopPropagation();
                          startEditBuilding(building);
                        }}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="DANGER" 
                        size="SMALL"
                        onClick={(e) => {
                          e?.stopPropagation();
                          handleDeleteBuilding(building);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </div>

        {selectedBuilding && (
          <div className="floors-section">
            <div className="section-header">
              <h2>{UI_MESSAGES.FLOORS_TITLE} - {selectedBuilding.name}</h2>
              <Button 
                variant="PRIMARY" 
                onClick={() => setShowFloorForm(true)}
              >
                {UI_MESSAGES.FLOORS_ADD_FLOOR_BUTTON}
              </Button>
            </div>

            {floors.length === 0 ? (
              <div className="no-data-message">{UI_MESSAGES.FLOORS_NO_DATA}</div>
            ) : (
              <div className="floors-grid">
                {floors.map((floor) => (
                  <Card
                    key={floor.id}
                    title={`Floor ${floor.floorNumber < 0 ? 'B' + Math.abs(floor.floorNumber) : floor.floorNumber === 0 ? 'G' : floor.floorNumber}: ${floor.name}`}
                    description={`Floor in ${selectedBuilding.name}`}
                    className="floor-card"
                    actions={
                      <div className="floor-actions">
                        <Button 
                          variant="PRIMARY" 
                          size="SMALL"
                          onClick={() => onFloorEdit(floor.id)}
                        >
                          {UI_MESSAGES.FLOORS_MANAGE_BUTTON}
                        </Button>
                        <Button 
                          variant="SECONDARY" 
                          size="SMALL"
                          onClick={() => startEditFloor(floor)}
                        >
                          {UI_MESSAGES.FLOORS_EDIT_BUTTON}
                        </Button>
                        <Button 
                          variant="DANGER" 
                          size="SMALL"
                          onClick={() => handleDeleteFloor(floor)}
                        >
                          {UI_MESSAGES.FLOORS_DELETE_BUTTON}
                        </Button>
                      </div>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Building Form Modal */}
      {showBuildingForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{editingBuilding ? UI_MESSAGES.BUILDING_FORM_TITLE_EDIT : UI_MESSAGES.BUILDING_FORM_TITLE_ADD}</h3>
            <form onSubmit={handleBuildingSubmit}>
              <Input
                id="building-name"
                name="buildingName"
                label={UI_MESSAGES.BUILDING_FORM_NAME_LABEL}
                type="text"
                value={buildingFormData.name}
                onChange={(e) => setBuildingFormData({ ...buildingFormData, name: e.target.value })}
                placeholder={UI_MESSAGES.BUILDING_FORM_NAME_PLACEHOLDER}
                required
              />
              <Input
                id="building-description"
                name="buildingDescription"
                label={UI_MESSAGES.BUILDING_FORM_DESCRIPTION_LABEL}
                type="text"
                value={buildingFormData.description}
                onChange={(e) => setBuildingFormData({ ...buildingFormData, description: e.target.value })}
                placeholder={UI_MESSAGES.BUILDING_FORM_DESCRIPTION_PLACEHOLDER}
              />
              <div className="form-actions">
                <Button variant="SECONDARY" type="button" onClick={cancelForm}>
                  {UI_MESSAGES.BUILDING_FORM_CANCEL}
                </Button>
                <Button variant="PRIMARY" type="submit">
                  {editingBuilding ? UI_MESSAGES.BUILDING_FORM_SUBMIT_EDIT : UI_MESSAGES.BUILDING_FORM_SUBMIT_ADD}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floor Form Modal */}
      {showFloorForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{editingFloor ? UI_MESSAGES.FLOOR_FORM_TITLE_EDIT : UI_MESSAGES.FLOOR_FORM_TITLE_ADD}</h3>
            <form onSubmit={handleFloorSubmit}>
              <Input
                id="floor-name"
                name="floorName"
                label={UI_MESSAGES.FLOOR_FORM_NAME_LABEL}
                type="text"
                value={floorFormData.name}
                onChange={(e) => setFloorFormData({ ...floorFormData, name: e.target.value })}
                placeholder={UI_MESSAGES.FLOOR_FORM_NAME_PLACEHOLDER}
                required
              />
              <Input
                id="floor-number"
                name="floorNumber"
                label="Floor Number"
                type="number"
                value={floorFormData.floorNumber.toString()}
                onChange={(e) => setFloorFormData({ ...floorFormData, floorNumber: parseInt(e.target.value) || 0 })}
                placeholder="0 (e.g., -2 for B2, -1 for B1, 0 for Ground, 1 for 1st floor)"
                required
              />
              <div className="form-actions">
                <Button variant="SECONDARY" type="button" onClick={cancelForm}>
                  {UI_MESSAGES.FLOOR_FORM_CANCEL}
                </Button>
                <Button variant="PRIMARY" type="submit">
                  {editingFloor ? UI_MESSAGES.FLOOR_FORM_SUBMIT_EDIT : UI_MESSAGES.FLOOR_FORM_SUBMIT_ADD}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Container>
  );
};

export default BuildingsManagement; 