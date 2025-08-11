import {useMutation, useQueryClient} from '@tanstack/react-query';

type Change<T> = {
    data: T;
};

export type Createable<T extends { properties: { id?: number | string } }> = {
    type: 'Feature';
    geometry: {
        type: 'Point';
        coordinates: [number, number];
    };
    properties: Omit<T['properties'], 'id'>;
};

type CreateFn<T> = (data: T) => Promise<any>;
type UpdateFn<T> = (id: number, data: T) => Promise<any>;
type DeleteFn = (id: number) => Promise<any>;

export function useEntityMutations<
    T extends { properties: { id?: number | string } }
>(
    entityKey: string,
    api: {
        create: CreateFn<Createable<T>>;
        update: UpdateFn<T>;
        delete: DeleteFn;
    }
) {
    const queryClient = useQueryClient();

    const create = useMutation({
        mutationFn: async (change: Change<Createable<T>>) => {
            return api.create(change.data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: [entityKey]});
        },
        onError: (error) => {
            console.error(`❌ Failed to create ${entityKey.slice(0, -1)}:`, error);
        },
    });

    const update = useMutation({
        mutationFn: async (change: Change<T>) => {
            const id = change.data.properties.id;
            if (id === undefined || id === null) {
                throw new Error(`Missing ID in update for ${entityKey}`);
            }
            return api.update(Number(id), change.data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: [entityKey]});
        },
        onError: (error) => {
            console.error(`❌ Failed to update ${entityKey.slice(0, -1)}:`, error);
        },
    });

    const del = useMutation({
        mutationFn: async (id: number | string) => {
            return api.delete(Number(id));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: [entityKey]});
        },
        onError: (error) => {
            console.error(`❌ Failed to delete ${entityKey.slice(0, -1)}:`, error);
        },
    });

    return {create, update, delete: del};
}