import {useQuery} from "@tanstack/react-query";
import {beaconsApi, polygonsApi, routeNodesApi} from "../../utils/api";
import FloorLayoutData from "../../interfaces/FloorLayoutData";

export const getFloorLayoutData = async (floorId: number): Promise<FloorLayoutData> => {
    const [polygons, routeNodes, beacons] = await Promise.all([
        polygonsApi.getByFloor(floorId.toString()),
        routeNodesApi.getByFloor(floorId.toString()),
        beaconsApi.getByFloor(floorId.toString()),
    ]);

    const nodes = routeNodes.map((node) => {
        return ({
            geometry: node.geometry,
            properties: {
                id: node.properties.id,
                floor_id: node.properties.floor_id,
                is_visible: node.properties.is_visible,
                // Handle both field names for connections (backend vs frontend)
                connections: node.properties.connections || node.properties.connected_node_ids || [],
                node_type: node.properties.node_type, // Include node_type for elevator/stairs markers
            }
        });
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