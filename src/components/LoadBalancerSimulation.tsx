import React, { useEffect, useState } from 'react';
import { createLogger } from '../utils/logger';
import { assignLevel, getUtilization, resetUtilization } from '../utils/api_helpers/loadBalancerApi';
import { Button, Card, Container, Header } from './common';
import './LoadBalancerSimulation.css';

const logger = createLogger('LoadBalancerSimulation');

interface UtilizationLevel {
  level: number;
  currentUtilization: number;
  capacity: number;
  utilizationPercentage: number;
}

interface UtilizationData {
  levels: {
    [key: string]: UtilizationLevel;
  };
}

interface AssignmentResponse {
  assignedLevel: number;
  currentUtilization: number;
  capacity: number;
  utilizationPercentage: number;
}

interface LoadBalancerSimulationProps {
  onBack: () => void;
}

const LoadBalancerSimulation: React.FC<LoadBalancerSimulationProps> = ({ onBack }) => {
  const [utilization, setUtilization] = useState<UtilizationData | null>(null);
  const [lastAssignment, setLastAssignment] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    logger.info('LoadBalancerSimulation component mounted');
    fetchUtilization();
    
    return () => {
      logger.info('LoadBalancerSimulation component unmounted');
    };
  }, []);

  const fetchUtilization = async () => {
    try {
      logger.info('Fetching utilization data');
      const data = await getUtilization();
      setUtilization(data);
      setError(null);
      logger.info('Utilization data fetched successfully', data);
    } catch (err) {
      const errorMessage = 'Failed to fetch utilization data';
      logger.error(errorMessage, err as Error);
      setError(errorMessage);
    }
  };

  const handleAssign = async (age: number, isHealthy: boolean) => {
    setIsLoading(true);
    setError(null);
    
    const healthStatus = isHealthy ? 'healthy' : 'unhealthy';
    const ageGroup = age >= 50 ? 'old' : 'young';
    const description = `${ageGroup}/${healthStatus} (${age} years old)`;
    
    logger.userAction('Assign button clicked', { age, isHealthy, description });
    
    try {
      const response: AssignmentResponse = await assignLevel(age, isHealthy);
      setLastAssignment(`Person (${description}) was assigned to Level ${response.assignedLevel}`);
      logger.info('Assignment successful', { age, isHealthy, response });
      
      // Fetch updated utilization
      await fetchUtilization();
    } catch (err) {
      const errorMessage = 'Failed to assign level';
      logger.error(errorMessage, err as Error);
      setError(errorMessage);
      setLastAssignment(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setIsLoading(true);
    setError(null);
    logger.userAction('Reset button clicked');
    
    try {
      await resetUtilization();
      setLastAssignment(null);
      logger.info('Utilization reset successful');
      
      // Fetch updated utilization
      await fetchUtilization();
    } catch (err) {
      const errorMessage = 'Failed to reset utilization';
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

  const getUtilizationColor = (percentage: number): string => {
    if (percentage >= 80) return 'high';
    if (percentage >= 60) return 'medium';
    return 'low';
  };

  return (
    <Container variant="PAGE">
      <Header 
        title="Load Balancer Simulation"
        actions={
          <Button 
            variant="SECONDARY" 
            onClick={handleBack}
          >
            Back to Dashboard
          </Button>
        }
      />
      
      <main className="load-balancer-content">
        <Card variant="welcome" title="Load Balancer Simulation">
          <p className="load-balancer-description">
            Simulate different user types to see how the load balancer assigns them to different levels 
            based on age, health condition, and current utilization.
          </p>
        </Card>

        {error && (
          <div className="load-balancer-error">
            <p>{error}</p>
            <Button variant="SECONDARY" onClick={fetchUtilization}>
              Retry
            </Button>
          </div>
        )}

        <div className="simulation-controls">
          <h2>Simulate User Assignment</h2>
          <div className="button-grid">
            <Button
              variant="PRIMARY"
              onClick={() => handleAssign(65, false)}
              disabled={isLoading}
            >
              Old / Unhealthy
              <span className="button-subtitle">(65 years old)</span>
            </Button>
            
            <Button
              variant="PRIMARY"
              onClick={() => handleAssign(65, true)}
              disabled={isLoading}
            >
              Old / Healthy
              <span className="button-subtitle">(65 years old)</span>
            </Button>
            
            <Button
              variant="PRIMARY"
              onClick={() => handleAssign(25, false)}
              disabled={isLoading}
            >
              Young / Unhealthy
              <span className="button-subtitle">(25 years old)</span>
            </Button>
            
            <Button
              variant="PRIMARY"
              onClick={() => handleAssign(25, true)}
              disabled={isLoading}
            >
              Young / Healthy
              <span className="button-subtitle">(25 years old)</span>
            </Button>
          </div>
          
          <div className="reset-section">
            <Button
              variant="DANGER"
              onClick={handleReset}
              disabled={isLoading}
            >
              Reset Utilization
            </Button>
          </div>
        </div>

        {lastAssignment && (
          <div className="assignment-result">
            <h3>Latest Assignment</h3>
            <p>{lastAssignment}</p>
          </div>
        )}

        {utilization && (
          <div className="utilization-display">
            <h2>Current Utilization Levels</h2>
            <div className="levels-grid">
              {Object.values(utilization.levels).map((level) => (
                <div key={level.level} className="level-card">
                  <h3>Level {level.level}</h3>
                  <div className="level-stats">
                    <div className="stat-row">
                      <span className="stat-label">Current:</span>
                      <span className="stat-value">{level.currentUtilization}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Capacity:</span>
                      <span className="stat-value">{level.capacity}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Utilization:</span>
                      <span className={`stat-value utilization-${getUtilizationColor(level.utilizationPercentage)}`}>
                        {level.utilizationPercentage.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className={`progress-fill utilization-${getUtilizationColor(level.utilizationPercentage)}`}
                      style={{ width: `${Math.min(level.utilizationPercentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </Container>
  );
};

export default LoadBalancerSimulation;
