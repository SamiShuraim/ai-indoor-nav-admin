import { createLogger } from "./logger";

const logger = createLogger("ErrorHandler");

export interface ApiError extends Error {
    status?: number;
    code?: string;
    details?: Record<string, unknown>;
}

export class ApiErrorHandler {
    static createError(message: string, status?: number, code?: string, details?: Record<string, unknown>): ApiError {
        const error = new Error(message) as ApiError;
        error.status = status;
        error.code = code;
        error.details = details;
        return error;
    }

    static handleApiResponse(response: Response): void {
        if (!response.ok) {
            const error = this.createError(
                `API request failed: ${response.statusText}`,
                response.status,
                response.status.toString()
            );
            logger.error("API Error", error);
            throw error;
        }
    }

    static async handleApiError(error: unknown, context: string): Promise<never> {
        let apiError: ApiError;

        if (error instanceof Error) {
            apiError = error as ApiError;
            if (!apiError.status) {
                // Network or other errors
                apiError.status = 0;
                apiError.code = "NETWORK_ERROR";
            }
        } else {
            apiError = this.createError(
                `Unknown error in ${context}`,
                500,
                "UNKNOWN_ERROR",
                typeof error === 'object' && error !== null ? error as Record<string, unknown> : { error }
            );
        }

        logger.error(`Error in ${context}`, apiError);
        throw apiError;
    }

    static getErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }
        if (typeof error === 'string') {
            return error;
        }
        return 'An unknown error occurred';
    }

    static isNetworkError(error: ApiError): boolean {
        return error.status === 0 || error.code === 'NETWORK_ERROR';
    }

    static isServerError(error: ApiError): boolean {
        return (error.status || 0) >= 500;
    }

    static isClientError(error: ApiError): boolean {
        const status = error.status || 0;
        return status >= 400 && status < 500;
    }
}

export function withErrorHandling<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context: string
): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
        try {
            return await fn(...args);
        } catch (error) {
            return ApiErrorHandler.handleApiError(error, context);
        }
    };
}

export function withRetry<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    maxRetries: number = 3,
    delay: number = 1000
): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
        let lastError: unknown;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await fn(...args);
            } catch (error) {
                lastError = error;
                
                if (attempt === maxRetries) {
                    throw error;
                }

                const apiError = error as ApiError;
                // Don't retry client errors (4xx)
                if (ApiErrorHandler.isClientError(apiError)) {
                    throw error;
                }

                logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`, { error });
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
            }
        }

        throw lastError;
    };
}