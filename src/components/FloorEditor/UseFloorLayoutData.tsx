import {useQuery} from "@tanstack/react-query";
import {FloorLayoutData} from "../../utils/api_helpers/api_interfaces/floorLayoutData";
import {poisApi, routeEdgesApi, routeNodesApi} from "../../utils/api";


export const getFloorLayoutData = async (floorId: number): Promise<FloorLayoutData> => {
    const [pois, routeNodes, routeEdges] = await Promise.all([
        poisApi.getByFloor(floorId.toString()),
        routeNodesApi.getByFloor(floorId.toString()),
        routeEdgesApi.getByFloor(floorId.toString()),
    ]);

    const nodes = routeNodes.map((node) => ({
        id: node.id,
        floorId: node.floorId,
        x: node.x,
        y: node.y,
        type: node.nodeType || "waypoint",
    }));

    const edges = routeEdges.map((edge) => ({
        id: edge.id,
        floorId: edge.floorId,
        fromNodeId: edge.fromNodeId,
        toNodeId: edge.toNodeId,
        weight: edge.weight ?? 1,
    }));

    return {
        pois,
        nodes,
        edges,
    };
};

export const useFloorLayoutData = (floorId: number | undefined, enabled: boolean = true) => {
    return useQuery({
        queryKey: ['floorLayout', floorId],
        queryFn: () => getFloorLayoutData(floorId!),
        enabled: !!floorId && enabled,
    });
};