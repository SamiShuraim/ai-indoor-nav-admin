import {useQuery} from "@tanstack/react-query";
import {polygonsApi, routeNodesApi} from "../../utils/api";
import FloorLayoutData from "../../interfaces/FloorLayoutData";

export const getFloorLayoutData = async (floorId: number): Promise<FloorLayoutData> => {
    const [polygons, routeNodes] = await Promise.all([
        polygonsApi.getByFloor(floorId.toString()),
        routeNodesApi.getByFloor(floorId.toString()),
    ]);

    const nodes = routeNodes.map((node) => {
        return ({
            id: node.id,
            floorId: node.floorId,
            location: node.location,
            isVisible: node.isVisible,
            connections: node.connections,
        });
    });

    return {
        polygons,
        nodes,
    };
};

export const useFloorLayoutData = (floorId: number | undefined, enabled: boolean = true) => {
    return useQuery({
        queryKey: ['floorLayout', floorId],
        queryFn: () => getFloorLayoutData(floorId!),
        enabled: !!floorId && enabled,
    });
};