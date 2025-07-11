import React, { useEffect, useState } from 'react';
import { UI_MESSAGES } from '../constants/ui';
import { Floor, FloorLayoutData, floorLayoutApi, floorsApi } from '../utils/api';
import { createLogger } from '../utils/logger';
import { Button, Container, Header } from './common';
import './FloorEditor.css';

const logger = createLogger('FloorEditor');

interface FloorEditorProps {
  floorId: string;
  onBack: () => void;
}

type TabType = 'pois' | 'nodes' | 'edges';

const FloorEditor: React.FC<FloorEditorProps> = ({ floorId, onBack }) => {
  const [floor, setFloor] = useState<Floor | null>(null);
  const [floorData, setFloorData] = useState<FloorLayoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('pois');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    logger.info('FloorEditor component mounted', { floorId });
    loadFloorData();
    
    return () => {
      logger.info('FloorEditor component unmounted');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorId]);

  const loadFloorData = async () => {
    const numericFloorId = parseInt(floorId, 10);
    logger.userAction('Loading floor data', { 
      originalFloorId: floorId, 
      originalType: typeof floorId,
      numericFloorId,
      isValidNumber: !isNaN(numericFloorId)
    });
    setLoading(true);
    setError(null);
    
    if (isNaN(numericFloorId)) {
      const errorMsg = `Invalid floor ID: ${floorId} cannot be converted to a number`;
      logger.error(errorMsg, new Error(errorMsg));
      setError(errorMsg);
      setLoading(false);
      return;
    }
    
    try {
      const [floorInfo, layoutData] = await Promise.all([
        floorsApi.getById(numericFloorId),
        floorLayoutApi.getFloorData(numericFloorId.toString()) // Convert back to string for consistency
      ]);
      
      setFloor(floorInfo);
      setFloorData(layoutData);
      logger.info('Floor data loaded successfully', { 
        floorId: numericFloorId, 
        floorName: floorInfo.name,
        poisCount: layoutData.pois.length,
        nodesCount: layoutData.nodes.length,
        edgesCount: layoutData.edges.length
      });
    } catch (error) {
      logger.error('Failed to load floor data', error as Error, {
        floorId: numericFloorId,
        originalFloorId: floorId,
        errorType: (error as Error).constructor.name,
        errorMessage: (error as Error).message
      });
      setError(UI_MESSAGES.ERROR_GENERIC);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: TabType) => {
    logger.userAction('Tab changed', { tab });
    setActiveTab(tab);
  };

  const handleSave = async () => {
    logger.userAction('Save button clicked');
    // TODO: Implement save functionality when backend is ready
    logger.info('Save functionality not yet implemented');
  };

  const renderPOIsTab = () => {
    if (!floorData) return null;

    return (
      <div className="tab-content">
        <div className="tab-header">
          <h3>{UI_MESSAGES.FLOOR_EDITOR_POIS_TAB}</h3>
          <div className="data-stats">
            {floorData.pois.length} POIs found
          </div>
        </div>
        
        <div className="data-grid">
          {floorData.pois.length === 0 ? (
            <div className="no-data-message">No POIs found for this floor.</div>
          ) : (
            <div className="data-table">
              <div className="table-header">
                <div className="table-cell">Name</div>
                <div className="table-cell">Type</div>
                <div className="table-cell">Position</div>
                <div className="table-cell">Description</div>
              </div>
              {floorData.pois.map((poi) => (
                <div key={poi.id} className="table-row">
                  <div className="table-cell">{poi.name}</div>
                  <div className="table-cell">{poi.type}</div>
                  <div className="table-cell">({poi.x}, {poi.y})</div>
                  <div className="table-cell">{poi.description || '-'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderNodesTab = () => {
    if (!floorData) return null;

    return (
      <div className="tab-content">
        <div className="tab-header">
          <h3>{UI_MESSAGES.FLOOR_EDITOR_NODES_TAB}</h3>
          <div className="data-stats">
            {floorData.nodes.length} navigation nodes found
          </div>
        </div>
        
        <div className="data-grid">
          {floorData.nodes.length === 0 ? (
            <div className="no-data-message">No navigation nodes found for this floor.</div>
          ) : (
            <div className="data-table">
              <div className="table-header">
                <div className="table-cell">ID</div>
                <div className="table-cell">Type</div>
                <div className="table-cell">Position</div>
              </div>
              {floorData.nodes.map((node) => (
                <div key={node.id} className="table-row">
                  <div className="table-cell">{node.id}</div>
                  <div className="table-cell">{node.type}</div>
                  <div className="table-cell">({node.x}, {node.y})</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderEdgesTab = () => {
    if (!floorData) return null;

    return (
      <div className="tab-content">
        <div className="tab-header">
          <h3>{UI_MESSAGES.FLOOR_EDITOR_EDGES_TAB}</h3>
          <div className="data-stats">
            {floorData.edges.length} connections found
          </div>
        </div>
        
        <div className="data-grid">
          {floorData.edges.length === 0 ? (
            <div className="no-data-message">No connections found for this floor.</div>
          ) : (
            <div className="data-table">
              <div className="table-header">
                <div className="table-cell">ID</div>
                <div className="table-cell">From Node</div>
                <div className="table-cell">To Node</div>
                <div className="table-cell">Weight</div>
              </div>
              {floorData.edges.map((edge) => (
                <div key={edge.id} className="table-row">
                  <div className="table-cell">{edge.id}</div>
                  <div className="table-cell">{edge.fromNodeId}</div>
                  <div className="table-cell">{edge.toNodeId}</div>
                  <div className="table-cell">{edge.weight || '-'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'pois':
        return renderPOIsTab();
      case 'nodes':
        return renderNodesTab();
      case 'edges':
        return renderEdgesTab();
      default:
        return null;
    }
  };

  logger.debug('FloorEditor component rendering', { 
    floorId, 
    activeTab, 
    loading,
    hasFloorData: !!floorData 
  });

  if (loading) {
    return (
      <Container variant="PAGE">
        <Header 
          title={UI_MESSAGES.FLOOR_EDITOR_TITLE}
          actions={
            <Button variant="SECONDARY" onClick={onBack}>
              {UI_MESSAGES.FLOOR_EDITOR_BACK_BUTTON}
            </Button>
          }
        />
        <div className="loading-message">{UI_MESSAGES.FLOOR_EDITOR_LOADING}</div>
      </Container>
    );
  }

  return (
    <Container variant="PAGE">
      <Header 
        title={`${UI_MESSAGES.FLOOR_EDITOR_TITLE} - ${floor?.name || 'Unknown Floor'}`}
        actions={
          <div className="header-actions">
            <Button variant="PRIMARY" onClick={handleSave}>
              {UI_MESSAGES.FLOOR_EDITOR_SAVE_BUTTON}
            </Button>
            <Button variant="SECONDARY" onClick={onBack}>
              {UI_MESSAGES.FLOOR_EDITOR_BACK_BUTTON}
            </Button>
          </div>
        }
      />

      {error && (
        <div className="floor-editor-error">
          {error}
        </div>
      )}

      <div className="floor-editor-content">
        <div className="tabs-container">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'pois' ? 'active' : ''}`}
              onClick={() => handleTabChange('pois')}
            >
              {UI_MESSAGES.FLOOR_EDITOR_POIS_TAB}
              {floorData && <span className="tab-count">({floorData.pois.length})</span>}
            </button>
            <button 
              className={`tab ${activeTab === 'nodes' ? 'active' : ''}`}
              onClick={() => handleTabChange('nodes')}
            >
              {UI_MESSAGES.FLOOR_EDITOR_NODES_TAB}
              {floorData && <span className="tab-count">({floorData.nodes.length})</span>}
            </button>
            <button 
              className={`tab ${activeTab === 'edges' ? 'active' : ''}`}
              onClick={() => handleTabChange('edges')}
            >
              {UI_MESSAGES.FLOOR_EDITOR_EDGES_TAB}
              {floorData && <span className="tab-count">({floorData.edges.length})</span>}
            </button>
          </div>
        </div>

        <div className="tab-panels">
          {renderTabContent()}
        </div>
      </div>
    </Container>
  );
};

export default FloorEditor; 