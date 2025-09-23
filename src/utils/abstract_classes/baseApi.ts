// baseApi.ts
import {apiRequest} from "../api_helpers/apiRequest";
import {logger} from "../api";
import {withErrorHandling, withRetry} from "../errorHandler";

export abstract class BaseApi<T> {
    abstract resourceEndpoint: string;

    protected validateId(id: string | number): void {
        if (id === undefined || id === null || id === '') {
            throw new Error(`Invalid ID provided: ${id}`);
        }
    }

    protected validateData(data: unknown): void {
        if (!data) {
            throw new Error('Data is required for this operation');
        }
    }

    getAll(): Promise<T[]> {
        return withRetry(withErrorHandling(async (): Promise<T[]> => {
            logger.info(`Fetching all ${this.resourceEndpoint}`);
            return apiRequest<T[]>(this.resourceEndpoint);
        }, `${this.resourceEndpoint}.getAll`), 2)();
    }

    getById(id: string | number): Promise<T> {
        return withRetry(withErrorHandling(async (): Promise<T> => {
            this.validateId(id);
            logger.info(`Fetching ${this.resourceEndpoint} by ID`, {id});
            return apiRequest<T>(`${this.resourceEndpoint}/${id}`);
        }, `${this.resourceEndpoint}.getById`), 2)();
    }

    create(data: unknown): Promise<T> {
        return withErrorHandling(async (): Promise<T> => {
            this.validateData(data);
            logger.info(`Creating new ${this.resourceEndpoint}`, {data});
            return apiRequest<T>(this.resourceEndpoint, {
                method: 'POST',
                body: JSON.stringify(data),
            });
        }, `${this.resourceEndpoint}.create`)();
    }

    update(id: string | number, data: unknown): Promise<T> {
        return withErrorHandling(async (): Promise<T> => {
            this.validateId(id);
            this.validateData(data);
            logger.info(`Updating ${this.resourceEndpoint}`, {id, data});
            const payload = typeof data === 'object' && data !== null 
                ? {...(data as Record<string, unknown>), id: parseInt(id.toString(), 10)}
                : { id: parseInt(id.toString(), 10) };
            return apiRequest<T>(`${this.resourceEndpoint}/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload),
            });
        }, `${this.resourceEndpoint}.update`)();
    }

    delete(id: string | number): Promise<void> {
        return withErrorHandling(async (): Promise<void> => {
            this.validateId(id);
            logger.info(`Deleting ${this.resourceEndpoint}`, {id});
            return apiRequest<void>(`${this.resourceEndpoint}/${id}`, {
                method: 'DELETE',
            });
        }, `${this.resourceEndpoint}.delete`)();
    }
}