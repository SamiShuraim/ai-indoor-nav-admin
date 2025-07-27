import {useMutation, useQueryClient} from '@tanstack/react-query';

type Change<T> = {
    data: T;
};

type CreateFn<T> = (data: T) => Promise<any>;
type UpdateFn<T> = (id: number, data: T) => Promise<any>;
type DeleteFn = (id: number) => Promise<any>;

export function useEntityMutations<T extends { id?: number | string }>(
    entityKey: string,
    api: {
        create: CreateFn<Omit<T, 'id'>>;
        update: UpdateFn<Omit<T, 'id'>>;
        delete: DeleteFn;
    }
) {
    const queryClient = useQueryClient();

    const create = useMutation({
        mutationFn: async (change: Change<T>) => {
            const {id, ...data} = change.data;
            return api.create(data as Omit<T, 'id'>);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: [entityKey]});
        },
        onError: (error) => {
            console.error(`Failed to create ${entityKey.slice(0, -1)}:`, error);
        },
    });

    const update = useMutation({
        mutationFn: async (change: Change<T>) => {
            const {id, ...data} = change.data;
            if (id === undefined || id === null) {
                throw new Error(`Missing ID in update for ${entityKey}`);
            }
            return api.update(parseInt(id.toString()), data as Omit<T, 'id'>);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: [entityKey]});
        },
        onError: (error) => {
            console.error(`Failed to update ${entityKey.slice(0, -1)}:`, error);
        },
    });

    const del = useMutation({
        mutationFn: async (id: number | string) => {
            return api.delete(parseInt(id.toString()));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: [entityKey]});
        },
        onError: (error) => {
            console.error(`Failed to delete ${entityKey.slice(0, -1)}:`, error);
        },
    });

    return {create, update, delete: del};
}
