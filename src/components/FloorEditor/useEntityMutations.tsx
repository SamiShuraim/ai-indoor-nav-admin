import {useMutation, useQueryClient} from '@tanstack/react-query';

type Change<T> = {
    data: T;
};

export type Createable<T extends { properties: { id?: number | string }, geometry?: any }> = {
    type: 'Feature';
    geometry: T['geometry'];
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
            console.log(`🚀 Creating ${entityKey}:`, change.data);
            const response = await api.create(change.data);
            console.log(`✅ Create response for ${entityKey}:`, response);
            return response;
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
            console.log(`🔄 Updating ${entityKey} ${id}:`, change.data);
            const response = await api.update(Number(id), change.data);
            console.log(`✅ Update response for ${entityKey} ${id}:`, response);
            return response;
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