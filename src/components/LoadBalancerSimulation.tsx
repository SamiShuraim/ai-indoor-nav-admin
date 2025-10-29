import React, { useEffect, useState } from 'react';
import { createLogger } from '../utils/logger';
import {
  assignArrival,
  updateLevelState,
  triggerControlTick,
  getMetrics,
  updateConfig,
  getConfig,
  getHealth,
  ArrivalAssignmentResponse,
  MetricsResponse,
  ConfigResponse,
  LevelStateUpdate,
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
  
  // Config edit state
  const [editingConfig, setEditingConfig] = useState(false);
  const [configForm, setConfigForm] = useState({
    alpha1: '',
    waitTargetMinutes: '',
    controllerGain: '',
    slidingWindowMinutes: '',
  });
  
  // Level state edit
  const [levelStateForm, setLevelStateForm] = useState({
    level1Wait: '',
    level2Wait: '',
    level3Wait: '',
    level1Queue: '',
    level2Queue: '',
    level3Queue: '',
  });

  useEffect(() => {
    logger.info('LoadBalancerSimulation component mounted');
    initializeData();
    
    return () => {
      logger.info('LoadBalancerSimulation component unmounted');
    };
  }, []);

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
        waitTargetMinutes: data.waitTargetMinutes.toString(),
        controllerGain: data.controllerGain.toString(),
        slidingWindowMinutes: data.window.minutes.toString(),
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
      
      for (const scenario of scenarios) {
        for (let i = 0; i < scenario.count; i++) {
          const response = await assignArrival(scenario.age, scenario.isDisabled);
          assignments.push(response);
          // Small delay to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
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

  const handleUpdateLevelState = async () => {
    setIsLoading(true);
    setError(null);
    logger.userAction('Update level state clicked');
    
    try {
      const levels: LevelStateUpdate[] = [];
      
      if (levelStateForm.level1Wait) {
        levels.push({ level: 1, waitEst: parseFloat(levelStateForm.level1Wait) });
      }
      if (levelStateForm.level2Wait) {
        levels.push({ level: 2, waitEst: parseFloat(levelStateForm.level2Wait) });
      }
      if (levelStateForm.level3Wait) {
        levels.push({ level: 3, waitEst: parseFloat(levelStateForm.level3Wait) });
      }
      
      if (levelStateForm.level1Queue) {
        const existing = levels.find(l => l.level === 1);
        if (existing) {
          existing.queueLen = parseInt(levelStateForm.level1Queue);
        } else {
          levels.push({ level: 1, queueLen: parseInt(levelStateForm.level1Queue) });
        }
      }
      if (levelStateForm.level2Queue) {
        const existing = levels.find(l => l.level === 2);
        if (existing) {
          existing.queueLen = parseInt(levelStateForm.level2Queue);
        } else {
          levels.push({ level: 2, queueLen: parseInt(levelStateForm.level2Queue) });
        }
      }
      if (levelStateForm.level3Queue) {
        const existing = levels.find(l => l.level === 3);
        if (existing) {
          existing.queueLen = parseInt(levelStateForm.level3Queue);
        } else {
          levels.push({ level: 3, queueLen: parseInt(levelStateForm.level3Queue) });
        }
      }
      
      if (levels.length > 0) {
        await updateLevelState(levels);
        logger.info('Level state updated successfully', levels);
        await fetchMetrics();
      } else {
        setError('Please enter at least one level state value');
      }
    } catch (err) {
      const errorMessage = 'Failed to update level state';
      logger.error(errorMessage, err as Error);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleControlTick = async () => {
    setIsLoading(true);
    setError(null);
    logger.userAction('Control tick clicked');
    
    try {
      const response = await triggerControlTick();
      logger.info('Control tick successful', response);
      await fetchMetrics();
    } catch (err) {
      const errorMessage = 'Failed to trigger control tick';
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
      if (configForm.waitTargetMinutes) {
        configUpdate.waitTargetMinutes = parseFloat(configForm.waitTargetMinutes);
      }
      if (configForm.controllerGain) {
        configUpdate.controllerGain = parseFloat(configForm.controllerGain);
      }
      if (configForm.slidingWindowMinutes) {
        configUpdate.window = {
          mode: 'sliding',
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

  const handleBack = () => {
    logger.userAction('Back button clicked');
    onBack();
  };

  const getWaitColor = (waitTime: number | undefined, target: number): string => {
    if (!waitTime) return 'neutral';
    if (waitTime <= target) return 'good';
    if (waitTime <= target * 1.2) return 'warning';
    return 'danger';
  };

  return (
    <Container variant="PAGE">
      <Header 
        title="🚀 Adaptive Load Balancer Test Console"
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
        <Card variant="welcome" title="Adaptive Load Balancer Simulation">
          <p className="load-balancer-description">
            Test the new adaptive load balancer system with dynamic age cutoffs, feedback control, 
            and rolling statistics. The system automatically adjusts assignments based on real-time 
            congestion and arrival patterns.
          </p>
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
          <h2>⚡ Quick Test Scenarios</h2>
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

        {/* System Controls */}
        <div className="simulation-section system-controls">
          <h2>⚙️ System Controls</h2>
          <div className="controls-row">
            <Button
              variant="PRIMARY"
              onClick={handleControlTick}
              disabled={isLoading}
            >
              🔄 Trigger Controller Tick
            </Button>
            
            <Button
              variant="SECONDARY"
              onClick={fetchMetrics}
              disabled={isLoading}
            >
              📊 Refresh Metrics
            </Button>
            
            <Button
              variant="SECONDARY"
              onClick={checkHealth}
              disabled={isLoading}
            >
              🏥 Check Health
            </Button>
          </div>
        </div>

        {/* Level State Update */}
        <div className="simulation-section">
          <h2>📈 Update Level State</h2>
          <div className="level-state-form">
            <div className="form-row">
              <div className="form-group">
                <label>Level 1 Wait (min)</label>
                <input
                  type="number"
                  step="0.1"
                  value={levelStateForm.level1Wait}
                  onChange={(e) => setLevelStateForm({ ...levelStateForm, level1Wait: e.target.value })}
                  placeholder="e.g., 11.5"
                />
              </div>
              <div className="form-group">
                <label>Level 2 Wait (min)</label>
                <input
                  type="number"
                  step="0.1"
                  value={levelStateForm.level2Wait}
                  onChange={(e) => setLevelStateForm({ ...levelStateForm, level2Wait: e.target.value })}
                  placeholder="e.g., 15.0"
                />
              </div>
              <div className="form-group">
                <label>Level 3 Wait (min)</label>
                <input
                  type="number"
                  step="0.1"
                  value={levelStateForm.level3Wait}
                  onChange={(e) => setLevelStateForm({ ...levelStateForm, level3Wait: e.target.value })}
                  placeholder="e.g., 14.5"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Level 1 Queue</label>
                <input
                  type="number"
                  value={levelStateForm.level1Queue}
                  onChange={(e) => setLevelStateForm({ ...levelStateForm, level1Queue: e.target.value })}
                  placeholder="e.g., 120"
                />
              </div>
              <div className="form-group">
                <label>Level 2 Queue</label>
                <input
                  type="number"
                  value={levelStateForm.level2Queue}
                  onChange={(e) => setLevelStateForm({ ...levelStateForm, level2Queue: e.target.value })}
                  placeholder="e.g., 230"
                />
              </div>
              <div className="form-group">
                <label>Level 3 Queue</label>
                <input
                  type="number"
                  value={levelStateForm.level3Queue}
                  onChange={(e) => setLevelStateForm({ ...levelStateForm, level3Queue: e.target.value })}
                  placeholder="e.g., 210"
                />
              </div>
            </div>
            <Button
              variant="PRIMARY"
              onClick={handleUpdateLevelState}
              disabled={isLoading}
            >
              Update Level State
            </Button>
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
                  <span className="config-label">Alpha1 (Target):</span>
                  <span className="config-value">{config.alpha1.toFixed(3)}</span>
                </div>
                <div className="config-item">
                  <span className="config-label">Alpha1 Range:</span>
                  <span className="config-value">{config.alpha1Min.toFixed(2)} - {config.alpha1Max.toFixed(2)}</span>
                </div>
                <div className="config-item">
                  <span className="config-label">Wait Target:</span>
                  <span className="config-value">{config.waitTargetMinutes} min</span>
                </div>
                <div className="config-item">
                  <span className="config-label">Controller Gain:</span>
                  <span className="config-value">{config.controllerGain.toFixed(3)}</span>
                </div>
                <div className="config-item">
                  <span className="config-label">Window Mode:</span>
                  <span className="config-value">{config.window.mode} ({config.window.minutes} min)</span>
                </div>
                <div className="config-item">
                  <span className="config-label">Soft Gate:</span>
                  <span className="config-value">
                    {config.softGate.enabled ? `On (${config.softGate.bandYears}y)` : 'Off'}
                  </span>
                </div>
                <div className="config-item">
                  <span className="config-label">Randomization:</span>
                  <span className="config-value">
                    {config.randomization.enabled ? `On (${(config.randomization.rate * 100).toFixed(1)}%)` : 'Off'}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {editingConfig && (
            <div className="config-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Alpha1 Target</label>
                  <input
                    type="number"
                    step="0.01"
                    value={configForm.alpha1}
                    onChange={(e) => setConfigForm({ ...configForm, alpha1: e.target.value })}
                    placeholder="0.35"
                  />
                </div>
                <div className="form-group">
                  <label>Wait Target (min)</label>
                  <input
                    type="number"
                    step="1"
                    value={configForm.waitTargetMinutes}
                    onChange={(e) => setConfigForm({ ...configForm, waitTargetMinutes: e.target.value })}
                    placeholder="12"
                  />
                </div>
                <div className="form-group">
                  <label>Controller Gain</label>
                  <input
                    type="number"
                    step="0.001"
                    value={configForm.controllerGain}
                    onChange={(e) => setConfigForm({ ...configForm, controllerGain: e.target.value })}
                    placeholder="0.03"
                  />
                </div>
                <div className="form-group">
                  <label>Window (min)</label>
                  <input
                    type="number"
                    step="5"
                    value={configForm.slidingWindowMinutes}
                    onChange={(e) => setConfigForm({ ...configForm, slidingWindowMinutes: e.target.value })}
                    placeholder="45"
                  />
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
                  <span className="info-value">{lastAssignment.decision.ageCutoff.toFixed(1)} years</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Alpha1:</span>
                  <span className="info-value">{(lastAssignment.decision.alpha1 * 100).toFixed(1)}%</span>
                </div>
                <div className="info-row">
                  <span className="info-label">P(Disabled):</span>
                  <span className="info-value">{(lastAssignment.decision.pDisabled * 100).toFixed(1)}%</span>
                </div>
                <div className="info-row reason">
                  <span className="info-label">Reason:</span>
                  <span className="info-value">{lastAssignment.decision.reason}</span>
                </div>
              </div>
              <div className="wait-times">
                {lastAssignment.decision.waitEst[1] != null && (
                  <div className="wait-item">
                    <span>L1: {lastAssignment.decision.waitEst[1].toFixed(1)}m</span>
                  </div>
                )}
                {lastAssignment.decision.waitEst[2] != null && (
                  <div className="wait-item">
                    <span>L2: {lastAssignment.decision.waitEst[2].toFixed(1)}m</span>
                  </div>
                )}
                {lastAssignment.decision.waitEst[3] != null && (
                  <div className="wait-item">
                    <span>L3: {lastAssignment.decision.waitEst[3].toFixed(1)}m</span>
                  </div>
                )}
              </div>
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
            
            {/* Controller Metrics */}
            <div className="metrics-card">
              <h3>🎛️ Controller State</h3>
              <div className="metrics-grid">
                <div className="metric-item primary">
                  <div className="metric-label">Alpha1 (Target)</div>
                  <div className="metric-value">{(metrics.alpha1 * 100).toFixed(1)}%</div>
                </div>
                <div className="metric-item primary">
                  <div className="metric-label">Age Cutoff</div>
                  <div className="metric-value">
                    {metrics.ageCutoff != null ? `${metrics.ageCutoff.toFixed(1)} years` : 'N/A'}
                  </div>
                </div>
                <div className="metric-item primary">
                  <div className="metric-label">P(Disabled)</div>
                  <div className="metric-value">
                    {metrics.pDisabled != null ? `${(metrics.pDisabled * 100).toFixed(1)}%` : 'N/A'}
                  </div>
                </div>
                <div className="metric-item">
                  <div className="metric-label">Wait Target</div>
                  <div className="metric-value">{metrics.waitTargetMinutes} min</div>
                </div>
                <div className="metric-item">
                  <div className="metric-label">Controller Gain</div>
                  <div className="metric-value">
                    {metrics.controllerGain != null ? metrics.controllerGain.toFixed(3) : 'N/A'}
                  </div>
                </div>
                <div className="metric-item">
                  <div className="metric-label">Alpha1 Range</div>
                  <div className="metric-value">
                    {metrics.alpha1Min != null && metrics.alpha1Max != null 
                      ? `${(metrics.alpha1Min * 100).toFixed(0)}-${(metrics.alpha1Max * 100).toFixed(0)}%`
                      : 'N/A'
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Arrival Counts */}
            <div className="metrics-card">
              <h3>👥 Arrival Counts (Rolling Window)</h3>
              <div className="metrics-grid">
                <div className="metric-item">
                  <div className="metric-label">Total Arrivals</div>
                  <div className="metric-value">{metrics.counts.total}</div>
                </div>
                <div className="metric-item">
                  <div className="metric-label">Disabled</div>
                  <div className="metric-value">{metrics.counts.disabled}</div>
                </div>
                <div className="metric-item">
                  <div className="metric-label">Non-Disabled</div>
                  <div className="metric-value">{metrics.counts.nonDisabled}</div>
                </div>
              </div>
            </div>

            {/* Quantiles */}
            <div className="metrics-card">
              <h3>📈 Age Quantiles (Non-Disabled)</h3>
              {metrics.quantilesNonDisabledAge && metrics.counts.nonDisabled > 0 ? (
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

            {/* Level States */}
            <div className="metrics-card">
              <h3>🏛️ Level States</h3>
              <div className="levels-grid">
                {[1, 2, 3].map((levelNum) => {
                  const level = metrics.levels[levelNum as 1 | 2 | 3];
                  return (
                    <div key={levelNum} className={`level-card level-${levelNum}`}>
                      <h4>Level {levelNum}</h4>
                      {level ? (
                        <>
                          {level.waitEst != null && (
                            <div className="level-stat">
                              <span className="stat-label">Wait Time:</span>
                              <span className={`stat-value wait-${getWaitColor(level.waitEst, metrics.waitTargetMinutes)}`}>
                                {level.waitEst.toFixed(1)} min
                              </span>
                            </div>
                          )}
                          {level.queueLen != null && (
                            <div className="level-stat">
                              <span className="stat-label">Queue:</span>
                              <span className="stat-value">{level.queueLen}</span>
                            </div>
                          )}
                          {level.throughputPerMin != null && (
                            <div className="level-stat">
                              <span className="stat-label">Throughput:</span>
                              <span className="stat-value">{level.throughputPerMin.toFixed(1)}/min</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="no-data">No data</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </Container>
  );
};

export default LoadBalancerSimulation;
