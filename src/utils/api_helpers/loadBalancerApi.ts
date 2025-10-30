import { API_ENDPOINTS } from '../../constants/api';
import { apiRequest } from './apiRequest';

// ============================================================================
// ADAPTIVE LOAD BALANCER TYPES (New System)
// ============================================================================

export interface ArrivalAssignmentRequest {
  age: number;
  isDisabled: boolean;
}

export interface OccupancyCount {
  1?: number;
  2?: number;
  3?: number;
}

export interface AssignmentDecision {
  isDisabled: boolean;
  age: number;
  ageCutoff: number;
  alpha1: number;
  pDisabled: number;
  shareLeftForOld: number;
  tauQuantile: number;
  waitEst: OccupancyCount; // Legacy name - actually occupancy count
  reason: string;
}

export interface ArrivalAssignmentResponse {
  level: number;
  decision: AssignmentDecision;
  traceId: string;
}

export interface LevelStateUpdate {
  level: number;
  queueLength?: number; // Occupancy count
}

export interface LevelStateRequest {
  levels: LevelStateUpdate[];
}

export interface LevelStateResponse {
  ok: boolean;
}

// Removed - no longer needed without feedback controller

export interface CountsMetrics {
  total: number;
  disabled: number;
  nonDisabled: number;
}

export interface QuantilesMetrics {
  q50: number;
  q80: number;
  q90: number;
}

export interface LevelMetrics {
  queueLength?: number; // Occupancy count
  waitEst?: number; // Legacy name - actually occupancy count
}

export interface MetricsResponse {
  alpha1: number;
  pDisabled: number;
  ageCutoff: number;
  counts: CountsMetrics;
  quantilesNonDisabledAge: QuantilesMetrics;
  levels: {
    1?: LevelMetrics;
    2?: LevelMetrics;
    3?: LevelMetrics;
  };
}

export interface WindowConfig {
  mode?: 'sliding' | 'decay';
  minutes?: number;
  halfLifeMinutes?: number;
}

export interface ConfigUpdateRequest {
  alpha1?: number;
  alpha1Min?: number;
  alpha1Max?: number;
  window?: WindowConfig;
}

export interface ConfigResponse {
  alpha1: number;
  alpha1Min: number;
  alpha1Max: number;
  slidingWindowMinutes: number;
  windowMode: string;
  halfLifeMinutes?: number;
}

export interface HealthResponse {
  status: string;
  timestamp?: string;
}

// ============================================================================
// LEGACY LOAD BALANCER TYPES (Old System - for backward compatibility)
// ============================================================================

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

// ============================================================================
// ADAPTIVE LOAD BALANCER API FUNCTIONS (New System)
// ============================================================================

/**
 * Assigns a pilgrim to a level based on age and disability status
 */
export const assignArrival = async (
  age: number,
  isDisabled: boolean
): Promise<ArrivalAssignmentResponse> => {
  const requestBody: ArrivalAssignmentRequest = {
    age,
    isDisabled,
  };

  return apiRequest<ArrivalAssignmentResponse>(
    API_ENDPOINTS.LOAD_BALANCER_ARRIVALS_ASSIGN,
    {
      method: 'POST',
      body: JSON.stringify(requestBody),
    }
  );
};

// Removed - no longer needed without feedback controller
// The system now only tracks occupancy internally

/**
 * Gets comprehensive metrics and statistics
 */
export const getMetrics = async (): Promise<MetricsResponse> => {
  return apiRequest<MetricsResponse>(
    API_ENDPOINTS.LOAD_BALANCER_METRICS,
    {
      method: 'GET',
    }
  );
};

/**
 * Updates runtime configuration
 */
export const updateConfig = async (
  config: ConfigUpdateRequest
): Promise<ConfigResponse> => {
  return apiRequest<ConfigResponse>(
    API_ENDPOINTS.LOAD_BALANCER_CONFIG,
    {
      method: 'POST',
      body: JSON.stringify(config),
    }
  );
};

/**
 * Gets current configuration
 */
export const getConfig = async (): Promise<ConfigResponse> => {
  return apiRequest<ConfigResponse>(
    API_ENDPOINTS.LOAD_BALANCER_CONFIG,
    {
      method: 'GET',
    }
  );
};

/**
 * Health check endpoint
 */
export const getHealth = async (): Promise<HealthResponse> => {
  return apiRequest<HealthResponse>(
    API_ENDPOINTS.LOAD_BALANCER_HEALTH,
    {
      method: 'GET',
    }
  );
};

// ============================================================================
// LEGACY API FUNCTIONS (Old System - for backward compatibility)
// ============================================================================

/**
 * Assigns a level to a user based on age and health status (Legacy)
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
 * Gets the current utilization levels (Legacy)
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
 * Resets the utilization counters (Legacy)
 */
export const resetUtilization = async (): Promise<ResetResponse> => {
  return apiRequest<ResetResponse>(
    API_ENDPOINTS.LOAD_BALANCER_RESET,
    {
      method: 'POST',
    }
  );
};
