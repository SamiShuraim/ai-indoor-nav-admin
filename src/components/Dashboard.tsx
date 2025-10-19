import React, { useEffect } from 'react';
import { EXTERNAL_URLS, UI_MESSAGES } from '../constants/ui';
import { createLogger } from '../utils/logger';
import { Button, Card, Container, Header } from './common';
import './Dashboard.css';

const logger = createLogger('Dashboard');

interface DashboardProps {
  onLogout: () => void;
  onNavigateToBuildings: () => void;
  onNavigateToLoadBalancer: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout, onNavigateToBuildings, onNavigateToLoadBalancer }) => {
  // Component lifecycle logging
  useEffect(() => {
    logger.info('Dashboard component mounted');
    logger.userAction('Dashboard accessed');
    
    return () => {
      logger.info('Dashboard component unmounted');
    };
  }, []);

  const handleLogout = () => {
    logger.userAction('Logout button clicked');
    logger.info('User initiated logout process');
    
    try {
      onLogout();
      logger.info('Logout callback executed successfully');
    } catch (error) {
      logger.error('Error during logout process', error as Error);
    }
  };

  const handleCardClick = (cardName: string) => {
    logger.userAction('Dashboard card clicked', { card: cardName });
    logger.info(`User clicked on ${cardName} card - feature not implemented yet`);
  };

  const handleProjectManagementClick = () => {
    logger.userAction('Project Management card clicked');
    logger.info('Redirecting to Project Management Notion page');
    window.open(EXTERNAL_URLS.PROJECT_MANAGEMENT, '_blank', 'noopener,noreferrer');
  };

  const handleBuildingsClick = () => {
    logger.userAction('Buildings & Floors card clicked');
    logger.info('Navigating to Buildings & Floors management');
    onNavigateToBuildings();
  };

  const handleLoadBalancerClick = () => {
    logger.userAction('Load Balancer Simulation card clicked');
    logger.info('Navigating to Load Balancer Simulation');
    onNavigateToLoadBalancer();
  };

  logger.debug('Dashboard component rendering');

  return (
    <Container variant="PAGE">
      <Header 
        title={UI_MESSAGES.DASHBOARD_TITLE}
        actions={
          <Button 
            variant="DANGER" 
            onClick={handleLogout}
          >
            {UI_MESSAGES.DASHBOARD_LOGOUT_BUTTON}
          </Button>
        }
      />
      
      <main className="dashboard-content">
        <Card 
          variant="welcome"
          title={UI_MESSAGES.DASHBOARD_WELCOME_TITLE}
          description={UI_MESSAGES.DASHBOARD_WELCOME_MESSAGE}
        />
        
        <div className="dashboard-grid">
          <Card
            title={UI_MESSAGES.CARD_USERS_TITLE}
            description={UI_MESSAGES.CARD_USERS_DESC}
            onClick={() => handleCardClick('Users')}
          />
          
          <Card
            title={UI_MESSAGES.CARD_SETTINGS_TITLE}
            description={UI_MESSAGES.CARD_SETTINGS_DESC}
            onClick={() => handleCardClick('Settings')}
          />
          
          <Card
            title={UI_MESSAGES.CARD_REPORTS_TITLE}
            description={UI_MESSAGES.CARD_REPORTS_DESC}
            onClick={handleLoadBalancerClick}
          />
          
          <Card
            title={UI_MESSAGES.CARD_ANALYTICS_TITLE}
            description={UI_MESSAGES.CARD_ANALYTICS_DESC}
            onClick={() => handleCardClick('Analytics')}
          />

          <Card
            title={UI_MESSAGES.CARD_BUILDINGS_TITLE}
            description={UI_MESSAGES.CARD_BUILDINGS_DESC}
            onClick={handleBuildingsClick}
          />

          <Card
            title={UI_MESSAGES.CARD_PROJECT_MANAGEMENT_TITLE}
            description={UI_MESSAGES.CARD_PROJECT_MANAGEMENT_DESC}
            onClick={handleProjectManagementClick}
          />
        </div>
      </main>
    </Container>
  );
};

export default Dashboard; 