/**
 * Common type definitions used across the application
 */

// Generic ID type
export type ID = number | string;

// Coordinates type
export type Coordinates = [number, number]; // [longitude, latitude]

// GeoJSON types
export interface GeoJSONGeometry {
    type: string;
    coordinates: number[] | number[][] | number[][][];
}

export interface PointGeometry {
    type: "Point";
    coordinates: Coordinates;
}

export interface PolygonGeometry {
    type: "Polygon";
    coordinates: number[][][];
}

// Map-related types
export interface MapMarker {
    id: string;
    coordinates: Coordinates;
    type: 'polygon' | 'beacon' | 'node';
    element?: HTMLElement;
    popup?: string;
}

export interface MapClickEvent {
    lngLat: {
        lng: number;
        lat: number;
    };
    point: {
        x: number;
        y: number;
    };
    originalEvent: MouseEvent;
}

// API response types
export interface ApiResponse<T = unknown> {
    data: T;
    message?: string;
    status: number;
}

export interface ApiError {
    message: string;
    status?: number;
    code?: string;
    details?: Record<string, unknown>;
}

// Form data types
export interface FormField<T = unknown> {
    value: T;
    error?: string;
    touched?: boolean;
    required?: boolean;
}

export interface FormState<T extends Record<string, unknown>> {
    fields: { [K in keyof T]: FormField<T[K]> };
    isValid: boolean;
    isSubmitting: boolean;
    errors: Record<string, string>;
}

// Entity types
export interface Entity {
    id: number;
    created_at?: string;
    updated_at?: string;
}

export interface NamedEntity extends Entity {
    name: string;
    description?: string;
}

// Query and mutation types
export interface QueryOptions {
    enabled?: boolean;
    refetchOnMount?: boolean;
    refetchOnWindowFocus?: boolean;
    staleTime?: number;
    gcTime?: number;
    retry?: number | boolean;
}

export interface MutationOptions {
    onSuccess?: (data: unknown) => void;
    onError?: (error: Error) => void;
}

// Filter and search types
export interface SearchFilter {
    field: string;
    value: string | number | boolean;
    operator?: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'gte' | 'lte';
}

export interface SortOption {
    field: string;
    direction: 'asc' | 'desc';
}

export interface PaginationOptions {
    page: number;
    limit: number;
    total?: number;
}

// Validation types
export interface ValidationRule<T = unknown> {
    validate: (value: T) => boolean | string;
    message?: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: Record<string, string>;
}

// State management types
export interface AsyncState<T = unknown> {
    data: T | null;
    loading: boolean;
    error: string | null;
}

export interface DialogState {
    isOpen: boolean;
    title?: string;
    content?: string;
    actions?: Array<{
        label: string;
        action: () => void;
        variant?: 'primary' | 'secondary' | 'danger';
    }>;
}

// Component prop types
export interface BaseComponentProps {
    className?: string;
    children?: React.ReactNode;
    testId?: string;
}

export interface ButtonProps extends BaseComponentProps {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    loading?: boolean;
    onClick?: () => void;
}

export interface InputProps extends BaseComponentProps {
    type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
    value: string | number;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    error?: string;
    onChange: (value: string | number) => void;
    onBlur?: () => void;
    onFocus?: () => void;
}

// Drawing and editor types
export interface DrawingPoint {
    x: number;
    y: number;
    id?: string;
}

export interface DrawingPolygon {
    points: DrawingPoint[];
    closed: boolean;
    id?: string;
}

export interface EditorAction {
    type: 'create' | 'update' | 'delete';
    entityType: 'polygon' | 'beacon' | 'node';
    entityId?: number;
    data?: Record<string, unknown>;
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Function types
export type EventHandler<T = unknown> = (event: T) => void;
export type AsyncEventHandler<T = unknown> = (event: T) => Promise<void>;
export type Predicate<T> = (item: T) => boolean;
export type Mapper<T, U> = (item: T) => U;
export type Reducer<T, U> = (accumulator: U, current: T) => U;