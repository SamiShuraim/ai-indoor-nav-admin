import {useQuery} from "@tanstack/react-query";
import {beaconsApi, polygonsApi, routeNodesApi} from "../../utils/api";
import FloorLayoutData from "../../interfaces/FloorLayoutData";
import {RouteNodeBuilder} from "../../interfaces/RouteNode";

export const getFloorLayoutData = async (floorId: number): Promise<FloorLayoutData> => {
    const [polygons, routeNodes, beacons] = await Promise.all([
        polygonsApi.getByFloor(floorId.toString()),
        routeNodesApi.getByFloor(floorId.toString()),
        beaconsApi.getByFloor(floorId.toString()),
    ]);

    const nodes = routeNodes.map((node) => {
        return RouteNodeBuilder.fromRouteNode(node)
            .setConnections(node.properties.connections || node.properties.connected_node_ids || [])
            .build();
    });

    return {
        polygons,
        nodes,
        beacons,
    };
};

export const useFloorLayoutData = (floorId: number | undefined, enabled: boolean = true) => {
    return useQuery({
        queryKey: ['floorLayout', floorId],
        queryFn: () => getFloorLayoutData(floorId!),
        enabled: !!floorId && enabled,
    });
};