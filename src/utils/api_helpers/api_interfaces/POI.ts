// POIs
import {PoiCategory} from "./poiCategory";

export interface POI {
    id: number;
    floorId: number;
    categoryId?: number;
    category?: PoiCategory;
    name: string;
    description?: string;
    poiType?: string;
    color?: string;
    isVisible: boolean;
    createdAt: string;
    updatedAt: string;
}