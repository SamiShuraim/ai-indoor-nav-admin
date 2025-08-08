import React, {useEffect, useState} from 'react';
import {beaconsApi, beaconTypesApi, poiCategoriesApi, polygonsApi, routeNodesApi} from '../utils/api';
import {createLogger} from '../utils/logger';
import Alert from './common/Alert';
import Button from './common/Button';
import Card from './common/Card';
import Container from './common/Container';
import Header from './common/Header';
import Input from './common/Input';
import './FloorManagement.css';
import {BeaconForm, POIForm, RouteNodeForm} from './forms';
import {PoiCategory} from "../interfaces/PoiCategory";
import {RouteNode} from "../interfaces/RouteNode";
import {Beacon} from "../interfaces/Beacon";
import {BeaconType} from "../interfaces/BeaconType";
import {Polygon} from "../interfaces/Polygon";

const logger = createLogger('FloorManagement');

// Constants
const ENTITY_TYPES = {
  POI: 'POI',
  BEACON: 'BEACON',
  ROUTE_NODE: 'ROUTE_NODE',
  ROUTE_EDGE: 'ROUTE_EDGE',
  POI_CATEGORY: 'POI_CATEGORY',
  BEACON_TYPE: 'BEACON_TYPE'
} as const;

const ALERT_TYPES = {
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
  WARNING: 'WARNING',
  INFO: 'INFO'
} as const;

interface FloorManagementProps {
  floorId: string;
  onBack: () => void;
}

interface AlertMessage {
  id: string;
  type: keyof typeof ALERT_TYPES;
  message: string;
  duration?: number;
}

interface FloorManagementState {
  activeTab: keyof typeof ENTITY_TYPES;
  entities: {
    pois: Polygon[];
    beacons: Beacon[];
    routeNodes: RouteNode[];
    poiCategories: PoiCategory[];
    beaconTypes: BeaconType[];
  };
  loading: {
    pois: boolean;
    beacons: boolean;
    routeNodes: boolean;
    routeEdges: boolean;
    poiCategories: boolean;
    beaconTypes: boolean;
  };
  editing: {
    poi: Polygon | null;
    beacon: Beacon | null;
    routeNode: RouteNode | null;
    poiCategory: PoiCategory | null;
    beaconType: BeaconType | null;
  };
  alerts: AlertMessage[];
  searchTerm: string;
  selectedFloorId: string;
}

const FloorManagement: React.FC<FloorManagementProps> = ({ floorId, onBack }) => {
  const [state, setState] = useState<FloorManagementState>({
    activeTab: ENTITY_TYPES.POI,
    entities: {
      pois: [],
      beacons: [],
      routeNodes: [],
      poiCategories: [],
      beaconTypes: []
    },
    loading: {
      pois: false,
      beacons: false,
      routeNodes: false,
      routeEdges: false,
      poiCategories: false,
      beaconTypes: false
    },
    editing: {
      poi: null,
      beacon: null,
      routeNode: null,
      poiCategory: null,
      beaconType: null
    },
    alerts: [],
    searchTerm: '',
    selectedFloorId: floorId
  });

  // Load data on component mount
  useEffect(() => {
    loadAllData();
  }, [floorId]);

  // Load all data for the floor
  const loadAllData = async () => {
    logger.info('Loading all floor data', { floorId });
    
    try {
      await Promise.all([
        loadPOIs(),
        loadBeacons(),
        loadRouteNodes(),
        // loadRouteEdges(),
        loadPoiCategories(),
        loadBeaconTypes()
      ]);
      
      addAlert(ALERT_TYPES.SUCCESS, 'All data loaded successfully');
    } catch (error) {
      logger.error('Failed to load floor data', error as Error);
      addAlert(ALERT_TYPES.ERROR, 'Failed to load floor data');
    }
  };

  // Load POIs
  const loadPOIs = async () => {
    setState(prev => ({ ...prev, loading: { ...prev.loading, pois: true } }));
    try {
      const pois = await polygonsApi.getByFloor(floorId);
      setState(prev => ({ 
        ...prev, 
        entities: { ...prev.entities, pois },
        loading: { ...prev.loading, pois: false }
      }));
      logger.info('POIs loaded successfully', { count: pois.length });
    } catch (error) {
      logger.error('Failed to load POIs', error as Error);
      setState(prev => ({ ...prev, loading: { ...prev.loading, pois: false } }));
      throw error;
    }
  };

  // Load Beacons
  const loadBeacons = async () => {
    setState(prev => ({ ...prev, loading: { ...prev.loading, beacons: true } }));
    try {
      const beacons = await beaconsApi.getByFloor(floorId);
      setState(prev => ({ 
        ...prev, 
        entities: { ...prev.entities, beacons },
        loading: { ...prev.loading, beacons: false }
      }));
      logger.info('Beacons loaded successfully', { count: beacons.length });
    } catch (error) {
      logger.error('Failed to load beacons', error as Error);
      setState(prev => ({ ...prev, loading: { ...prev.loading, beacons: false } }));
      throw error;
    }
  };

  // Load Route Nodes
  const loadRouteNodes = async () => {
    setState(prev => ({ ...prev, loading: { ...prev.loading, routeNodes: true } }));
    try {
      const routeNodes = await routeNodesApi.getByFloor(floorId);
      setState(prev => ({ 
        ...prev, 
        entities: { ...prev.entities, routeNodes },
        loading: { ...prev.loading, routeNodes: false }
      }));
      logger.info('Route nodes loaded successfully', { count: routeNodes.length });
    } catch (error) {
      logger.error('Failed to load route nodes', error as Error);
      setState(prev => ({ ...prev, loading: { ...prev.loading, routeNodes: false } }));
      throw error;
    }
  };

  // // Load Route Edges
  // const loadRouteEdges = async () => {
  //   setState(prev => ({ ...prev, loading: { ...prev.loading, routeEdges: true } }));
  //   try {
  //     const routeEdges = await routeEdgesApi.getByFloor(floorId);
  //     setState(prev => ({
  //       ...prev,
  //       entities: { ...prev.entities, routeEdges },
  //       loading: { ...prev.loading, routeEdges: false }
  //     }));
  //     logger.info('Route edges loaded successfully', { count: routeEdges.length });
  //   } catch (error) {
  //     logger.error('Failed to load route edges', error as Error);
  //     setState(prev => ({ ...prev, loading: { ...prev.loading, routeEdges: false } }));
  //     throw error;
  //   }
  // };

  // Load POI Categories
  const loadPoiCategories = async () => {
    setState(prev => ({ ...prev, loading: { ...prev.loading, poiCategories: true } }));
    try {
      const poiCategories = await poiCategoriesApi.getAll();
      setState(prev => ({ 
        ...prev, 
        entities: { ...prev.entities, poiCategories },
        loading: { ...prev.loading, poiCategories: false }
      }));
      logger.info('POI categories loaded successfully', { count: poiCategories.length });
    } catch (error) {
      logger.error('Failed to load POI categories', error as Error);
      setState(prev => ({ ...prev, loading: { ...prev.loading, poiCategories: false } }));
      throw error;
    }
  };

  // Load Beacon Types
  const loadBeaconTypes = async () => {
    setState(prev => ({ ...prev, loading: { ...prev.loading, beaconTypes: true } }));
    try {
      const beaconTypes = await beaconTypesApi.getAll();
      setState(prev => ({ 
        ...prev, 
        entities: { ...prev.entities, beaconTypes },
        loading: { ...prev.loading, beaconTypes: false }
      }));
      logger.info('Beacon types loaded successfully', { count: beaconTypes.length });
    } catch (error) {
      logger.error('Failed to load beacon types', error as Error);
      setState(prev => ({ ...prev, loading: { ...prev.loading, beaconTypes: false } }));
      throw error;
    }
  };

  // Alert management
  const addAlert = (type: keyof typeof ALERT_TYPES, message: string, duration: number = 5000) => {
    const id = Date.now().toString();
    const alert: AlertMessage = { id, type, message, duration };
    
    setState(prev => ({ 
      ...prev, 
      alerts: [...prev.alerts, alert]
    }));

    if (duration > 0) {
      setTimeout(() => {
        removeAlert(id);
      }, duration);
    }
  };

  const removeAlert = (id: string) => {
    setState(prev => ({
      ...prev,
      alerts: prev.alerts.filter(alert => alert.id !== id)
    }));
  };

  // Tab management
  const setActiveTab = (tab: keyof typeof ENTITY_TYPES) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  };

  // Search functionality
  const handleSearchChange = (value: string) => {
    setState(prev => ({ ...prev, searchTerm: value }));
  };

  // Filter entities based on search term
  const getFilteredEntities = (entities: any[], searchFields: string[]) => {
    if (!state.searchTerm) return entities;
    
    return entities.filter(entity =>
      searchFields.some(field => {
        const value = entity[field];
        return value && value.toString().toLowerCase().includes(state.searchTerm.toLowerCase());
      })
    );
  };

  // POI CRUD operations
  const handleCreatePOI = async (poiData: Omit<Polygon, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newPOI = await polygonsApi.create(poiData);
      setState(prev => ({
        ...prev,
        entities: { ...prev.entities, pois: [...prev.entities.pois, newPOI] },
        editing: { ...prev.editing, poi: null }
      }));
      addAlert(ALERT_TYPES.SUCCESS, 'POI created successfully');
      logger.info('POI created successfully', {poiId: newPOI.properties.id});
    } catch (error) {
      logger.error('Failed to create POI', error as Error);
      addAlert(ALERT_TYPES.ERROR, 'Failed to create POI');
    }
  };

  const handleUpdatePOI = async (id: number, poiData: Partial<Omit<Polygon, 'id' | 'createdAt' | 'updatedAt'>>) => {
    try {
      await polygonsApi.update(id, poiData);

        setState(prev => ({
            ...prev,
            entities: {
                ...prev.entities,
                pois: prev.entities.pois.map(poi =>
                    poi.properties.id === id ? {...poi, ...poiData} : poi
                )
            },
            editing: {...prev.editing, poi: null}
        }));

        addAlert(ALERT_TYPES.SUCCESS, 'POI updated successfully');
      logger.info('POI updated successfully', { poiId: id });
    } catch (error) {
      logger.error('Failed to update POI', error as Error);
      addAlert(ALERT_TYPES.ERROR, 'Failed to update POI');
    }
  };

  const handleDeletePOI = async (id: number) => {
    try {
      await polygonsApi.delete(id);
      setState(prev => ({
        ...prev,
        entities: { 
          ...prev.entities,
          pois: prev.entities.pois.filter(poi => poi.properties.id !== id)
        }
      }));
      addAlert(ALERT_TYPES.SUCCESS, 'POI deleted successfully');
      logger.info('POI deleted successfully', { poiId: id });
    } catch (error) {
      logger.error('Failed to delete POI', error as Error);
      addAlert(ALERT_TYPES.ERROR, 'Failed to delete POI');
    }
  };

  // Beacon CRUD operations
  const handleCreateBeacon = async (beaconData: Omit<Beacon, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newBeacon = await beaconsApi.create(beaconData);
      setState(prev => ({
        ...prev,
        entities: { ...prev.entities, beacons: [...prev.entities.beacons, newBeacon] },
        editing: { ...prev.editing, beacon: null }
      }));
      addAlert(ALERT_TYPES.SUCCESS, 'Beacon created successfully');
      logger.info('Beacon created successfully', {beaconId: newBeacon.properties.id});
    } catch (error) {
      logger.error('Failed to create beacon', error as Error);
      addAlert(ALERT_TYPES.ERROR, 'Failed to create beacon');
    }
  };

  const handleUpdateBeacon = async (id: number, beaconData: Partial<Omit<Beacon, 'id' | 'createdAt' | 'updatedAt'>>) => {
    try {
        await beaconsApi.update(id, beaconData);
        setState(prev => ({
            ...prev,
            entities: {
                ...prev.entities,
                beacons: prev.entities.beacons.map(beacon =>
                    beacon.properties.id === id ? {...beacon, ...beaconData} : beacon
                ),
            },
            editing: {...prev.editing, beacon: null},
        }));
      addAlert(ALERT_TYPES.SUCCESS, 'Beacon updated successfully');
      logger.info('Beacon updated successfully', { beaconId: id });
    } catch (error) {
      logger.error('Failed to update beacon', error as Error);
      addAlert(ALERT_TYPES.ERROR, 'Failed to update beacon');
    }
  };

  const handleDeleteBeacon = async (id: number) => {
    try {
      await beaconsApi.delete(id);
      setState(prev => ({
        ...prev,
        entities: { 
          ...prev.entities,
          beacons: prev.entities.beacons.filter(beacon => beacon.properties.id !== id)
        }
      }));
      addAlert(ALERT_TYPES.SUCCESS, 'Beacon deleted successfully');
      logger.info('Beacon deleted successfully', { beaconId: id });
    } catch (error) {
      logger.error('Failed to delete beacon', error as Error);
      addAlert(ALERT_TYPES.ERROR, 'Failed to delete beacon');
    }
  };

  // Route Node CRUD operations
  const handleCreateRouteNode = async (nodeData: Omit<RouteNode, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newNode = await routeNodesApi.create(nodeData);
      setState(prev => ({
        ...prev,
        entities: { ...prev.entities, routeNodes: [...prev.entities.routeNodes, newNode] },
        editing: { ...prev.editing, routeNode: null }
      }));
      addAlert(ALERT_TYPES.SUCCESS, 'Route node created successfully');
        logger.info('Route node created successfully', {nodeId: newNode.properties.id});
    } catch (error) {
      logger.error('Failed to create route node', error as Error);
      addAlert(ALERT_TYPES.ERROR, 'Failed to create route node');
    }
  };

  const handleUpdateRouteNode = async (id: number, nodeData: Partial<Omit<RouteNode, 'id' | 'createdAt' | 'updatedAt'>>) => {
    try {
        await routeNodesApi.update(id, nodeData);
      setState(prev => ({
        ...prev,
          entities: {
              ...prev.entities,
              routeNodes: prev.entities.routeNodes.map(node => node.properties.id === id ? {...node, ...nodeData} : node)
        },
        editing: { ...prev.editing, routeNode: null }
      }));
      addAlert(ALERT_TYPES.SUCCESS, 'Route node updated successfully');
      logger.info('Route node updated successfully', { nodeId: id });
    } catch (error) {
      logger.error('Failed to update route node', error as Error);
      addAlert(ALERT_TYPES.ERROR, 'Failed to update route node');
    }
  };

  const handleDeleteRouteNode = async (id: number) => {
    try {
      await routeNodesApi.delete(id);
      setState(prev => ({
        ...prev,
        entities: { 
          ...prev.entities,
            routeNodes: prev.entities.routeNodes.filter(node => node.properties.id !== id)
        }
      }));
      addAlert(ALERT_TYPES.SUCCESS, 'Route node deleted successfully');
      logger.info('Route node deleted successfully', { nodeId: id });
    } catch (error) {
      logger.error('Failed to delete route node', error as Error);
      addAlert(ALERT_TYPES.ERROR, 'Failed to delete route node');
    }
  };

  // // Route Edge CRUD operations
  // const handleCreateRouteEdge = async (edgeData: Omit<RouteEdge, 'id' | 'createdAt' | 'updatedAt'>) => {
  //   try {
  //     const newEdge = await routeEdgesApi.create(edgeData);
  //     setState(prev => ({
  //       ...prev,
  //       entities: { ...prev.entities, routeEdges: [...prev.entities.routeEdges, newEdge] },
  //       editing: { ...prev.editing, routeEdge: null }
  //     }));
  //     addAlert(ALERT_TYPES.SUCCESS, 'Route edge created successfully');
  //     logger.info('Route edge created successfully', { edgeId: newEdge.id });
  //   } catch (error) {
  //     logger.error('Failed to create route edge', error as Error);
  //     addAlert(ALERT_TYPES.ERROR, 'Failed to create route edge');
  //   }
  // };

  // const handleUpdateRouteEdge = async (id: number, edgeData: Partial<Omit<RouteEdge, 'id' | 'createdAt' | 'updatedAt'>>) => {
  //   try {
  //       await routeEdgesApi.update(id, edgeData);
  //     setState(prev => ({
  //       ...prev,
  //         entities: {
  //             ...prev.entities,
  //             routeEdges: prev.entities.routeEdges.map(edge => edge.id === id ? {...edge, ...edgeData} : edge)
  //       },
  //       editing: { ...prev.editing, routeEdge: null }
  //     }));
  //     addAlert(ALERT_TYPES.SUCCESS, 'Route edge updated successfully');
  //     logger.info('Route edge updated successfully', { edgeId: id });
  //   } catch (error) {
  //     logger.error('Failed to update route edge', error as Error);
  //     addAlert(ALERT_TYPES.ERROR, 'Failed to update route edge');
  //   }
  // };

  // const handleDeleteRouteEdge = async (id: number) => {
  //   try {
  //     await routeEdgesApi.delete(id);
  //     setState(prev => ({
  //       ...prev,
  //       entities: {
  //         ...prev.entities,
  //         routeEdges: prev.entities.routeEdges.filter(edge => edge.id !== id)
  //       }
  //     }));
  //     addAlert(ALERT_TYPES.SUCCESS, 'Route edge deleted successfully');
  //     logger.info('Route edge deleted successfully', { edgeId: id });
  //   } catch (error) {
  //     logger.error('Failed to delete route edge', error as Error);
  //     addAlert(ALERT_TYPES.ERROR, 'Failed to delete route edge');
  //   }
  // };

  // Render entity list
  const renderEntityList = () => {
    const { activeTab, entities, loading } = state;
    
    switch (activeTab) {
      case ENTITY_TYPES.POI:
        return renderPOIList();
      case ENTITY_TYPES.BEACON:
        return renderBeaconList();
      case ENTITY_TYPES.ROUTE_NODE:
        return renderRouteNodeList();
      case ENTITY_TYPES.ROUTE_EDGE:
        // return renderRouteEdgeList();
      case ENTITY_TYPES.POI_CATEGORY:
        return renderPoiCategoryList();
      case ENTITY_TYPES.BEACON_TYPE:
        return renderBeaconTypeList();
      default:
        return <div>Select a tab to view entities</div>;
    }
  };

  // Render POI list
  const renderPOIList = () => {
    const filteredPOIs = getFilteredEntities(state.entities.pois, ['name', 'description', 'poiType']);
    
    return (
      <div className="entity-list">
        <div className="entity-header">
          <h3>Points of Interest ({filteredPOIs.length})</h3>
          <Button onClick={() => setState(prev => ({...prev, editing: {...prev.editing, poi: {} as Polygon}}))}>
            Add POI
          </Button>
        </div>
        
        {state.loading.pois ? (
          <div className="loading">Loading POIs...</div>
        ) : (
          <div className="entity-grid">
            {filteredPOIs.map(poi => (
              <Card key={poi.id} className="entity-card" title={poi.name}>
                <div className="entity-card-header">
                  <h4>{poi.name}</h4>
                  <div className="entity-actions">
                    <Button size="SMALL" onClick={() => setState(prev => ({ ...prev, editing: { ...prev.editing, poi } }))}>
                      Edit
                    </Button>
                    <Button size="SMALL" variant="DANGER" onClick={() => handleDeletePOI(poi.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="entity-card-content">
                  <p><strong>Type:</strong> {poi.poiType || 'N/A'}</p>
                  <p><strong>Category:</strong> {poi.category?.name || 'N/A'}</p>
                  <p><strong>Description:</strong> {poi.description || 'N/A'}</p>
                  <p><strong>Visible:</strong> {poi.isVisible ? 'Yes' : 'No'}</p>
                  <p><strong>Created:</strong> {new Date(poi.createdAt).toLocaleDateString()}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render Beacon list
  const renderBeaconList = () => {
    const filteredBeacons = getFilteredEntities(state.entities.beacons, ['name', 'uuid']);
    
    return (
      <div className="entity-list">
        <div className="entity-header">
          <h3>Beacons ({filteredBeacons.length})</h3>
          <Button onClick={() => setState(prev => ({ ...prev, editing: { ...prev.editing, beacon: {} as Beacon } }))}>
            Add Beacon
          </Button>
        </div>
        
        {state.loading.beacons ? (
          <div className="loading">Loading beacons...</div>
        ) : (
          <div className="entity-grid">
            {filteredBeacons.map(beacon => (
              <Card key={beacon.id} className="entity-card" title={beacon.name}>
                <div className="entity-card-header">
                  <h4>{beacon.name}</h4>
                  <div className="entity-actions">
                    <Button size="SMALL" onClick={() => setState(prev => ({ ...prev, editing: { ...prev.editing, beacon } }))}>
                      Edit
                    </Button>
                    <Button size="SMALL" variant="DANGER" onClick={() => handleDeleteBeacon(beacon.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="entity-card-content">
                  <p><strong>UUID:</strong> {beacon.uuid || 'N/A'}</p>
                  <p><strong>Type:</strong> {beacon.beaconType?.name || 'N/A'}</p>
                  <p><strong>Location:</strong> ({beacon.x}, {beacon.y})</p>
                  <p><strong>Active:</strong> {beacon.isActive ? 'Yes' : 'No'}</p>
                  <p><strong>Battery:</strong> {beacon.batteryLevel || 'N/A'}%</p>
                  <p><strong>Last Seen:</strong> {beacon.lastSeen ? new Date(beacon.lastSeen).toLocaleString() : 'N/A'}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render Route Node list
  const renderRouteNodeList = () => {
    const filteredNodes = getFilteredEntities(state.entities.routeNodes, ['nodeType']);
    
    return (
      <div className="entity-list">
        <div className="entity-header">
          <h3>Route Nodes ({filteredNodes.length})</h3>
          <Button onClick={() => setState(prev => ({ ...prev, editing: { ...prev.editing, routeNode: {} as RouteNode } }))}>
            Add Node
          </Button>
        </div>
        
        {state.loading.routeNodes ? (
          <div className="loading">Loading route nodes...</div>
        ) : (
          <div className="entity-grid">
            {filteredNodes.map(node => (
              <Card key={node.id} className="entity-card" title={`Node #${node.id}`}>
                <div className="entity-card-header">
                  <h4>Node #{node.id}</h4>
                  <div className="entity-actions">
                    <Button size="SMALL" onClick={() => setState(prev => ({ ...prev, editing: { ...prev.editing, routeNode: node } }))}>
                      Edit
                    </Button>
                    <Button size="SMALL" variant="DANGER" onClick={() => handleDeleteRouteNode(node.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="entity-card-content">
                  <p><strong>Type:</strong> {node.nodeType || 'waypoint'}</p>
                  <p><strong>Location:</strong> ({node.x}, {node.y})</p>
                  <p><strong>Visible:</strong> {node.isVisible ? 'Yes' : 'No'}</p>
                  <p><strong>Created:</strong> {new Date(node.createdAt).toLocaleDateString()}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render Route Edge list
  // const renderRouteEdgeList = () => {
  //   const filteredEdges = getFilteredEntities(state.entities.routeEdges, ['edgeType']);
  //
  //   return (
  //     <div className="entity-list">
  //       {/*<div className="entity-header">*/}
  //       {/*  <h3>Route Edges ({filteredEdges.length})</h3>*/}
  //       {/*  <Button onClick={() => setState(prev => ({ ...prev, editing: { ...prev.editing, routeEdge: {} as RouteEdge } }))}>*/}
  //       {/*    Add Edge*/}
  //       {/*  </Button>*/}
  //       {/*</div>*/}
  //
  //       {state.loading.routeEdges ? (
  //         <div className="loading">Loading route edges...</div>
  //       ) : (
  //         <div className="entity-grid">
  //           {filteredEdges.map(edge => (
  //             <Card key={edge.id} className="entity-card" title={`Edge #${edge.id}`}>
  //               <div className="entity-card-header">
  //                 <h4>Edge #{edge.id}</h4>
  //                 <div className="entity-actions">
  //                   <Button size="SMALL" onClick={() => setState(prev => ({ ...prev, editing: { ...prev.editing, routeEdge: edge } }))}>
  //                     Edit
  //                   </Button>
  //                   <Button size="SMALL" variant="DANGER" onClick={() => handleDeleteRouteEdge(edge.id)}>
  //                     Delete
  //                   </Button>
  //                 </div>
  //               </div>
  //               <div className="entity-card-content">
  //                 <p><strong>From Node:</strong> #{edge.fromNodeId}</p>
  //                 <p><strong>To Node:</strong> #{edge.toNodeId}</p>
  //                 <p><strong>Type:</strong> {edge.edgeType || 'walkable'}</p>
  //                 <p><strong>Weight:</strong> {edge.weight || 1.0}</p>
  //                 <p><strong>Bidirectional:</strong> {edge.isBidirectional ? 'Yes' : 'No'}</p>
  //                 <p><strong>Visible:</strong> {edge.isVisible ? 'Yes' : 'No'}</p>
  //               </div>
  //             </Card>
  //           ))}
  //         </div>
  //       )}
  //     </div>
  //   );
  // };

  // Render POI Category list
  const renderPoiCategoryList = () => {
    const filteredCategories = getFilteredEntities(state.entities.poiCategories, ['name', 'description']);
    
    return (
      <div className="entity-list">
        <div className="entity-header">
          <h3>POI Categories ({filteredCategories.length})</h3>
          <Button onClick={() => setState(prev => ({ ...prev, editing: { ...prev.editing, poiCategory: {} as PoiCategory } }))}>
            Add Category
          </Button>
        </div>
        
        {state.loading.poiCategories ? (
          <div className="loading">Loading POI categories...</div>
        ) : (
          <div className="entity-grid">
            {filteredCategories.map(category => (
              <Card key={category.id} className="entity-card" title={category.name}>
                <div className="entity-card-header">
                  <h4>{category.name}</h4>
                  <div className="entity-actions">
                    <Button size="SMALL" onClick={() => setState(prev => ({ ...prev, editing: { ...prev.editing, poiCategory: category } }))}>
                      Edit
                    </Button>
                    <Button size="SMALL" variant="DANGER" onClick={() => handleDeletePoiCategory(category.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="entity-card-content">
                  <p><strong>Color:</strong> <span style={{ backgroundColor: category.color, padding: '2px 8px', borderRadius: '4px' }}>{category.color || 'N/A'}</span></p>
                  <p><strong>Icon:</strong> {category.icon || 'N/A'}</p>
                  <p><strong>Description:</strong> {category.description || 'N/A'}</p>
                  <p><strong>Created:</strong> {new Date(category.createdAt).toLocaleDateString()}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render Beacon Type list
  const renderBeaconTypeList = () => {
    const filteredTypes = getFilteredEntities(state.entities.beaconTypes, ['name', 'description']);
    
    return (
      <div className="entity-list">
        <div className="entity-header">
          <h3>Beacon Types ({filteredTypes.length})</h3>
          <Button onClick={() => setState(prev => ({ ...prev, editing: { ...prev.editing, beaconType: {} as BeaconType } }))}>
            Add Type
          </Button>
        </div>
        
        {state.loading.beaconTypes ? (
          <div className="loading">Loading beacon types...</div>
        ) : (
          <div className="entity-grid">
            {filteredTypes.map(type => (
              <Card key={type.id} className="entity-card" title={type.name}>
                <div className="entity-card-header">
                  <h4>{type.name}</h4>
                  <div className="entity-actions">
                    <Button size="SMALL" onClick={() => setState(prev => ({ ...prev, editing: { ...prev.editing, beaconType: type } }))}>
                      Edit
                    </Button>
                    <Button size="SMALL" variant="DANGER" onClick={() => handleDeleteBeaconType(type.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="entity-card-content">
                  <p><strong>Description:</strong> {type.description || 'N/A'}</p>
                  <p><strong>Transmission Power:</strong> {type.transmissionPower || 'N/A'}</p>
                  <p><strong>Battery Life:</strong> {type.batteryLife || 'N/A'} days</p>
                  <p><strong>Range:</strong> {type.rangeMeters || 'N/A'} meters</p>
                  <p><strong>Created:</strong> {new Date(type.createdAt).toLocaleDateString()}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Placeholder functions for category and type operations
  const handleDeletePoiCategory = async (id: number) => {
    try {
      await poiCategoriesApi.delete(id);
      setState(prev => ({
        ...prev,
        entities: { 
          ...prev.entities, 
          poiCategories: prev.entities.poiCategories.filter(cat => cat.id !== id)
        }
      }));
      addAlert(ALERT_TYPES.SUCCESS, 'POI category deleted successfully');
    } catch (error) {
      logger.error('Failed to delete POI category', error as Error);
      addAlert(ALERT_TYPES.ERROR, 'Failed to delete POI category');
    }
  };

  const handleDeleteBeaconType = async (id: number) => {
    try {
      await beaconTypesApi.delete(id);
      setState(prev => ({
        ...prev,
        entities: { 
          ...prev.entities, 
          beaconTypes: prev.entities.beaconTypes.filter(type => type.id !== id)
        }
      }));
      addAlert(ALERT_TYPES.SUCCESS, 'Beacon type deleted successfully');
    } catch (error) {
      logger.error('Failed to delete beacon type', error as Error);
      addAlert(ALERT_TYPES.ERROR, 'Failed to delete beacon type');
    }
  };

  return (
    <Container>
      <Header title="Floor Management" />
      
      {/* Alerts */}
      <div className="alerts-container">
        {state.alerts.map(alert => (
          <Alert
            key={alert.id}
            type={alert.type}
            message={alert.message}
          />
        ))}
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <Input
          id="search"
          name="search"
          label="Search"
          type="text"
          placeholder="Search entities..."
          value={state.searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <div className="tabs">
          {Object.entries(ENTITY_TYPES).map(([key, value]) => (
            <button
              key={value}
              className={`tab ${state.activeTab === value ? 'active' : ''}`}
              onClick={() => setActiveTab(value)}
            >
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="content-container">
        {renderEntityList()}
      </div>

      {/* Forms */}
      {state.editing.poi && (
        <POIForm
          poi={state.editing.poi}
          floorId={parseInt(floorId)}
          onSave={handleCreatePOI}
          onUpdate={handleUpdatePOI}
          onCancel={() => setState(prev => ({ ...prev, editing: { ...prev.editing, poi: null } }))}
        />
      )}

      {state.editing.beacon && (
        <BeaconForm
          beacon={state.editing.beacon}
          floorId={parseInt(floorId)}
          onSave={handleCreateBeacon}
          onUpdate={handleUpdateBeacon}
          onCancel={() => setState(prev => ({ ...prev, editing: { ...prev.editing, beacon: null } }))}
        />
      )}

      {state.editing.routeNode && (
        <RouteNodeForm
          routeNode={state.editing.routeNode}
          floorId={parseInt(floorId)}
          onSave={handleCreateRouteNode}
          onUpdate={handleUpdateRouteNode}
          onCancel={() => setState(prev => ({ ...prev, editing: { ...prev.editing, routeNode: null } }))}
        />
      )}
    </Container>
  );
};

export default FloorManagement; 