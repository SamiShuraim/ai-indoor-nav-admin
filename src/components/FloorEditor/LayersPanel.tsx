import React from 'react';
import {UI_MESSAGES} from '../../constants/ui';
import {createLogger} from '../../utils/logger';
import {Polygon} from "../../interfaces/Polygon";
import {Beacon} from "../../interfaces/Beacon";
import {RouteNode} from "../../interfaces/RouteNode";

const logger = createLogger('LayersPanel');

interface LayersPanelProps {
  polygons: Polygon[];
  beacons: Beacon[];
  nodes: RouteNode[];
  layerFilter: 'polygons' | 'beacons' | 'nodes';
  selectedItem: { type: 'polygon' | 'beacon' | 'node', id: number } | null;
  onFilterChange: (filter: 'polygons' | 'beacons' | 'nodes') => void;
  onLayerItemClick: (type: 'polygon' | 'beacon' | 'node', id: number) => void;
  onToggleVisibility: (type: 'polygon' | 'beacon' | 'node', id: number) => void;
  onEditItem: (type: 'polygon' | 'beacon' | 'node', id: number, e: React.MouseEvent<HTMLButtonElement>) => void;
  onDeleteItem: (type: 'polygon' | 'beacon' | 'node', id: number, e: React.MouseEvent<HTMLButtonElement>) => void;
}

const LayersPanel: React.FC<LayersPanelProps> = ({
  polygons,
  beacons,
  nodes,
  layerFilter,
  selectedItem,
  onFilterChange,
  onLayerItemClick,
  onToggleVisibility,
  onEditItem,
  onDeleteItem
}) => {
  logger.debug('LayersPanel rendered', { 
    layerFilter, 
    polygonsCount: polygons.length, 
    beaconsCount: beacons.length,
    nodesCount: nodes.length 
  });

  const getFilteredData = () => {
    switch (layerFilter) {
      case 'polygons':
        return { polygons, beacons: [], nodes: [] };
      case 'beacons':
        return { polygons: [], beacons, nodes: [] };
      case 'nodes':
        return { polygons: [], beacons: [], nodes };
    }
  };

  const filteredData = getFilteredData();

  return (
    <div className="layers-panel">
      <div className="layers-header">
        <h3>{UI_MESSAGES.FLOOR_EDITOR_LAYERS_TITLE}</h3>
        
        {/* Filter buttons */}
        <div className="layer-filters">
          <button 
            className={`filter-button ${layerFilter === 'polygons' ? 'active' : ''}`}
            onClick={() => onFilterChange('polygons')}
          >
            Polygons
          </button>
          <button 
            className={`filter-button ${layerFilter === 'beacons' ? 'active' : ''}`}
            onClick={() => onFilterChange('beacons')}
          >
            Beacons
          </button>
          <button 
            className={`filter-button ${layerFilter === 'nodes' ? 'active' : ''}`}
            onClick={() => onFilterChange('nodes')}
          >
            Route Nodes
          </button>
        </div>
      </div>
      
      <div className="layers-content">
        {/* Polygons */}
        {filteredData.polygons.length > 0 && (
          <div className="layer-group">
            <h4>Polygons ({filteredData.polygons.length})</h4>
            {filteredData.polygons.map(polygon => (
              <div
                  key={polygon.properties.id}
                  className={`layer-item ${selectedItem?.type === 'polygon' && selectedItem?.id === polygon.properties.id ? 'selected' : ''}`}
                  onClick={() => onLayerItemClick('polygon', polygon.properties.id)}
              >
                <button
                  className="visibility-toggle"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility('polygon', polygon.properties.id);
                  }}
                  title={polygon.properties.isVisible ? UI_MESSAGES.FLOOR_EDITOR_LAYER_VISIBLE : UI_MESSAGES.FLOOR_EDITOR_LAYER_HIDDEN}
                >
                  {polygon.properties.isVisible ? '👁️' : '🚫'}
                </button>
                <div className="layer-color" style={{backgroundColor: polygon.properties.color}}></div>
                <span className="layer-name">{polygon.properties.name}</span>
                <span className="layer-type">({polygon.properties.type})</span>
                <div className="layer-actions">
                  <button
                    className="layer-action-button edit-button"
                    onClick={(e) => onEditItem('polygon', polygon.properties.id, e)}
                    title="Edit polygon"
                  >
                    ✏️
                  </button>
                  <button
                    className="layer-action-button delete-button"
                    onClick={(e) => onDeleteItem('polygon', polygon.properties.id, e)}
                    title="Delete polygon"
                  >
                    ❌
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Beacons */}
        {filteredData.beacons.length > 0 && (
          <div className="layer-group">
            <h4>Beacons ({filteredData.beacons.length})</h4>
            {filteredData.beacons.map(beacon => (
              <div
                  key={beacon.properties.id}
                  className={`layer-item ${selectedItem?.type === 'beacon' && selectedItem?.id === beacon.properties.id ? 'selected' : ''}`}
                  onClick={() => onLayerItemClick('beacon', beacon.properties.id)}
              >
                <button
                  className="visibility-toggle"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility('beacon', beacon.properties.id);
                  }}
                  title={beacon.properties.isVisible ? UI_MESSAGES.FLOOR_EDITOR_LAYER_VISIBLE : UI_MESSAGES.FLOOR_EDITOR_LAYER_HIDDEN}
                >
                  {beacon.properties.isVisible ? '👁️' : '🚫'}
                </button>
                <div className="layer-color beacon-color"></div>
                <span className="layer-name">{beacon.properties.name}</span>
                <div className="layer-actions">
                  <button
                    className="layer-action-button edit-button"
                    onClick={(e) => onEditItem('beacon', beacon.properties.id, e)}
                    title="Edit beacon"
                  >
                    ✏️
                  </button>
                  <button
                    className="layer-action-button delete-button"
                    onClick={(e) => onDeleteItem('beacon', beacon.properties.id, e)}
                    title="Delete beacon"
                  >
                    ❌
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Nodes */}
        {filteredData.nodes.length > 0 && (
          <div className="layer-group">
            <h4>Route Nodes ({filteredData.nodes.length})</h4>
            {filteredData.nodes.map(node => (
              <div 
                key={node.id} 
                className={`layer-item ${selectedItem?.type === 'node' && selectedItem?.id === node.id ? 'selected' : ''}`}
                onClick={() => onLayerItemClick('node', node.id)}
              >
                <button
                  className="visibility-toggle"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility('node', node.id);
                  }}
                  title={node.isVisible ? UI_MESSAGES.FLOOR_EDITOR_LAYER_VISIBLE : UI_MESSAGES.FLOOR_EDITOR_LAYER_HIDDEN}
                >
                  {node.isVisible ? '👁️' : '🚫'}
                </button>
                <div className="layer-color node-color"></div>
                <span className="layer-name">Node {node.id}</span>
                <span className="layer-connections">({node.connections.length} connections)</span>
                <div className="layer-actions">
                  <button
                    className="layer-action-button edit-button"
                    onClick={(e) => onEditItem('node', node.id, e)}
                    title="Edit node"
                  >
                    ✏️
                  </button>
                  <button
                    className="layer-action-button delete-button"
                    onClick={(e) => onDeleteItem('node', node.id, e)}
                    title="Delete node"
                  >
                    ❌
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredData.polygons.length === 0 && filteredData.beacons.length === 0 && filteredData.nodes.length === 0 && (
          <div className="no-layers-message">
            {`No ${layerFilter} found`}
          </div>
        )}
      </div>
    </div>
  );
};

export default LayersPanel; 