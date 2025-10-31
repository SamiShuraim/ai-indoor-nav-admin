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
        alpha1: data.alpha1.toString(),
        slidingWindowMinutes: data.slidingWindowMinutes.toString(),
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
        title="📊 Quantile-Based Occupancy Load Balancer"
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
        <Card variant="welcome" title="Quantile-Based Occupancy Load Balancer">
          <p className="load-balancer-description">
            <strong>Distribution-driven load balancing with dynamic age cutoffs:</strong>
          </p>
          <div className="architecture-overview">
            <div className="arch-item">
              <span className="arch-icon">📊</span>
              <div>
                <strong>Quantile-Based</strong>: Age cutoff computed from distribution of recent arrivals
                <br/><small>Adapts automatically to population (young vs old crowds)</small>
              </div>
            </div>
            <div className="arch-item">
              <span className="arch-icon">👥</span>
              <div>
                <strong>Occupancy-Driven</strong>: Tracks how many people are at each level
                <br/><small>No wait times - people perform ritual for 45 minutes and leave</small>
              </div>
            </div>
            <div className="arch-item">
              <span className="arch-icon">⚙️</span>
              <div>
                <strong>User-Configured</strong>: Set target share for Level 1 (alpha1)
                <br/><small>System adapts dynamically to disabled fraction and age distribution</small>
              </div>
            </div>
          </div>
          <p className="load-balancer-description" style={{ marginTop: '1rem', fontWeight: '600', color: '#2196f3' }}>
            💡 How it works: Disabled → Level 1 | Age ≥ cutoff → Level 1 | Age &lt; cutoff → Least crowded of 2/3
          </p>
          <div className="info-banner" style={{ marginTop: '1rem', padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
            <strong>🧮 Dynamic Age Cutoff Calculation:</strong>
            <br/>
            <code>share_left_for_old = alpha1 - p_disabled</code>
            <br/>
            <code>tau = 1 - share_left_for_old</code>
            <br/>
            <code>age_cutoff = tau-quantile of non-disabled ages</code>
            <br/><br/>
            <strong>Example:</strong> If alpha1=35% and 15% are disabled, then 20% of non-disabled should go to Level 1.
            That means the top 20% oldest → Level 1, which is the 80th percentile cutoff.
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
                  <span className="config-label">Alpha1 (Target Share for Level 1):</span>
                  <span className="config-value">{(config.alpha1 * 100).toFixed(1)}%</span>
                </div>
                <div className="config-item">
                  <span className="config-label">Alpha1 Range:</span>
                  <span className="config-value">{(config.alpha1Min * 100).toFixed(0)}% - {(config.alpha1Max * 100).toFixed(0)}%</span>
                </div>
                <div className="config-item">
                  <span className="config-label">Window Mode:</span>
                  <span className="config-value">{config.windowMode}</span>
                </div>
                <div className="config-item">
                  <span className="config-label">Sliding Window:</span>
                  <span className="config-value">{config.slidingWindowMinutes} min</span>
                </div>
                {config.halfLifeMinutes && (
                  <div className="config-item">
                    <span className="config-label">Half-Life:</span>
                    <span className="config-value">{config.halfLifeMinutes} min</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {editingConfig && (
            <div className="config-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Alpha1 (Target Share for Level 1)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.15"
                    max="0.55"
                    value={configForm.alpha1}
                    onChange={(e) => setConfigForm({ ...configForm, alpha1: e.target.value })}
                    placeholder="0.35"
                  />
                  <small>Range: 0.15 - 0.55 (default: 0.35 = 35%)</small>
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
                  <small>Rolling window for tracking arrivals (default: 45 min)</small>
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
              {lastAssignment.decision.waitEst && (
                <div className="wait-times">
                  <h4>Occupancy at Assignment Time:</h4>
                  {lastAssignment.decision.waitEst[1] != null && (
                    <div className="wait-item">
                      <span>L1: {lastAssignment.decision.waitEst[1]} people</span>
                    </div>
                  )}
                  {lastAssignment.decision.waitEst[2] != null && (
                    <div className="wait-item">
                      <span>L2: {lastAssignment.decision.waitEst[2]} people</span>
                    </div>
                  )}
                  {lastAssignment.decision.waitEst[3] != null && (
                    <div className="wait-item">
                      <span>L3: {lastAssignment.decision.waitEst[3]} people</span>
                    </div>
                  )}
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
            
            {/* Distribution Metrics */}
            <div className="metrics-card">
              <h3>📊 Distribution Metrics</h3>
              <div className="metrics-grid">
                <div className="metric-item primary">
                  <div className="metric-label">Alpha1 (Target Share for L1)</div>
                  <div className="metric-value">
                    {metrics.alpha1 != null ? `${(metrics.alpha1 * 100).toFixed(1)}%` : 'N/A'}
                  </div>
                  <small>User-configured target</small>
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
                <h3>🏛️ Level Occupancy</h3>
                <div className="levels-grid">
                  {[1, 2, 3].map((levelNum) => {
                    const level = metrics.levels?.[levelNum as 1 | 2 | 3];
                    const occupancy = level?.waitEst || level?.queueLength || 0;
                  return (
                    <div key={levelNum} className={`level-card level-${levelNum}`}>
                      <h4>Level {levelNum}</h4>
                      {level ? (
                        <>
                          <div className="level-stat">
                            <span className="stat-label">Current Occupancy:</span>
                            <span className={`stat-value wait-${getOccupancyColor(occupancy)}`}>
                              {occupancy} people
                            </span>
                          </div>
                          <div className="level-stat">
                            <span className="stat-label">Purpose:</span>
                            <span className="stat-value">
                              {levelNum === 1 ? 'Disabled + Elderly' : 'General (load balanced)'}
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
