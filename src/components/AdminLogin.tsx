import React, { FormEvent, useEffect, useState } from 'react';
import { UI_MESSAGES } from '../constants/ui';
import { loginUser, setStoredToken } from '../utils/auth';
import { createLogger } from '../utils/logger';
import './AdminLogin.css';
import { Alert, Button, Container, Input } from './common';

const logger = createLogger('AdminLogin');

interface LoginFormData {
  username: string;
  password: string;
}

interface AdminLoginProps {
  onLogin?: (token: string) => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin }) => {
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Component lifecycle logging
  useEffect(() => {
    logger.info('AdminLogin component mounted');
    
    return () => {
      logger.info('AdminLogin component unmounted');
    };
  }, []);

  // Log state changes
  useEffect(() => {
    logger.stateChange('AdminLogin', 'isLoading', { isLoading });
  }, [isLoading]);

  useEffect(() => {
    if (error) {
      logger.warn('Login error displayed to user', { error });
    }
  }, [error]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const oldFormData = { ...formData };
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    logger.userAction('Form field changed', { 
      field: name, 
      valueLength: value.length,
      isPasswordField: name === 'password'
    });
    
    logger.stateChange('AdminLogin formData', oldFormData, { ...formData, [name]: value });
    
    if (error) {
      setError('');
      logger.debug('Error cleared due to user input');
    }
  };

  const validateForm = (): boolean => {
    logger.debug('Validating login form', {
      hasUsername: !!formData.username,
      hasPassword: !!formData.password,
      usernameLength: formData.username.length,
      passwordLength: formData.password.length
    });

    if (!formData.username || !formData.password) {
      logger.warn('Form validation failed - Missing required fields', {
        missingUsername: !formData.username,
        missingPassword: !formData.password
      });
      return false;
    }

    logger.debug('Form validation passed');
    return true;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const startTime = performance.now();
    
    logger.userAction('Login form submitted', {
      username: formData.username,
      hasPassword: !!formData.password
    });

    setIsLoading(true);
    setError('');

    // Basic validation
    if (!validateForm()) {
      setError(UI_MESSAGES.AUTH_VALIDATION_ERROR);
      setIsLoading(false);
      return;
    }

    try {
      logger.info('Starting login process', { username: formData.username });
      
      const token = await loginUser(formData.username, formData.password);
      
      logger.info('Login successful, storing token');
      setStoredToken(token);
      
      const duration = performance.now() - startTime;
      logger.performanceLog('Complete login flow', duration);
      
      logger.info('Calling onLogin callback');
      onLogin?.(token);
      
    } catch (err) {
      const duration = performance.now() - startTime;
      logger.performanceLog('Failed login flow', duration);
      
      if (err instanceof Error) {
        logger.error('Login failed with error', err, { username: formData.username });
        setError(err.message);
      } else {
        logger.error('Login failed with unknown error', undefined, { 
          username: formData.username, 
          error: err 
        });
        setError(UI_MESSAGES.AUTH_NETWORK_ERROR);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormFocus = (fieldName: string) => {
    logger.userAction('Form field focused', { field: fieldName });
  };

  const handleFormBlur = (fieldName: string) => {
    logger.userAction('Form field blurred', { field: fieldName });
  };

  logger.debug('AdminLogin component rendering', {
    hasError: !!error,
    isLoading,
    usernameLength: formData.username.length,
    passwordLength: formData.password.length
  });

  return (
    <Container variant="CENTERED" size="LARGE">
      <div className="login-container">
        <div className="login-header">
          <h1>{UI_MESSAGES.AUTH_TITLE}</h1>
          <p>{UI_MESSAGES.AUTH_SUBTITLE}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <Input
            id="username"
            name="username"
            type="text"
            label={UI_MESSAGES.AUTH_USERNAME_LABEL}
            value={formData.username}
            onChange={handleInputChange}
            onFocus={() => handleFormFocus('username')}
            onBlur={() => handleFormBlur('username')}
            placeholder={UI_MESSAGES.AUTH_USERNAME_PLACEHOLDER}
            required
            autoComplete="username"
            disabled={isLoading}
          />

          <Input
            id="password"
            name="password"
            type="password"
            label={UI_MESSAGES.AUTH_PASSWORD_LABEL}
            value={formData.password}
            onChange={handleInputChange}
            onFocus={() => handleFormFocus('password')}
            onBlur={() => handleFormBlur('password')}
            placeholder={UI_MESSAGES.AUTH_PASSWORD_PLACEHOLDER}
            required
            autoComplete="current-password"
            disabled={isLoading}
          />

          {error && (
            <Alert message={error} />
          )}

          <Button 
            type="submit"
            variant="PRIMARY"
            size="LARGE"
            disabled={isLoading}
            loading={isLoading}
            onClick={() => logger.userAction('Login button clicked')}
          >
            {UI_MESSAGES.AUTH_SUBMIT_BUTTON}
          </Button>
        </form>
      </div>
    </Container>
  );
};

export default AdminLogin; 