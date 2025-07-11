import { API_BASE_URL, API_ENDPOINTS } from '../constants/api';
import { createLogger } from './logger';

const logger = createLogger('DebugHelpers');

// Debug helper functions for backend connectivity
declare global {
  interface Window {
    debugHelpers: {
      testConnection: () => Promise<void>;
      testLoginEndpoint: () => Promise<void>;
      checkCors: () => Promise<void>;
      testWithDummyData: () => Promise<void>;
    };
  }
}

const debugHelpers = {
  // Test basic connection to backend
  testConnection: async (): Promise<void> => {
    logger.info('Testing backend connection...');
    console.group('🔍 Backend Connection Test');
    
    try {
      const response = await fetch(API_BASE_URL, {
        method: 'GET',
        mode: 'cors',
      });
      
      console.log('✅ Connection successful:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: API_BASE_URL
      });
      
      logger.info('Backend connection test successful', {
        status: response.status,
        url: API_BASE_URL
      });
    } catch (error) {
      console.log('❌ Connection failed:', error);
      logger.error('Backend connection test failed', error as Error, {
        url: API_BASE_URL
      });
    }
    
    console.groupEnd();
  },

  // Test login endpoint specifically
  testLoginEndpoint: async (): Promise<void> => {
    const loginUrl = `${API_BASE_URL}${API_ENDPOINTS.LOGIN}`;
    logger.info('Testing login endpoint...', { loginUrl });
    console.group('🔍 Login Endpoint Test');
    
    try {
      // Test with OPTIONS request first (preflight)
      console.log('Testing OPTIONS request (CORS preflight)...');
      const optionsResponse = await fetch(loginUrl, {
        method: 'OPTIONS',
        headers: {
          'Origin': window.location.origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type',
        },
      });
      
      console.log('OPTIONS Response:', {
        status: optionsResponse.status,
        headers: Object.fromEntries(optionsResponse.headers.entries())
      });
      
      // Test actual POST request
      console.log('Testing POST request...');
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: 'data' }),
      });
      
      console.log('✅ POST Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      logger.info('Login endpoint test completed', {
        loginUrl,
        status: response.status
      });
    } catch (error) {
      console.log('❌ Login endpoint test failed:', error);
      logger.error('Login endpoint test failed', error as Error, {
        loginUrl
      });
    }
    
    console.groupEnd();
  },

  // Check CORS configuration
  checkCors: async (): Promise<void> => {
    logger.info('Checking CORS configuration...');
    console.group('🔍 CORS Configuration Check');
    
    const endpoints = [
      API_BASE_URL,
      `${API_BASE_URL}${API_ENDPOINTS.LOGIN}`,
      `${API_BASE_URL}${API_ENDPOINTS.DASHBOARD}`,
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Testing CORS for: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: 'HEAD',
          mode: 'cors',
        });
        
        const corsHeaders = {
          'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
          'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
          'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
          'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials'),
        };
        
        console.log(`✅ ${endpoint}:`, corsHeaders);
      } catch (error) {
        console.log(`❌ ${endpoint}:`, (error as Error).message);
      }
    }
    
    console.groupEnd();
    logger.info('CORS configuration check completed');
  },

  // Test with dummy login data
  testWithDummyData: async (): Promise<void> => {
    const loginUrl = `${API_BASE_URL}${API_ENDPOINTS.LOGIN}`;
    logger.info('Testing login with dummy data...');
    console.group('🔍 Dummy Login Test');
    
    const testCredentials = [
      { username: 'admin', password: 'admin' },
      { username: 'test', password: 'test' },
      { username: 'user', password: 'password' },
    ];
    
    for (const credentials of testCredentials) {
      try {
        console.log(`Testing with: ${credentials.username}/${credentials.password}`);
        
        const response = await fetch(loginUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials),
        });
        
        let responseData;
        try {
          responseData = await response.json();
        } catch {
          responseData = await response.text();
        }
        
        console.log(`Response for ${credentials.username}:`, {
          status: response.status,
          statusText: response.statusText,
          data: responseData
        });
        
      } catch (error) {
        console.log(`❌ Error for ${credentials.username}:`, (error as Error).message);
      }
    }
    
    console.groupEnd();
    logger.info('Dummy login test completed');
  }
};

// Make debug helpers available globally in development
if (process.env.NODE_ENV === 'development') {
  window.debugHelpers = debugHelpers;
  
  console.log('🛠️ Debug helpers available! Use window.debugHelpers in console:');
  console.log('  - testConnection(): Test basic backend connection');
  console.log('  - testLoginEndpoint(): Test login endpoint specifically');
  console.log('  - checkCors(): Check CORS configuration');
  console.log('  - testWithDummyData(): Test login with dummy credentials');
}

export default debugHelpers; 