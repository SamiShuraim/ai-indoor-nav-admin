// baseApi.ts
import {apiRequest} from "../api_helpers/apiRequest";
import {logger} from "../api";

export abstract class BaseApi<T> {
    abstract resourceEndpoint: string;

    getAll(): Promise<T[]> {
        logger.info(`Fetching all ${this.resourceEndpoint}`);
        return apiRequest<T[]>(this.resourceEndpoint);
    }

    getById(id: string | number): Promise<T> {
        logger.info(`Fetching ${this.resourceEndpoint} by ID`, {id});
        return apiRequest<T>(`${this.resourceEndpoint}/${id}`);
    }

    create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
        logger.info(`Creating new ${this.resourceEndpoint}`, {data});
        return apiRequest<T>(this.resourceEndpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    update(id: string | number, data: Partial<Omit<T, 'createdAt' | 'updatedAt'>>): Promise<void> {
        logger.info(`Updating ${this.resourceEndpoint}`, {id, data});
        const payload = {...data, id: parseInt(id.toString(), 10)};
        return apiRequest<void>(`${this.resourceEndpoint}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    }

    delete(id: string | number): Promise<void> {
        logger.info(`Deleting ${this.resourceEndpoint}`, {id});
        return apiRequest<void>(`${this.resourceEndpoint}/${id}`, {
            method: 'DELETE',
        });
    }
}