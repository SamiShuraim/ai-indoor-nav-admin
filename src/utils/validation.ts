/**
 * Common validation utilities
 */

export class ValidationError extends Error {
    constructor(message: string, public field?: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

export const Validators = {
    required: (value: unknown, fieldName: string = 'Field'): void => {
        if (value === undefined || value === null || value === '') {
            throw new ValidationError(`${fieldName} is required`);
        }
    },

    minLength: (value: string, minLength: number, fieldName: string = 'Field'): void => {
        if (typeof value !== 'string' || value.length < minLength) {
            throw new ValidationError(`${fieldName} must be at least ${minLength} characters long`);
        }
    },

    maxLength: (value: string, maxLength: number, fieldName: string = 'Field'): void => {
        if (typeof value === 'string' && value.length > maxLength) {
            throw new ValidationError(`${fieldName} must be no more than ${maxLength} characters long`);
        }
    },

    isNumber: (value: unknown, fieldName: string = 'Field'): void => {
        if (typeof value !== 'number' || isNaN(value)) {
            throw new ValidationError(`${fieldName} must be a valid number`);
        }
    },

    isPositive: (value: number, fieldName: string = 'Field'): void => {
        if (value <= 0) {
            throw new ValidationError(`${fieldName} must be positive`);
        }
    },

    isInteger: (value: number, fieldName: string = 'Field'): void => {
        if (!Number.isInteger(value)) {
            throw new ValidationError(`${fieldName} must be an integer`);
        }
    },

    inRange: (value: number, min: number, max: number, fieldName: string = 'Field'): void => {
        if (value < min || value > max) {
            throw new ValidationError(`${fieldName} must be between ${min} and ${max}`);
        }
    },

    isEmail: (value: string, fieldName: string = 'Email'): void => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            throw new ValidationError(`${fieldName} must be a valid email address`);
        }
    },

    isUrl: (value: string, fieldName: string = 'URL'): void => {
        try {
            new URL(value);
        } catch {
            throw new ValidationError(`${fieldName} must be a valid URL`);
        }
    },

    isArray: (value: unknown, fieldName: string = 'Field'): void => {
        if (!Array.isArray(value)) {
            throw new ValidationError(`${fieldName} must be an array`);
        }
    },

    arrayMinLength: (value: unknown[], minLength: number, fieldName: string = 'Array'): void => {
        if (!Array.isArray(value) || value.length < minLength) {
            throw new ValidationError(`${fieldName} must contain at least ${minLength} items`);
        }
    },

    coordinates: (value: unknown, fieldName: string = 'Coordinates'): void => {
        if (!Array.isArray(value) || value.length !== 2) {
            throw new ValidationError(`${fieldName} must be an array of [longitude, latitude]`);
        }
        
        const [lng, lat] = value;
        if (typeof lng !== 'number' || typeof lat !== 'number') {
            throw new ValidationError(`${fieldName} must contain valid numbers`);
        }
        
        if (lng < -180 || lng > 180) {
            throw new ValidationError(`Longitude must be between -180 and 180`);
        }
        
        if (lat < -90 || lat > 90) {
            throw new ValidationError(`Latitude must be between -90 and 90`);
        }
    },

    polygonCoordinates: (value: unknown, fieldName: string = 'Polygon coordinates'): void => {
        if (!Array.isArray(value) || value.length === 0) {
            throw new ValidationError(`${fieldName} must be a non-empty array`);
        }

        const ring = value[0];
        if (!Array.isArray(ring) || ring.length < 3) {
            throw new ValidationError(`${fieldName} must have at least 3 points`);
        }

        ring.forEach((point: unknown, index: number) => {
            if (!Array.isArray(point) || point.length !== 2) {
                throw new ValidationError(`Point ${index + 1} in ${fieldName} must be [longitude, latitude]`);
            }
            
            const [lng, lat] = point;
            if (typeof lng !== 'number' || typeof lat !== 'number') {
                throw new ValidationError(`Point ${index + 1} in ${fieldName} must contain valid numbers`);
            }
        });
    }
};

/**
 * Validation chain builder for fluent validation
 */
export class ValidationChain {
    constructor(private value: unknown, private fieldName: string) {}

    required(): this {
        Validators.required(this.value, this.fieldName);
        return this;
    }

    minLength(min: number): this {
        if (this.value !== undefined && this.value !== null && typeof this.value === 'string') {
            Validators.minLength(this.value, min, this.fieldName);
        }
        return this;
    }

    maxLength(max: number): this {
        if (this.value !== undefined && this.value !== null && typeof this.value === 'string') {
            Validators.maxLength(this.value, max, this.fieldName);
        }
        return this;
    }

    isNumber(): this {
        if (this.value !== undefined && this.value !== null) {
            Validators.isNumber(this.value, this.fieldName);
        }
        return this;
    }

    isPositive(): this {
        if (this.value !== undefined && this.value !== null && typeof this.value === 'number') {
            Validators.isPositive(this.value, this.fieldName);
        }
        return this;
    }

    inRange(min: number, max: number): this {
        if (this.value !== undefined && this.value !== null && typeof this.value === 'number') {
            Validators.inRange(this.value, min, max, this.fieldName);
        }
        return this;
    }

    coordinates(): this {
        if (this.value !== undefined && this.value !== null) {
            Validators.coordinates(this.value, this.fieldName);
        }
        return this;
    }

    polygonCoordinates(): this {
        if (this.value !== undefined && this.value !== null) {
            Validators.polygonCoordinates(this.value, this.fieldName);
        }
        return this;
    }

    custom(validator: (value: unknown) => void): this {
        if (this.value !== undefined && this.value !== null) {
            validator(this.value);
        }
        return this;
    }
}

/**
 * Creates a validation chain for a field
 */
export function validate(value: unknown, fieldName: string): ValidationChain {
    return new ValidationChain(value, fieldName);
}