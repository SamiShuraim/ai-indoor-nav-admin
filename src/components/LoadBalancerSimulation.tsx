import React, { useEffect, useState } from 'react';
import { createLogger } from '../utils/logger';
import {
  assignArrival,
  getMetrics,
  updateConfig,
  getConfig,
  getHealth,
  ArrivalAssignmentResponse,
  MetricsResponse,
  ConfigResponse,
} from '../utils/api_helpers/loadBalancerApi';
import { Button, Card, Container, Header } from './common';
import './LoadBalancerSimulation.css';

const logger = createLogger('LoadBalancerSimulation');

interface LoadBalancerSimulationProps {
  onBack: () => void;
}

const LoadBalancerSimulation: React.FC<LoadBalancerSimulationProps> = ({ onBack }) => {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [lastAssignment, setLastAssignment] = useState<ArrivalAssignmentResponse | null>(null);
  const [assignmentHistory, setAssignmentHistory] = useState<ArrivalAssignmentResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<string>('Unknown');
  
  // Track assignments per level for simulation
  const [levelAssignments, setLevelAssignments] = useState({ 1: 0, 2: 0, 3: 0 });
  
  // Auto-refresh for simulating admin dashboard
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(15); // seconds
  
  // Config edit state
  const [editingConfig, setEditingConfig] = useState(false);
  const [configForm, setConfigForm] = useState({
    alpha1: '',
    targetUtilL1: '',
    controllerGain: '',
    softGateBandYears: '',
    slidingWindowMinutes: '',
    windowMode: 'sliding',
  });

  useEffect(() => {
    logger.info('LoadBalancerSimulation component mounted');
    initializeData();
    
    return () => {
      logger.info('LoadBalancerSimulation component unmounted');
    };
  }, []);

  // Auto-refresh effect (simulates admin dashboard polling)
  useEffect(() => {
    if (!autoRefresh) return;
    
    const intervalId = setInterval(() => {
      logger.info('Auto-refresh: fetching metrics');
      fetchMetrics();
    }, refreshInterval * 1000);
    
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval]);

  const initializeData = async () => {
    await Promise.all([
      fetchMetrics(),
      fetchConfig(),
      checkHealth(),
    ]);
  };

  const checkHealth = async () => {
    try {
      const health = await getHealth();
      setHealthStatus(health.status || 'OK');
      logger.info('Health check successful', health);
    } catch (err) {
      setHealthStatus('Error');
      logger.error('Health check failed', err as Error);
    }
  };

  const fetchMetrics = async () => {
    try {
      logger.info('Fetching metrics');
      const data = await getMetrics();
      setMetrics(data);
      setError(null);
      logger.info('Metrics fetched successfully', data);
    } catch (err) {
      const errorMessage = 'Failed to fetch metrics';
      logger.error(errorMessage, err as Error);
      setError(errorMessage);
    }
  };

  const fetchConfig = async () => {
    try {
      logger.info('Fetching config');
      const data = await getConfig();
      setConfig(data);
      setConfigForm({
        alpha1: data.alpha1 != null ? data.alpha1.toString() : '',
        targetUtilL1: data.targetUtilL1 != null ? data.targetUtilL1.toString() : '',
        controllerGain: data.controllerGain != null ? data.controllerGain.toString() : '',
        softGateBandYears: data.softGateBandYears != null ? data.softGateBandYears.toString() : '',
        slidingWindowMinutes: data.slidingWindowMinutes != null ? data.slidingWindowMinutes.toString() : '',
        windowMode: data.windowMode || 'sliding',
      });
      logger.info('Config fetched successfully', data);
    } catch (err) {
      logger.error('Failed to fetch config', err as Error);
    }
  };

  const handleAssign = async (age: number, isDisabled: boolean) => {
    setIsLoading(true);
    setError(null);
    
    const disabledStatus = isDisabled ? 'disabled' : 'non-disabled';
    const description = `${disabledStatus} (${age} years old)`;
    
    logger.userAction('Assign button clicked', { age, isDisabled, description });
    
    try {
      const response = await assignArrival(age, isDisabled);
      setLastAssignment(response);
      setAssignmentHistory([response, ...assignmentHistory.slice(0, 9)]); // Keep last 10
      
      // Track assignment count per level
      setLevelAssignments(prev => ({
        ...prev,
        [response.level]: prev[response.level as 1 | 2 | 3] + 1
      }));
      
      logger.info('Assignment successful', { age, isDisabled, response });
      
      // Fetch updated metrics
      await fetchMetrics();
    } catch (err) {
      const errorMessage = 'Failed to assign level';
      logger.error(errorMessage, err as Error);
      setError(errorMessage);
      setLastAssignment(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchAssign = async (scenarios: Array<{ age: number; isDisabled: boolean; count: number }>) => {
    setIsLoading(true);
    setError(null);
    logger.userAction('Batch assign started', scenarios);
    
    try {
      const assignments: ArrivalAssignmentResponse[] = [];
      
      const levelCounts = { 1: 0, 2: 0, 3: 0 };
      
      for (const scenario of scenarios) {
        for (let i = 0; i < scenario.count; i++) {
          const response = await assignArrival(scenario.age, scenario.isDisabled);
          assignments.push(response);
          levelCounts[response.level as 1 | 2 | 3]++;
          // Small delay to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      // Update level assignment counts
      setLevelAssignments(prev => ({
        1: prev[1] + levelCounts[1],
        2: prev[2] + levelCounts[2],
        3: prev[3] + levelCounts[3]
      }));
      
      setAssignmentHistory([...assignments.slice(0, 10)]); // Keep last 10
      setLastAssignment(assignments[assignments.length - 1]);
      logger.info('Batch assignment successful', { total: assignments.length });
      
      await fetchMetrics();
    } catch (err) {
      const errorMessage = 'Batch assignment failed';
      logger.error(errorMessage, err as Error);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateConfig = async () => {
    setIsLoading(true);
    setError(null);
    logger.userAction('Update config clicked');
    
    try {
      const configUpdate: any = {};
      
      if (configForm.alpha1) {
        configUpdate.alpha1 = parseFloat(configForm.alpha1);
      }
      if (configForm.targetUtilL1) {
        configUpdate.targetUtilL1 = parseFloat(configForm.targetUtilL1);
      }
      if (configForm.controllerGain) {
        configUpdate.controllerGain = parseFloat(configForm.controllerGain);
      }
      if (configForm.softGateBandYears) {
        configUpdate.softGateBandYears = parseFloat(configForm.softGateBandYears);
      }
      if (configForm.slidingWindowMinutes) {
        configUpdate.window = {
          mode: configForm.windowMode,
          minutes: parseFloat(configForm.slidingWindowMinutes),
        };
      }
      
      const response = await updateConfig(configUpdate);
      setConfig(response);
      setEditingConfig(false);
      logger.info('Config updated successfully', response);
      await fetchMetrics();
    } catch (err) {
      const errorMessage = 'Failed to update config';
      logger.error(errorMessage, err as Error);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSimulation = () => {
    setLevelAssignments({ 1: 0, 2: 0, 3: 0 });
    setAssignmentHistory([]);
    setLastAssignment(null);
    logger.userAction('Simulation reset');
  };

  const handleBack = () => {
    logger.userAction('Back button clicked');
    onBack();
  };

  const getOccupancyColor = (occupancy: number | undefined): string => {
    if (!occupancy) return 'neutral';
    if (occupancy < 30) return 'good';
    if (occupancy < 50) return 'warning';
    return 'danger';
  };

  return (
    <Container variant="PAGE">
      <Header 
        title="📊 Capacity-Based Load Balancer with Soft Gate"
        actions={
          <div className="header-actions">
            <span className={`health-badge ${healthStatus.toLowerCase()}`}>
              {healthStatus === 'OK' ? '✓' : '⚠'} {healthStatus}
            </span>
            <Button variant="SECONDARY" onClick={handleBack}>
              Back to Dashboard
            </Button>
          </div>
        }
      />
      
      <main className="load-balancer-content">
        <Card variant="welcome" title="Capacity-Based Load Balancer with Soft Gate">
          <p className="load-balancer-description">
            <strong>Adaptive load balancing with hard capacity limits and smooth probabilistic transitions:</strong>
          </p>
          <div className="architecture-overview">
            <div className="arch-item">
              <span className="arch-icon">🎯</span>
              <div>
                <strong>Capacity-Based</strong>: Hard limits protect each level
                <br/><small>L1: 500 soft / 550 hard | L2: 3000 | L3: 3000 | 45-min dwell time</small>
              </div>
            </div>
            <div className="arch-item">
              <span className="arch-icon">🎛️</span>
              <div>
                <strong>Utilization Controller</strong>: Auto-adjusts alpha1 to target 90% L1 utilization
                <br/><small>Feedback loop runs every minute to optimize Level 1 occupancy</small>
              </div>
            </div>
            <div className="arch-item">
              <span className="arch-icon">📈</span>
              <div>
                <strong>Sigmoid Soft Gate</strong>: Smooth probability curve around age cutoff
                <br/><small>No hard jumps - uses probabilistic assignment near cutoff (±6 years)</small>
              </div>
            </div>
            <div className="arch-item">
              <span className="arch-icon">⚡</span>
              <div>
                <strong>Rate Limited</strong>: Max 11 per minute to Level 1
                <br/><small>Prevents bursts from overwhelming capacity</small>
              </div>
            </div>
          </div>
          <p className="load-balancer-description" style={{ marginTop: '1rem', fontWeight: '600', color: '#2196f3' }}>
            💡 Disabled always → L1 | Non-disabled → Sigmoid probability based on age vs dynamic cutoff
          </p>
          <div className="info-banner" style={{ marginTop: '1rem', padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
            <strong>🧮 System Flow:</strong>
            <br/>
            <code>1. Controller adjusts alpha1 based on L1 utilization (target: 90%)</code>
            <br/>
            <code>2. Age cutoff = tau-quantile where tau = 1 - (alpha1 - p_disabled)</code>
            <br/>
            <code>3. Sigmoid: p(L1) = 1 / (1 + exp(-(age - cutoff) / 3))</code>
            <br/>
            <code>4. Assign based on probability, capacity, and rate limit</code>
            <br/><br/>
            <strong>Example:</strong> If alpha1=8% and 2% disabled, cutoff=94th percentile. Age 72 near cutoff → ~50% chance L1.
          </div>
        </Card>

        {error && (
          <div className="load-balancer-error">
            <p>⚠ {error}</p>
            <Button variant="SECONDARY" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="simulation-section">
          <h2>📱 Mobile App Simulation: Assign Pilgrims</h2>
          <p className="section-description">
            These buttons simulate mobile app calls to <code>POST /api/LoadBalancer/arrivals/assign</code>.
            In production, mobile apps send pilgrim data and receive level assignments.
          </p>
          <div className="button-grid">
            <Button
              variant="PRIMARY"
              onClick={() => handleAssign(75, true)}
              disabled={isLoading}
              className="test-button disabled-old"
            >
              <span className="button-icon">♿</span>
              <span className="button-label">Disabled + Old</span>
              <span className="button-subtitle">75 years, disabled</span>
            </Button>
            
            <Button
              variant="PRIMARY"
              onClick={() => handleAssign(70, false)}
              disabled={isLoading}
              className="test-button elderly"
            >
              <span className="button-icon">👴</span>
              <span className="button-label">Elderly</span>
              <span className="button-subtitle">70 years, non-disabled</span>
            </Button>
            
            <Button
              variant="PRIMARY"
              onClick={() => handleAssign(50, false)}
              disabled={isLoading}
              className="test-button middle-aged"
            >
              <span className="button-icon">👨</span>
              <span className="button-label">Middle Aged</span>
              <span className="button-subtitle">50 years, non-disabled</span>
            </Button>
            
            <Button
              variant="PRIMARY"
              onClick={() => handleAssign(25, false)}
              disabled={isLoading}
              className="test-button young"
            >
              <span className="button-icon">🧑</span>
              <span className="button-label">Young</span>
              <span className="button-subtitle">25 years, non-disabled</span>
            </Button>
            
            <Button
              variant="PRIMARY"
              onClick={() => handleAssign(35, true)}
              disabled={isLoading}
              className="test-button disabled-young"
            >
              <span className="button-icon">♿</span>
              <span className="button-label">Disabled + Young</span>
              <span className="button-subtitle">35 years, disabled</span>
            </Button>
            
            <Button
              variant="PRIMARY"
              onClick={() => handleAssign(85, false)}
              disabled={isLoading}
              className="test-button very-old"
            >
              <span className="button-icon">👵</span>
              <span className="button-label">Very Elderly</span>
              <span className="button-subtitle">85 years, non-disabled</span>
            </Button>
          </div>
        </div>

        {/* Advanced Test Scenarios */}
        <div className="simulation-section">
          <h2>🎯 Advanced Scenarios</h2>
          <div className="button-grid advanced">
            <Button
              variant="SECONDARY"
              onClick={() => handleBatchAssign([
                { age: 75, isDisabled: true, count: 5 },
                { age: 70, isDisabled: false, count: 3 },
                { age: 25, isDisabled: false, count: 7 },
              ])}
              disabled={isLoading}
            >
              <span className="button-label">Mixed Group</span>
              <span className="button-subtitle">5 disabled old + 3 elderly + 7 young</span>
            </Button>
            
            <Button
              variant="SECONDARY"
              onClick={() => handleBatchAssign([
                { age: 80, isDisabled: true, count: 20 },
              ])}
              disabled={isLoading}
            >
              <span className="button-label">Disabled Wave</span>
              <span className="button-subtitle">20 disabled elderly arrivals</span>
            </Button>
            
            <Button
              variant="SECONDARY"
              onClick={() => handleBatchAssign([
                { age: 30, isDisabled: false, count: 30 },
              ])}
              disabled={isLoading}
            >
              <span className="button-label">Youth Rush</span>
              <span className="button-subtitle">30 young arrivals</span>
            </Button>
            
            <Button
              variant="SECONDARY"
              onClick={() => handleBatchAssign([
                { age: 75, isDisabled: false, count: 15 },
              ])}
              disabled={isLoading}
            >
              <span className="button-label">Senior Group</span>
              <span className="button-subtitle">15 elderly (non-disabled)</span>
            </Button>
          </div>
        </div>

        {/* Edge Cases */}
        <div className="simulation-section">
          <h2>🔬 Edge Cases</h2>
          <div className="button-grid edge-cases">
            <Button
              variant="SECONDARY"
              onClick={() => handleAssign(18, false)}
              disabled={isLoading}
            >
              <span className="button-label">Min Age</span>
              <span className="button-subtitle">18 years old</span>
            </Button>
            
            <Button
              variant="SECONDARY"
              onClick={() => handleAssign(100, false)}
              disabled={isLoading}
            >
              <span className="button-label">Max Age</span>
              <span className="button-subtitle">100 years old</span>
            </Button>
            
            <Button
              variant="SECONDARY"
              onClick={() => handleAssign(18, true)}
              disabled={isLoading}
            >
              <span className="button-label">Min Age + Disabled</span>
              <span className="button-subtitle">18 years, disabled</span>
            </Button>
            
            <Button
              variant="SECONDARY"
              onClick={() => {
                const randomAge = Math.floor(Math.random() * (100 - 18 + 1)) + 18;
                const randomDisabled = Math.random() > 0.5;
                handleAssign(randomAge, randomDisabled);
              }}
              disabled={isLoading}
            >
              <span className="button-label">Random</span>
              <span className="button-subtitle">Random age & status</span>
            </Button>
          </div>
        </div>

        {/* Dashboard Controls */}
        <div className="simulation-section dashboard-controls">
          <h2>📊 Metrics Dashboard</h2>
          <div className="info-banner info-banner-dashboard">
            <strong>ℹ️ Real-Time Monitoring:</strong> View live occupancy counts, age cutoff, and distribution metrics. 
            Enable auto-refresh to continuously poll <code>GET /metrics</code> endpoint.
          </div>
          
          <div className="dashboard-controls-row">
            <div className="control-group">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="toggle-checkbox"
                />
                <span className="toggle-text">
                  {autoRefresh ? '🟢 Auto-Refresh ON' : '⚪ Auto-Refresh OFF'}
                </span>
              </label>
              <small className="control-hint">
                {autoRefresh ? `Fetching metrics every ${refreshInterval} seconds` : 'Manually refresh metrics as needed'}
              </small>
            </div>
            
            <div className="control-group">
              <label>Refresh Interval (seconds):</label>
              <select 
                value={refreshInterval} 
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                disabled={!autoRefresh}
                className="interval-select"
              >
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
                <option value={15}>15 seconds (recommended)</option>
                <option value={30}>30 seconds</option>
                <option value={60}>60 seconds</option>
              </select>
            </div>
            
            <Button
              variant="SECONDARY"
              onClick={fetchMetrics}
              disabled={isLoading}
            >
              🔄 Refresh Now
            </Button>
            
            <Button
              variant="SECONDARY"
              onClick={handleResetSimulation}
              disabled={isLoading}
            >
              ♻️ Reset Simulation
            </Button>
          </div>
          
          <div className="assignment-counts">
            <div className="count-card level-1-count">
              <div className="count-label">Level 1 Assignments</div>
              <div className="count-value">{levelAssignments[1]}</div>
              <div className="count-note">Priority: Disabled + Elderly</div>
            </div>
            <div className="count-card level-2-count">
              <div className="count-label">Level 2 Assignments</div>
              <div className="count-value">{levelAssignments[2]}</div>
              <div className="count-note">General (load balanced)</div>
            </div>
            <div className="count-card level-3-count">
              <div className="count-label">Level 3 Assignments</div>
              <div className="count-value">{levelAssignments[3]}</div>
              <div className="count-note">General (load balanced)</div>
            </div>
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="simulation-section">
          <div className="section-header">
            <h2>⚙️ Configuration</h2>
            <Button
              variant="SECONDARY"
              onClick={() => setEditingConfig(!editingConfig)}
            >
              {editingConfig ? 'Cancel' : 'Edit Config'}
            </Button>
          </div>
          
          {config && !editingConfig && (
            <div className="config-display">
              <div className="config-grid">
                <div className="config-item">
                  <span className="config-label">Alpha1 (Current):</span>
                  <span className="config-value">
                    {config.alpha1 != null ? `${(config.alpha1 * 100).toFixed(2)}%` : 'N/A'}
                  </span>
                </div>
                <div className="config-item">
                  <span className="config-label">Alpha1 Range:</span>
                  <span className="config-value">
                    {config.alpha1Min != null && config.alpha1Max != null
                      ? `${(config.alpha1Min * 100).toFixed(1)}% - ${(config.alpha1Max * 100).toFixed(1)}%`
                      : 'N/A'}
                  </span>
                </div>
                {config.targetUtilL1 != null && (
                  <div className="config-item">
                    <span className="config-label">Target L1 Utilization:</span>
                    <span className="config-value">{(config.targetUtilL1 * 100).toFixed(0)}%</span>
                  </div>
                )}
                {config.controllerGain != null && (
                  <div className="config-item">
                    <span className="config-label">Controller Gain:</span>
                    <span className="config-value">{config.controllerGain.toFixed(3)}</span>
                  </div>
                )}
                {config.softGateBandYears != null && (
                  <div className="config-item">
                    <span className="config-label">Soft Gate Band:</span>
                    <span className="config-value">{config.softGateBandYears} years</span>
                  </div>
                )}
                {config.dwellMinutes != null && (
                  <div className="config-item">
                    <span className="config-label">Dwell Time:</span>
                    <span className="config-value">{config.dwellMinutes} min</span>
                  </div>
                )}
                <div className="config-item">
                  <span className="config-label">Window Mode:</span>
                  <span className="config-value">
                    {config.windowMode || 'sliding'} ({config.slidingWindowMinutes || 45} min)
                  </span>
                </div>
                {config.capacity && (
                  <>
                    <div className="config-item">
                      <span className="config-label">L1 Capacity:</span>
                      <span className="config-value">{config.capacity.l1CapSoft} soft / {config.capacity.l1CapHard} hard</span>
                    </div>
                    <div className="config-item">
                      <span className="config-label">L2/L3 Capacity:</span>
                      <span className="config-value">{config.capacity.l2Cap} each</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          
          {editingConfig && (
            <div className="config-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Alpha1 (Initial Target)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.05"
                    max="0.12"
                    value={configForm.alpha1}
                    onChange={(e) => setConfigForm({ ...configForm, alpha1: e.target.value })}
                    placeholder="0.0769"
                  />
                  <small>Range: 0.05 - 0.12 (controller will adjust)</small>
                </div>
                <div className="form-group">
                  <label>Target L1 Utilization</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.70"
                    max="0.98"
                    value={configForm.targetUtilL1}
                    onChange={(e) => setConfigForm({ ...configForm, targetUtilL1: e.target.value })}
                    placeholder="0.90"
                  />
                  <small>Target: 90% of soft capacity (450/500)</small>
                </div>
                <div className="form-group">
                  <label>Controller Gain</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="0.20"
                    value={configForm.controllerGain}
                    onChange={(e) => setConfigForm({ ...configForm, controllerGain: e.target.value })}
                    placeholder="0.05"
                  />
                  <small>Feedback controller sensitivity (default: 0.05)</small>
                </div>
                <div className="form-group">
                  <label>Soft Gate Band (years)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="10"
                    value={configForm.softGateBandYears}
                    onChange={(e) => setConfigForm({ ...configForm, softGateBandYears: e.target.value })}
                    placeholder="3.0"
                  />
                  <small>Sigmoid transition width (default: 3 years)</small>
                </div>
                <div className="form-group">
                  <label>Sliding Window (minutes)</label>
                  <input
                    type="number"
                    step="5"
                    value={configForm.slidingWindowMinutes}
                    onChange={(e) => setConfigForm({ ...configForm, slidingWindowMinutes: e.target.value })}
                    placeholder="45"
                  />
                  <small>Rolling window for tracking arrivals</small>
                </div>
                <div className="form-group">
                  <label>Window Mode</label>
                  <select
                    value={configForm.windowMode}
                    onChange={(e) => setConfigForm({ ...configForm, windowMode: e.target.value })}
                  >
                    <option value="sliding">Sliding Window</option>
                    <option value="decay">Exponential Decay</option>
                  </select>
                  <small>Method for tracking recent arrivals</small>
                </div>
              </div>
              <Button
                variant="PRIMARY"
                onClick={handleUpdateConfig}
                disabled={isLoading}
              >
                Save Configuration
              </Button>
            </div>
          )}
        </div>

        {/* Latest Assignment */}
        {lastAssignment && (
          <div className="assignment-result">
            <h3>✅ Latest Assignment</h3>
            <div className="assignment-details">
              <div className="assignment-header">
                <span className={`level-badge level-${lastAssignment.level}`}>
                  Level {lastAssignment.level}
                </span>
                <span className="trace-id">Trace: {lastAssignment.traceId.substring(0, 8)}...</span>
              </div>
              <div className="assignment-info">
                <div className="info-row">
                  <span className="info-label">Pilgrim:</span>
                  <span className="info-value">
                    {lastAssignment.decision.age} years, {lastAssignment.decision.isDisabled ? 'Disabled' : 'Non-disabled'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Age Cutoff:</span>
                  <span className="info-value">
                    {lastAssignment.decision.ageCutoff != null 
                      ? `${lastAssignment.decision.ageCutoff.toFixed(1)} years` 
                      : 'N/A'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Alpha1:</span>
                  <span className="info-value">
                    {lastAssignment.decision.alpha1 != null
                      ? `${(lastAssignment.decision.alpha1 * 100).toFixed(1)}%`
                      : 'N/A'}
                  </span>
                </div>
                {lastAssignment.decision.pDisabled != null && (
                  <div className="info-row">
                    <span className="info-label">P(Disabled):</span>
                    <span className="info-value">{(lastAssignment.decision.pDisabled * 100).toFixed(1)}%</span>
                  </div>
                )}
                <div className="info-row reason">
                  <span className="info-label">Reason:</span>
                  <span className="info-value">{lastAssignment.decision.reason}</span>
                </div>
              </div>
              {(lastAssignment.decision.occupancy || lastAssignment.decision.waitEst) && (
                <div className="wait-times">
                  <h4>Occupancy at Assignment Time:</h4>
                  {(() => {
                    const occ = lastAssignment.decision.occupancy || lastAssignment.decision.waitEst;
                    return (
                      <>
                        {occ && occ[1] != null && (
                          <div className="wait-item">
                            <span>L1: {occ[1]} people</span>
                          </div>
                        )}
                        {occ && occ[2] != null && (
                          <div className="wait-item">
                            <span>L2: {occ[2]} people</span>
                          </div>
                        )}
                        {occ && occ[3] != null && (
                          <div className="wait-item">
                            <span>L3: {occ[3]} people</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Assignment History */}
        {assignmentHistory.length > 0 && (
          <div className="simulation-section">
            <h2>📜 Recent Assignments (Last 10)</h2>
            <div className="history-list">
              {assignmentHistory.map((assignment, idx) => (
                <div key={idx} className="history-item">
                  <span className={`level-badge level-${assignment.level}`}>L{assignment.level}</span>
                  <span className="history-age">{assignment.decision.age}y</span>
                  <span className="history-status">
                    {assignment.decision.isDisabled ? '♿ Disabled' : '👤 Non-disabled'}
                  </span>
                  <span className="history-reason">{assignment.decision.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metrics Display */}
        {metrics && (
          <div className="simulation-section">
            <h2>📊 System Metrics</h2>
            
            {/* Controller State */}
            <div className="metrics-card">
              <h3>🎛️ Feedback Controller State</h3>
              <div className="metrics-grid">
                <div className="metric-item primary">
                  <div className="metric-label">Alpha1 (Current)</div>
                  <div className="metric-value">
                    {metrics.alpha1 != null ? `${(metrics.alpha1 * 100).toFixed(2)}%` : 'N/A'}
                  </div>
                  <small>Auto-adjusted by controller</small>
                </div>
                <div className="metric-item primary">
                  <div className="metric-label">Target L1 Utilization</div>
                  <div className="metric-value">
                    {metrics.targetUtilL1 != null ? `${(metrics.targetUtilL1 * 100).toFixed(0)}%` : 'N/A'}
                  </div>
                  <small>Controller target (typically 90%)</small>
                </div>
                <div className="metric-item primary">
                  <div className="metric-label">Age Cutoff</div>
                  <div className="metric-value">
                    {metrics.ageCutoff != null ? `${metrics.ageCutoff.toFixed(1)} years` : 'N/A (insufficient data)'}
                  </div>
                  <small>Dynamic cutoff from quantiles</small>
                </div>
                <div className="metric-item primary">
                  <div className="metric-label">P(Disabled)</div>
                  <div className="metric-value">
                    {metrics.pDisabled != null ? `${(metrics.pDisabled * 100).toFixed(1)}%` : 'N/A'}
                  </div>
                  <small>Fraction of disabled arrivals</small>
                </div>
              </div>
            </div>
            
            {/* Capacity Info */}
            {metrics.capacity && (
              <div className="metrics-card">
                <h3>🎯 Capacity Limits</h3>
                <div className="metrics-grid">
                  <div className="metric-item">
                    <div className="metric-label">Level 1 (Soft / Hard)</div>
                    <div className="metric-value">{metrics.capacity.l1CapSoft} / {metrics.capacity.l1CapHard}</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-label">Level 2</div>
                    <div className="metric-value">{metrics.capacity.l2Cap}</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-label">Level 3</div>
                    <div className="metric-value">{metrics.capacity.l3Cap}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Arrival Counts */}
            {metrics.counts && (
              <div className="metrics-card">
                <h3>👥 Arrival Counts (Rolling Window)</h3>
                <div className="metrics-grid">
                  <div className="metric-item">
                    <div className="metric-label">Total Arrivals</div>
                    <div className="metric-value">{metrics.counts.total || 0}</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-label">Disabled</div>
                    <div className="metric-value">{metrics.counts.disabled || 0}</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-label">Non-Disabled</div>
                    <div className="metric-value">{metrics.counts.nonDisabled || 0}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Quantiles */}
            <div className="metrics-card">
              <h3>📈 Age Quantiles (Non-Disabled)</h3>
              {metrics.quantilesNonDisabledAge && metrics.counts && metrics.counts.nonDisabled > 0 ? (
                <div className="metrics-grid">
                  <div className="metric-item">
                    <div className="metric-label">50th Percentile (Median)</div>
                    <div className="metric-value">
                      {metrics.quantilesNonDisabledAge.q50?.toFixed(1) ?? 'N/A'} years
                    </div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-label">80th Percentile</div>
                    <div className="metric-value">
                      {metrics.quantilesNonDisabledAge.q80?.toFixed(1) ?? 'N/A'} years
                    </div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-label">90th Percentile</div>
                    <div className="metric-value">
                      {metrics.quantilesNonDisabledAge.q90?.toFixed(1) ?? 'N/A'} years
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-data">No non-disabled arrivals yet</div>
              )}
            </div>

            {/* Level Occupancy */}
            {metrics.levels && (
              <div className="metrics-card">
                <h3>🏛️ Level Occupancy & Utilization</h3>
                <div className="levels-grid">
                  {[1, 2, 3].map((levelNum) => {
                    const level = metrics.levels?.[levelNum as 1 | 2 | 3];
                    const occupancy = level?.occupancy || level?.waitEst || level?.queueLength || 0;
                    const capacity = level?.capacity;
                    const utilization = level?.utilization;
                    
                    // Get capacity from config if not in level metrics
                    const capFromConfig = metrics.capacity 
                      ? (levelNum === 1 ? metrics.capacity.l1CapSoft : 
                         levelNum === 2 ? metrics.capacity.l2Cap : metrics.capacity.l3Cap)
                      : null;
                    
                    const effectiveCap = capacity || capFromConfig;
                    const effectiveUtil = utilization != null 
                      ? utilization 
                      : (effectiveCap ? occupancy / effectiveCap : null);
                  
                  return (
                    <div key={levelNum} className={`level-card level-${levelNum}`}>
                      <h4>Level {levelNum}</h4>
                      {level || occupancy > 0 ? (
                        <>
                          <div className="level-stat">
                            <span className="stat-label">Occupancy:</span>
                            <span className={`stat-value wait-${getOccupancyColor(occupancy)}`}>
                              {occupancy} people
                            </span>
                          </div>
                          {effectiveCap && (
                            <>
                              <div className="level-stat">
                                <span className="stat-label">Capacity:</span>
                                <span className="stat-value">{effectiveCap}</span>
                              </div>
                              <div className="level-stat">
                                <span className="stat-label">Utilization:</span>
                                <span className={`stat-value wait-${
                                  effectiveUtil == null ? 'neutral' :
                                  effectiveUtil < 0.7 ? 'good' :
                                  effectiveUtil < 0.95 ? 'warning' : 'danger'
                                }`}>
                                  {effectiveUtil != null ? `${(effectiveUtil * 100).toFixed(1)}%` : 'N/A'}
                                </span>
                              </div>
                            </>
                          )}
                          <div className="level-stat">
                            <span className="stat-label">Purpose:</span>
                            <span className="stat-value">
                              {levelNum === 1 ? 'Disabled + Elderly (soft gate)' : 'General (balanced)'}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="no-data">No data</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            )}
          </div>
        )}
      </main>
    </Container>
  );
};

export default LoadBalancerSimulation;
