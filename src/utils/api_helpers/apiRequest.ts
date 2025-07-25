// Generic API request function
import {API_BASE_URL} from "../../constants/api";
import {getAuthHeaders, logger} from "../api";

export const apiRequest = async <T = void>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> => {
    const url = `${API_BASE_URL}${endpoint}`;
    const method = options.method || 'GET';
    const hasBody = !!options.body;
    const bodyContent = hasBody ? options.body : null;

    logger.debug('Making API request', {
        url,
        method,
        hasBody,
        bodyLength: bodyContent ? bodyContent.toString().length : 0,
        headers: options.headers ? Object.keys(options.headers) : []
    });

    try {
        const startTime = performance.now();
        const response = await fetch(url, {
            ...options,
            headers: {
                ...getAuthHeaders(),
                ...options.headers,
            },
        });

        const duration = performance.now() - startTime;
        logger.debug('API response received', {
            url,
            method,
            status: response.status,
            statusText: response.statusText,
            duration: `${duration.toFixed(2)}ms`,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries())
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error('API request failed', new Error(`${response.status}: ${errorText}`), {
                url,
                method,
                status: response.status,
                statusText: response.statusText,
                errorBody: errorText,
                requestBody: bodyContent?.toString(),
                duration: `${duration.toFixed(2)}ms`
            });
            throw new Error(`Request failed: ${response.status} - ${errorText}`);
        }

        // ✅ This block safely handles both JSON and empty responses
        const text = await response.text();
        if (!text) {
            logger.debug('Empty response body (likely PUT/DELETE)', {
                url,
                method,
                duration: `${duration.toFixed(2)}ms`,
            });
            return undefined as T; // <-- if T is void, this is fine
        }

        const data = JSON.parse(text);
        logger.debug('API request successful', {
            url,
            method,
            status: response.status,
            dataType: Array.isArray(data) ? 'array' : typeof data,
            dataLength: Array.isArray(data) ? data.length : 'N/A',
            duration: `${duration.toFixed(2)}ms`
        });
        return data;
    } catch (error) {
        logger.error('API request error', error as Error, {
            url,
            method,
            errorType: (error as Error).constructor.name,
            errorMessage: (error as Error).message,
            requestBody: bodyContent?.toString()
        });
        throw error;
    }
};

