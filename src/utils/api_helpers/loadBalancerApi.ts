import { API_ENDPOINTS } from '../../constants/api';
import { apiRequest } from './apiRequest';

export interface LevelAssignmentRequest {
  age: number;
  isHealthy: boolean;
}

export interface LevelAssignmentResponse {
  assignedLevel: number;
  currentUtilization: number;
  capacity: number;
  utilizationPercentage: number;
}

export interface LevelUtilization {
  level: number;
  currentUtilization: number;
  capacity: number;
  utilizationPercentage: number;
}

export interface UtilizationResponse {
  levels: {
    [key: string]: LevelUtilization;
  };
}

export interface ResetResponse {
  message: string;
}

/**
 * Assigns a level to a user based on age and health status
 */
export const assignLevel = async (
  age: number,
  isHealthy: boolean
): Promise<LevelAssignmentResponse> => {
  const requestBody: LevelAssignmentRequest = {
    age,
    isHealthy,
  };

  return apiRequest<LevelAssignmentResponse>(
    API_ENDPOINTS.LOAD_BALANCER_ASSIGN,
    {
      method: 'POST',
      body: JSON.stringify(requestBody),
    }
  );
};

/**
 * Gets the current utilization levels
 */
export const getUtilization = async (): Promise<UtilizationResponse> => {
  return apiRequest<UtilizationResponse>(
    API_ENDPOINTS.LOAD_BALANCER_UTILIZATION,
    {
      method: 'GET',
    }
  );
};

/**
 * Resets the utilization counters
 */
export const resetUtilization = async (): Promise<ResetResponse> => {
  return apiRequest<ResetResponse>(
    API_ENDPOINTS.LOAD_BALANCER_RESET,
    {
      method: 'POST',
    }
  );
};
