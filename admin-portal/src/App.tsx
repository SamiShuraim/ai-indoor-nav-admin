import { useEffect, useState } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes, useLocation, useNavigate } from 'react-router-dom';
import './App.css';
import AdminLogin from './components/AdminLogin';
import BuildingsManagement from './components/BuildingsManagement';
import Dashboard from './components/Dashboard';
import FloorEditor from './components/FloorEditor';
import { getStoredToken, removeStoredToken, validateToken } from './utils/auth';
import { createLogger } from './utils/logger';

const logger = createLogger('App');

// Route Constants
const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  BUILDINGS: '/buildings',
  FLOOR_EDITOR: '/floor-editor/:floorId',
  FLOOR_EDITOR_PATH: (floorId: string) => `/floor-editor/${floorId}`,
} as const;

// UI Constants
const UI_TEXTS = {
  LOADING_MESSAGE: 'Loading...',
} as const;

function AppContent() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Log route changes
  useEffect(() => {
    if (isInitialized) {
      logger.navigationChange('Route changed to', location.pathname);
    }
  }, [location.pathname, isInitialized]);

  // Log state changes
  useEffect(() => {
    logger.stateChange('App', 'token', { 
      hasToken: !!token, 
      tokenLength: token?.length 
    });
  }, [token]);

  useEffect(() => {
    logger.stateChange('App', 'isLoading', { isLoading });
  }, [isLoading]);

  // Check for existing token on app load ONLY ONCE
  useEffect(() => {
    const checkExistingToken = async () => {
      const startTime = performance.now();
      logger.info('App starting - checking for existing authentication');
      
      try {
        const storedToken = getStoredToken();
        
        if (storedToken) {
          logger.info('Stored token found, validating with backend');
          
          // Validate token with backend
          const isValid = await validateToken();
          
          if (isValid) {
            logger.info('Token validation successful, setting authenticated state');
            setToken(storedToken);
          } else {
            logger.warn('Token validation failed, removing invalid token');
            removeStoredToken();
          }
        } else {
          logger.info('No stored token found');
        }
      } catch (error) {
        logger.error('Error during token validation', error as Error);
        removeStoredToken();
      } finally {
        const duration = performance.now() - startTime;
        logger.performanceLog('Initial authentication check', duration);
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    checkExistingToken();
  }, []); // No dependencies - run only once on mount

  const handleLogin = (jwtToken: string) => {
    logger.info('Login successful, updating app state');
    logger.userAction('User logged in successfully');
    
    setToken(jwtToken);
    logger.navigationChange('Login success, navigating to', ROUTES.DASHBOARD);
    navigate(ROUTES.DASHBOARD, { replace: true });
  };

  const handleLogout = () => {
    logger.info('Logout initiated, clearing authentication state');
    logger.userAction('User logged out');
    
    try {
      setToken(null);
      removeStoredToken();
      logger.navigationChange('Logout, navigating to', ROUTES.LOGIN);
      navigate(ROUTES.LOGIN, { replace: true });
      logger.info('Logout completed successfully');
    } catch (error) {
      logger.error('Error during logout process', error as Error);
    }
  };

  const handleNavigateToDashboard = () => {
    logger.userAction('Navigate to dashboard clicked');
    logger.navigationChange('Navigating to', ROUTES.DASHBOARD);
    navigate(ROUTES.DASHBOARD);
  };

  const handleNavigateToBuildings = () => {
    logger.userAction('Navigate to buildings management clicked');
    logger.navigationChange('Navigating to', ROUTES.BUILDINGS);
    navigate(ROUTES.BUILDINGS);
  };

  const handleNavigateToFloorEditor = (floorId: string | number) => {
    const floorIdString = floorId.toString();
    logger.userAction('Navigate to floor editor clicked', { floorId, floorIdString });
    const route = ROUTES.FLOOR_EDITOR_PATH(floorIdString);
    logger.navigationChange('Navigating to', route);
    navigate(route);
  };

  // Component lifecycle logging
  useEffect(() => {
    logger.info('AppContent component mounted');
    
    return () => {
      logger.info('AppContent component unmounted');
    };
  }, []);

  if (isLoading) {
    logger.debug('App rendering loading state');
    return (
      <div className="App">
        <div className="loading-spinner">{UI_TEXTS.LOADING_MESSAGE}</div>
      </div>
    );
  }

  logger.debug('App rendering main content', {
    currentRoute: location.pathname,
    hasToken: !!token,
    isAuthenticated: !!token
  });

  return (
    <div className="App">
      <Routes>
        <Route 
          path={ROUTES.LOGIN} 
          element={
            token ? (
              <Navigate to={ROUTES.DASHBOARD} replace />
            ) : (
              <AdminLogin onLogin={handleLogin} />
            )
          } 
        />
        <Route 
          path={ROUTES.DASHBOARD} 
          element={
            token ? (
              <Dashboard 
                onLogout={handleLogout}
                onNavigateToBuildings={handleNavigateToBuildings}
              />
            ) : (
              <Navigate to={ROUTES.LOGIN} replace />
            )
          } 
        />
        <Route 
          path={ROUTES.BUILDINGS} 
          element={
            token ? (
              <BuildingsManagement 
                onBack={handleNavigateToDashboard}
                onFloorEdit={handleNavigateToFloorEditor}
              />
            ) : (
              <Navigate to={ROUTES.LOGIN} replace />
            )
          } 
        />
        <Route 
          path={ROUTES.FLOOR_EDITOR} 
          element={
            token ? (
              <FloorEditor 
                floorId={location.pathname.split('/').pop() || ''}
                onBack={handleNavigateToBuildings}
              />
            ) : (
              <Navigate to={ROUTES.LOGIN} replace />
            )
          } 
        />
        <Route 
          path="/" 
          element={<Navigate to={token ? ROUTES.DASHBOARD : ROUTES.LOGIN} replace />} 
        />
      </Routes>
    </div>
  );
}

function App() {
  // Component lifecycle logging
  useEffect(() => {
    logger.info('App component mounted - Application starting');
    
    return () => {
      logger.info('App component unmounted - Application stopping');
    };
  }, []);

  logger.debug('App wrapper component rendering');

  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
