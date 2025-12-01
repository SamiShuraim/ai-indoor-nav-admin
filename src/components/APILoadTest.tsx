import React, { useState } from 'react';
import { API_BASE_URL } from '../constants/api';
import { getAuthHeaders } from '../utils/api';
import './APILoadTest.css';

interface RouteNode {
  id: number;
  floor_id: number;
  level: number | null;
}

interface TestResult {
  requestNumber: number;
  assignTime: number;
  navigateTime: number;
  totalTime: number;
  success: boolean;
  error?: string;
  assignedLevel?: number;
  visitorId?: string;
}

interface TestSummary {
  assignMin: number;
  assignMax: number;
  assignAvg: number;
  navigateMin: number;
  navigateMax: number;
  navigateAvg: number;
  totalMin: number;
  totalMax: number;
  totalAvg: number;
  successCount: number;
  failureCount: number;
  assignPassesSpec: boolean;
  navigatePassesSpec: boolean;
}

const ROUTE_NODES: RouteNode[] = [
  {"id":19,"floor_id":1,"level":null},
  {"id":20,"floor_id":1,"level":null},
  {"id":21,"floor_id":1,"level":null},
  {"id":22,"floor_id":1,"level":null},
  {"id":23,"floor_id":1,"level":null},
  {"id":24,"floor_id":1,"level":1},
  {"id":25,"floor_id":1,"level":1},
  {"id":26,"floor_id":1,"level":1},
  {"id":27,"floor_id":1,"level":1},
  {"id":28,"floor_id":1,"level":1},
  {"id":29,"floor_id":1,"level":null},
  {"id":30,"floor_id":1,"level":null},
  {"id":31,"floor_id":1,"level":null},
  {"id":32,"floor_id":1,"level":null},
  {"id":33,"floor_id":1,"level":null},
  {"id":34,"floor_id":3,"level":null},
  {"id":35,"floor_id":4,"level":null},
  {"id":36,"floor_id":1,"level":null},
  {"id":37,"floor_id":3,"level":null},
  {"id":38,"floor_id":4,"level":null},
  {"id":39,"floor_id":3,"level":null},
  {"id":40,"floor_id":3,"level":null},
  {"id":41,"floor_id":3,"level":null},
  {"id":42,"floor_id":3,"level":null},
  {"id":43,"floor_id":3,"level":2},
  {"id":44,"floor_id":3,"level":2},
  {"id":45,"floor_id":3,"level":2},
  {"id":46,"floor_id":3,"level":2},
  {"id":47,"floor_id":3,"level":2},
  {"id":48,"floor_id":3,"level":2},
  {"id":49,"floor_id":3,"level":null},
  {"id":50,"floor_id":3,"level":null},
  {"id":51,"floor_id":3,"level":null},
  {"id":52,"floor_id":3,"level":null},
  {"id":53,"floor_id":4,"level":null},
  {"id":54,"floor_id":4,"level":null},
  {"id":55,"floor_id":4,"level":null},
  {"id":56,"floor_id":4,"level":null},
  {"id":57,"floor_id":4,"level":3},
  {"id":58,"floor_id":4,"level":3},
  {"id":59,"floor_id":4,"level":3},
  {"id":60,"floor_id":4,"level":3},
  {"id":61,"floor_id":4,"level":3},
  {"id":62,"floor_id":4,"level":3},
  {"id":63,"floor_id":4,"level":null},
  {"id":65,"floor_id":4,"level":null},
  {"id":66,"floor_id":4,"level":null},
  {"id":67,"floor_id":4,"level":null}
];

const CONCURRENT_USERS = 50;
const SPEC_AVG_MS = 1000;
const SPEC_MAX_MS = 3000;

const APILoadTest: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<TestSummary | null>(null);
  const [progress, setProgress] = useState(0);

  const getRandomNode = (): RouteNode => {
    return ROUTE_NODES[Math.floor(Math.random() * ROUTE_NODES.length)];
  };

  const runSingleTest = async (requestNumber: number): Promise<TestResult> => {
    const result: TestResult = {
      requestNumber,
      assignTime: 0,
      navigateTime: 0,
      totalTime: 0,
      success: false,
    };

    try {
      const totalStartTime = performance.now();

      // Step 1: Call assign endpoint
      const assignStartTime = performance.now();
      const assignResponse = await fetch(`${API_BASE_URL}/api/LoadBalancer/arrivals/assign`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          age: 0,
          isDisabled: true,
        }),
      });

      if (!assignResponse.ok) {
        throw new Error(`Assign API failed: ${assignResponse.status}`);
      }

      const assignData = await assignResponse.json();
      result.assignTime = performance.now() - assignStartTime;
      result.assignedLevel = assignData.level;
      result.visitorId = assignData.visitorId;

      // Step 2: Call navigateToLevel endpoint
      const randomNode = getRandomNode();
      const navigateStartTime = performance.now();
      const navigateResponse = await fetch(`${API_BASE_URL}/api/RouteNode/navigateToLevel`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentNodeId: randomNode.id,
          targetLevel: assignData.level,
          floorId: randomNode.floor_id,
        }),
      });

      if (!navigateResponse.ok) {
        throw new Error(`Navigate API failed: ${navigateResponse.status}`);
      }

      await navigateResponse.json();
      result.navigateTime = performance.now() - navigateStartTime;

      result.totalTime = performance.now() - totalStartTime;
      result.success = true;
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.success = false;
    }

    return result;
  };

  const calculateSummary = (testResults: TestResult[]): TestSummary => {
    const successfulResults = testResults.filter(r => r.success);
    
    if (successfulResults.length === 0) {
      return {
        assignMin: 0,
        assignMax: 0,
        assignAvg: 0,
        navigateMin: 0,
        navigateMax: 0,
        navigateAvg: 0,
        totalMin: 0,
        totalMax: 0,
        totalAvg: 0,
        successCount: 0,
        failureCount: testResults.length,
        assignPassesSpec: false,
        navigatePassesSpec: false,
      };
    }

    const assignTimes = successfulResults.map(r => r.assignTime);
    const navigateTimes = successfulResults.map(r => r.navigateTime);
    const totalTimes = successfulResults.map(r => r.totalTime);

    const assignMin = Math.min(...assignTimes);
    const assignMax = Math.max(...assignTimes);
    const assignAvg = assignTimes.reduce((a, b) => a + b, 0) / assignTimes.length;

    const navigateMin = Math.min(...navigateTimes);
    const navigateMax = Math.max(...navigateTimes);
    const navigateAvg = navigateTimes.reduce((a, b) => a + b, 0) / navigateTimes.length;

    const totalMin = Math.min(...totalTimes);
    const totalMax = Math.max(...totalTimes);
    const totalAvg = totalTimes.reduce((a, b) => a + b, 0) / totalTimes.length;

    return {
      assignMin,
      assignMax,
      assignAvg,
      navigateMin,
      navigateMax,
      navigateAvg,
      totalMin,
      totalMax,
      totalAvg,
      successCount: successfulResults.length,
      failureCount: testResults.length - successfulResults.length,
      assignPassesSpec: assignAvg < SPEC_AVG_MS && assignMax < SPEC_MAX_MS,
      navigatePassesSpec: navigateAvg < SPEC_AVG_MS && navigateMax < SPEC_MAX_MS,
    };
  };

  const runLoadTest = async () => {
    setIsRunning(true);
    setResults([]);
    setSummary(null);
    setProgress(0);

    const allResults: TestResult[] = [];
    let completed = 0;
    
    // Create all 50 concurrent requests with live updates
    const testPromises = Array.from({ length: CONCURRENT_USERS }, (_, i) =>
      runSingleTest(i + 1).then(result => {
        // Update completion count and progress
        completed++;
        allResults.push(result);
        
        // Update progress bar in real-time
        setProgress((completed / CONCURRENT_USERS) * 100);
        
        // Update results table in real-time (sorted by request number)
        setResults([...allResults].sort((a, b) => a.requestNumber - b.requestNumber));
        
        return result;
      })
    );

    // Wait for all requests to complete
    await Promise.all(testPromises);

    // Calculate and display final summary
    setSummary(calculateSummary(allResults));
    setIsRunning(false);
  };

  const formatTime = (ms: number): string => {
    return `${ms.toFixed(2)}ms`;
  };

  const getStatusIcon = (passes: boolean): string => {
    return passes ? '✅' : '❌';
  };

  return (
    <div className="api-load-test">
      <div className="test-header">
        <button onClick={onBack} className="back-button">
          ← Back to Dashboard
        </button>
        <h1>API Load & Response Time Test</h1>
      </div>

      <div className="test-info">
        <h2>Test Specifications</h2>
        <div className="spec-cards">
          <div className="spec-card">
            <h3>Response Time Requirements</h3>
            <ul>
              <li>Average: &lt; {SPEC_AVG_MS}ms</li>
              <li>Worst Case (Max): &lt; {SPEC_MAX_MS}ms</li>
            </ul>
          </div>
          <div className="spec-card">
            <h3>Concurrent Load</h3>
            <ul>
              <li>Concurrent Users: {CONCURRENT_USERS}</li>
              <li>Each user makes 2 API calls (assign + navigate)</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="test-controls">
        <button
          onClick={runLoadTest}
          disabled={isRunning}
          className="run-button"
        >
          {isRunning ? 'Running Test...' : 'Run Load Test'}
        </button>
        {isRunning && (
          <div className="progress-container">
            <div className="progress-info">
              <span>Completed: {results.length} / {CONCURRENT_USERS}</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      {(summary || results.length > 0) && (
        <div className="test-results">
          <h2>Test Results {isRunning && <span className="live-indicator">● LIVE</span>}</h2>
          
          {summary && (
            <div className="summary-cards">
              <div className="summary-card">
                <h3>Overall Statistics</h3>
                <p>Success: {summary.successCount} / {CONCURRENT_USERS}</p>
                <p>Failures: {summary.failureCount}</p>
              </div>
            </div>
          )}
          
          {!summary && results.length > 0 && (
            <div className="summary-cards">
              <div className="summary-card">
                <h3>In Progress...</h3>
                <p>Completed: {results.length} / {CONCURRENT_USERS}</p>
                <p>Success: {results.filter(r => r.success).length}</p>
                <p>Failures: {results.filter(r => !r.success).length}</p>
              </div>
            </div>
          )}

          {summary && (
            <div className="api-results">
            <div className={`api-result-card ${summary.assignPassesSpec ? 'pass' : 'fail'}`}>
              <h3>{getStatusIcon(summary.assignPassesSpec)} Assign API (/api/LoadBalancer/arrivals/assign)</h3>
              <div className="metrics">
                <div className="metric">
                  <span className="metric-label">Min:</span>
                  <span className="metric-value">{formatTime(summary.assignMin)}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Max:</span>
                  <span className="metric-value">{formatTime(summary.assignMax)}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Average:</span>
                  <span className="metric-value">{formatTime(summary.assignAvg)}</span>
                </div>
              </div>
              <div className="spec-check">
                <p>✓ Average &lt; {SPEC_AVG_MS}ms: {summary.assignAvg < SPEC_AVG_MS ? 'PASS' : 'FAIL'}</p>
                <p>✓ Max &lt; {SPEC_MAX_MS}ms: {summary.assignMax < SPEC_MAX_MS ? 'PASS' : 'FAIL'}</p>
              </div>
            </div>

            <div className={`api-result-card ${summary.navigatePassesSpec ? 'pass' : 'fail'}`}>
              <h3>{getStatusIcon(summary.navigatePassesSpec)} Navigate API (/api/RouteNode/navigateToLevel)</h3>
              <div className="metrics">
                <div className="metric">
                  <span className="metric-label">Min:</span>
                  <span className="metric-value">{formatTime(summary.navigateMin)}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Max:</span>
                  <span className="metric-value">{formatTime(summary.navigateMax)}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Average:</span>
                  <span className="metric-value">{formatTime(summary.navigateAvg)}</span>
                </div>
              </div>
              <div className="spec-check">
                <p>✓ Average &lt; {SPEC_AVG_MS}ms: {summary.navigateAvg < SPEC_AVG_MS ? 'PASS' : 'FAIL'}</p>
                <p>✓ Max &lt; {SPEC_MAX_MS}ms: {summary.navigateMax < SPEC_MAX_MS ? 'PASS' : 'FAIL'}</p>
              </div>
            </div>

            <div className="api-result-card info">
              <h3>Combined Total Time</h3>
              <div className="metrics">
                <div className="metric">
                  <span className="metric-label">Min:</span>
                  <span className="metric-value">{formatTime(summary.totalMin)}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Max:</span>
                  <span className="metric-value">{formatTime(summary.totalMax)}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Average:</span>
                  <span className="metric-value">{formatTime(summary.totalAvg)}</span>
                </div>
              </div>
            </div>
            </div>
          )}

          <div className="detailed-results">
            <h3>Detailed Results</h3>
            <div className="results-table-container">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Status</th>
                    <th>Assign Time</th>
                    <th>Navigate Time</th>
                    <th>Total Time</th>
                    <th>Assigned Level</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result.requestNumber} className={result.success ? 'success' : 'failure'}>
                      <td>{result.requestNumber}</td>
                      <td>{result.success ? '✅' : '❌'}</td>
                      <td>{result.assignTime > 0 ? formatTime(result.assignTime) : '-'}</td>
                      <td>{result.navigateTime > 0 ? formatTime(result.navigateTime) : '-'}</td>
                      <td>{result.totalTime > 0 ? formatTime(result.totalTime) : '-'}</td>
                      <td>{result.assignedLevel !== undefined ? result.assignedLevel : '-'}</td>
                      <td className="error-cell">{result.error || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default APILoadTest;
