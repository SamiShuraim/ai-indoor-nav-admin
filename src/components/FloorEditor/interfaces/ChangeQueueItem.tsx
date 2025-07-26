import {OBJECT_TYPES} from "../enums/OBJECT_TYPES";
import {CHANGE_TYPES} from "../enums/CHANGE_TYPES";

export interface ChangeQueueItem {
    id: string; // unique for queue
    type: (typeof CHANGE_TYPES)[keyof typeof CHANGE_TYPES];
    objectType: (typeof OBJECT_TYPES)[keyof typeof OBJECT_TYPES];
    data: any; // the object data (for add/edit), or { id } for delete
}