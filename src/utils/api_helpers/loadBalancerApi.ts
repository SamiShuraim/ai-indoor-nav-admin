import { API_ENDPOINTS } from '../../constants/api';
import { apiRequest } from './apiRequest';

// ============================================================================
// ADAPTIVE LOAD BALANCER TYPES (New System)
// ============================================================================

export interface ArrivalAssignmentRequest {
  age: number;
  isDisabled: boolean;
}

export interface WaitEstimate {
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
  waitEst: WaitEstimate;
  reason: string;
}

export interface ArrivalAssignmentResponse {
  level: number;
  decision: AssignmentDecision;
  traceId: string;
}

export interface LevelStateUpdate {
  level: number;
  waitEst?: number;
  queueLen?: number;
  throughputPerMin?: number;
}

export interface LevelStateRequest {
  levels: LevelStateUpdate[];
}

export interface LevelStateResponse {
  ok: boolean;
}

export interface ControlTickResponse {
  alpha1: number;
  ageCutoff: number;
  pDisabled: number;
  window: {
    method: string;
    slidingWindowMinutes?: number;
    halfLifeMinutes?: number;
  };
}

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
  waitEst?: number;
  queueLen?: number;
  throughputPerMin?: number;
}

export interface MetricsResponse {
  alpha1: number;
  alpha1Min: number;
  alpha1Max: number;
  waitTargetMinutes: number;
  controllerGain: number;
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
}

export interface SoftGateConfig {
  enabled?: boolean;
  bandYears?: number;
}

export interface RandomizationConfig {
  enabled?: boolean;
  rate?: number;
}

export interface ConfigUpdateRequest {
  alpha1?: number;
  alpha1Min?: number;
  alpha1Max?: number;
  waitTargetMinutes?: number;
  controllerGain?: number;
  window?: WindowConfig;
  softGate?: SoftGateConfig;
  randomization?: RandomizationConfig;
}

export interface ConfigResponse {
  alpha1: number;
  alpha1Min: number;
  alpha1Max: number;
  waitTargetMinutes: number;
  controllerGain: number;
  window: {
    mode: string;
    minutes: number;
  };
  softGate: {
    enabled: boolean;
    bandYears: number;
  };
  randomization: {
    enabled: boolean;
    rate: number;
  };
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

/**
 * Updates level state (wait times, queue lengths, throughput)
 */
export const updateLevelState = async (
  levels: LevelStateUpdate[]
): Promise<LevelStateResponse> => {
  const requestBody: LevelStateRequest = { levels };

  return apiRequest<LevelStateResponse>(
    API_ENDPOINTS.LOAD_BALANCER_LEVELS_STATE,
    {
      method: 'POST',
      body: JSON.stringify(requestBody),
    }
  );
};

/**
 * Manually triggers a controller tick
 */
export const triggerControlTick = async (): Promise<ControlTickResponse> => {
  return apiRequest<ControlTickResponse>(
    API_ENDPOINTS.LOAD_BALANCER_CONTROL_TICK,
    {
      method: 'POST',
    }
  );
};

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
