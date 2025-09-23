/**
 * Validation constants used across the application
 */

export const VALIDATION_LIMITS = {
    // String lengths
    NAME_MIN_LENGTH: 1,
    NAME_MAX_LENGTH: 255,
    DESCRIPTION_MAX_LENGTH: 1000,
    UUID_LENGTH: 36,
    
    // Numeric ranges
    BATTERY_LEVEL_MIN: 0,
    BATTERY_LEVEL_MAX: 100,
    FLOOR_NUMBER_MIN: -100,
    FLOOR_NUMBER_MAX: 100,
    
    // Coordinate ranges
    LONGITUDE_MIN: -180,
    LONGITUDE_MAX: 180,
    LATITUDE_MIN: -90,
    LATITUDE_MAX: 90,
    
    // Geometry constraints
    POLYGON_MIN_POINTS: 3,
    POLYGON_MAX_POINTS: 1000,
    
    // ID constraints
    MIN_ID: 1,
    MAX_ID: 2147483647, // 32-bit signed integer max
} as const;

export const VALIDATION_MESSAGES = {
    REQUIRED: (field: string) => `${field} is required`,
    MIN_LENGTH: (field: string, min: number) => `${field} must be at least ${min} characters long`,
    MAX_LENGTH: (field: string, max: number) => `${field} must be no more than ${max} characters long`,
    INVALID_NUMBER: (field: string) => `${field} must be a valid number`,
    INVALID_INTEGER: (field: string) => `${field} must be an integer`,
    OUT_OF_RANGE: (field: string, min: number, max: number) => `${field} must be between ${min} and ${max}`,
    INVALID_COORDINATES: (field: string) => `${field} must be valid [longitude, latitude] coordinates`,
    INVALID_POLYGON: (field: string) => `${field} must be a valid polygon with at least 3 points`,
    INVALID_ID: (field: string) => `${field} must be a valid positive integer`,
    INVALID_UUID: (field: string) => `${field} must be a valid UUID`,
    INVALID_COLOR: (field: string) => `${field} must be a valid hex color`,
    INVALID_EMAIL: (field: string) => `${field} must be a valid email address`,
    INVALID_URL: (field: string) => `${field} must be a valid URL`,
} as const;

export const REGEX_PATTERNS = {
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
} as const;