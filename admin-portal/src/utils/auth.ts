import { API_BASE_URL, API_ENDPOINTS, REQUEST_HEADERS, STORAGE_KEYS } from '../constants/api';
import { createLogger } from './logger';

const logger = createLogger('AuthUtils');

// Error messages for better user experience
const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection.',
  CORS_ERROR: 'Server configuration issue. Please contact your administrator.',
  INVALID_CREDENTIALS: 'Invalid username or password.',
  SERVER_ERROR: 'Server error occurred. Please try again later.',
  INVALID_RESPONSE: 'Invalid response from server.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
} as const;

// Token management functions
export const getStoredToken = (): string | null => {
  logger.debug('Attempting to retrieve stored token from localStorage');
  
  const token = localStorage.getItem(STORAGE_KEYS.JWT_TOKEN);
  
  if (token) {
    logger.info('Token successfully retrieved from localStorage', { tokenLength: token.length });
  } else {
    logger.debug('No token found in localStorage');
  }
  
  return token;
};

export const setStoredToken = (token: string): void => {
  logger.info('Storing JWT token in localStorage', { tokenLength: token.length });
  
  try {
    localStorage.setItem(STORAGE_KEYS.JWT_TOKEN, token);
    logger.debug('Token successfully stored in localStorage');
  } catch (error) {
    logger.error('Failed to store token in localStorage', error as Error);
    throw error;
  }
};

export const removeStoredToken = (): void => {
  logger.info('Removing JWT token from localStorage');
  
  try {
    localStorage.removeItem(STORAGE_KEYS.JWT_TOKEN);
    logger.debug('Token successfully removed from localStorage');
  } catch (error) {
    logger.error('Failed to remove token from localStorage', error as Error);
    throw error;
  }
};

// API call with authentication
export const fetchWithAuth = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const startTime = performance.now();
  const token = getStoredToken();
  const method = options.method || 'GET';
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  
  logger.apiRequest(method, fullUrl, {
    hasToken: !!token,
    headers: options.headers,
    body: options.body ? 'Present' : 'None'
  });
  
  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        ...(options.headers || {}),
        [REQUEST_HEADERS.CONTENT_TYPE]: REQUEST_HEADERS.CONTENT_TYPE_JSON,
        ...(token && { [REQUEST_HEADERS.AUTHORIZATION]: `Bearer ${token}` }),
      },
    });

    const duration = performance.now() - startTime;
    logger.performanceLog(`fetchWithAuth ${method} ${endpoint}`, duration);
    
    logger.apiResponse(method, fullUrl, response.status, {
      ok: response.ok,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    return response;
  } catch (error) {
    const duration = performance.now() - startTime;
    logger.performanceLog(`fetchWithAuth ${method} ${endpoint} (FAILED)`, duration);
    logger.apiError(method, fullUrl, error as Error);
    throw error;
  }
};

// Enhanced error handling for fetch requests
const handleFetchError = (error: any, url: string): Error => {
  logger.error('Fetch error details', error, { url, errorType: error.constructor.name });
  
  if (error instanceof TypeError) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      // This usually indicates CORS, network, or server unavailability
      logger.warn('Network/CORS error detected', { url, message: error.message });
      return new Error(ERROR_MESSAGES.CORS_ERROR);
    }
  }
  
  if (error.name === 'AbortError') {
    logger.warn('Request was aborted/timed out', { url });
    return new Error(ERROR_MESSAGES.TIMEOUT_ERROR);
  }
  
  // Default to network error for unknown fetch failures
  return new Error(ERROR_MESSAGES.NETWORK_ERROR);
};

// Enhanced login function with better error handling
export const loginUser = async (username: string, password: string): Promise<string> => {
  const startTime = performance.now();
  const loginUrl = `${API_BASE_URL}${API_ENDPOINTS.LOGIN}`;
  
  logger.authEvent('Login attempt started', { username, loginUrl });
  
  try {
    // Add timeout to the request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        [REQUEST_HEADERS.CONTENT_TYPE]: REQUEST_HEADERS.CONTENT_TYPE_JSON,
      },
      body: JSON.stringify({ username, password }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    
    const duration = performance.now() - startTime;
    logger.performanceLog('Login API call', duration);

    logger.apiResponse('POST', loginUrl, response.status, {
      ok: response.ok,
      statusText: response.statusText,
      contentType: response.headers.get('content-type')
    });

    // Handle different HTTP status codes
    if (response.status === 401 || response.status === 403) {
      logger.authEvent('Login failed - Invalid credentials', { 
        username, 
        status: response.status,
        statusText: response.statusText 
      });
      throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    if (response.status === 405) {
      logger.authEvent('Login failed - Method not allowed', { 
        username, 
        status: response.status,
        statusText: response.statusText,
        loginUrl
      });
      throw new Error('Login endpoint not configured correctly. Please check server configuration.');
    }

    if (response.status >= 500) {
      logger.authEvent('Login failed - Server error', { 
        username, 
        status: response.status,
        statusText: response.statusText 
      });
      throw new Error(ERROR_MESSAGES.SERVER_ERROR);
    }

    if (!response.ok) {
      logger.authEvent('Login failed - Unknown error', { 
        username, 
        status: response.status,
        statusText: response.statusText 
      });
      throw new Error(`Login failed: ${response.statusText} (${response.status})`);
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      logger.authEvent('Login failed - Invalid JSON response', { 
        username, 
        parseError: (parseError as Error).message 
      });
      throw new Error(ERROR_MESSAGES.INVALID_RESPONSE);
    }
    
    if (!data || !data.token) {
      logger.authEvent('Login failed - Missing token in response', { 
        username, 
        responseData: data 
      });
      throw new Error(ERROR_MESSAGES.INVALID_RESPONSE);
    }

    logger.authEvent('Login successful', { 
      username, 
      tokenLength: data.token.length 
    });
    
    return data.token;
  } catch (error) {
    const duration = performance.now() - startTime;
    logger.performanceLog('Login API call (FAILED)', duration);
    
    // Handle fetch errors (network, CORS, etc.)
    if (error instanceof TypeError || (error instanceof Error && error.name === 'AbortError')) {
      const enhancedError = handleFetchError(error, loginUrl);
      logger.authEvent('Login error - Network/Fetch issue', { 
        username, 
        originalError: error.message,
        enhancedError: enhancedError.message 
      });
      throw enhancedError;
    }
    
    // Re-throw our custom errors as-is
    if (error instanceof Error && Object.values(ERROR_MESSAGES).includes(error.message as any)) {
      throw error;
    }
    
    // Log and re-throw other errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.authEvent('Login error - Unknown issue', { 
      username, 
      error: errorMessage 
    });
    throw new Error(errorMessage);
  }
};

// Validate token by checking dashboard access
export const validateToken = async (): Promise<boolean> => {
  const startTime = performance.now();
  logger.authEvent('Token validation started');
  
  try {
    const response = await fetchWithAuth(API_ENDPOINTS.DASHBOARD);
    const duration = performance.now() - startTime;
    
    const isValid = response.ok;
    
    logger.performanceLog('Token validation', duration);
    logger.authEvent('Token validation completed', { 
      isValid, 
      status: response.status 
    });
    
    return isValid;
  } catch (error) {
    const duration = performance.now() - startTime;
    logger.performanceLog('Token validation (FAILED)', duration);
    logger.authEvent('Token validation error', { error: (error as Error).message });
    return false;
  }
}; 