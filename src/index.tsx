import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import reportWebVitals from './reportWebVitals';
import './utils/debugHelpers'; // Initialize debug helpers
import { createLogger } from './utils/logger';
import './utils/loggerHelpers'; // Initialize logger helpers

const logger = createLogger('Index');

logger.info('Application initialization started');

const rootElement = document.getElementById('root');

if (!rootElement) {
  logger.error('Root element not found - cannot initialize React application');
  throw new Error('Root element not found');
}

logger.debug('Root element found, creating React root');

try {
  const root = ReactDOM.createRoot(rootElement as HTMLElement);
  
  logger.info('React root created successfully, rendering application');
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  logger.info('Application rendered successfully');
} catch (error) {
  logger.error('Failed to render React application', error as Error);
  throw error;
}

// Performance reporting with logging
const handleWebVitals = (metric: any) => {
  logger.debug('Web Vitals metric reported', {
    name: metric.name,
    value: metric.value,
    id: metric.id,
    delta: metric.delta
  });
  
  // Log performance warnings for metrics that might indicate issues
  if (metric.name === 'CLS' && metric.value > 0.1) {
    logger.warn('Cumulative Layout Shift (CLS) is above recommended threshold', {
      value: metric.value,
      threshold: 0.1
    });
  }
  
  if (metric.name === 'FID' && metric.value > 100) {
    logger.warn('First Input Delay (FID) is above recommended threshold', {
      value: metric.value,
      threshold: 100
    });
  }
  
  if (metric.name === 'LCP' && metric.value > 2500) {
    logger.warn('Largest Contentful Paint (LCP) is above recommended threshold', {
      value: metric.value,
      threshold: 2500
    });
  }
};

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
logger.debug('Setting up web vitals reporting');
reportWebVitals(handleWebVitals);

logger.info('Application initialization completed');
