import { RouteNode, RouteNodeBuilder } from "../interfaces/RouteNode";
import { Polygon, PolygonBuilder } from "../interfaces/Polygon";
import { Beacon, BeaconBuilder } from "../interfaces/Beacon";
import { beaconsApi, polygonsApi, routeNodesApi } from "../utils/api";
import { createLogger } from "../utils/logger";
import { convertPointsToCoordinates } from "../utils/mapUtils";
import { Point } from "@maptiler/sdk";

const logger = createLogger("FloorEditorService");

export interface CreateNodeOptions {
    floorId: number;
    lng: number;
    lat: number;
    nodeType?: string;
    connectToNodeId?: number | null;
}

export interface CreatePolygonOptions {
    floorId: number;
    name: string;
    description?: string;
    type?: string;
    color?: string;
    categoryId?: number | null;
    points: Point[];
}

export interface CreateBeaconOptions {
    floorId: number;
    name: string;
    lng: number;
    lat: number;
    beaconTypeId?: number | null;
    uuid?: string | null;
    majorId?: number | null;
    minorId?: number | null;
    isActive?: boolean;
    batteryLevel?: number;
}

export interface CreateMultiFloorNodesOptions {
    floorIds: number[];
    lng: number;
    lat: number;
    nodeType: string;
    currentFloorId: number;
    connectToNodeId?: number | null;
}

export class FloorEditorService {
    /**
     * Creates a new route node with optional connection
     */
    static async createRouteNode(options: CreateNodeOptions): Promise<number> {
        const { floorId, lng, lat, nodeType, connectToNodeId } = options;

        logger.info("Creating route node", { options });

        try {
            // Create the node
            const newNodeData = new RouteNodeBuilder()
                .setFloorId(floorId)
                .setLocation(lng, lat)
                .setIsVisible(true)
                .setNodeType(nodeType)
                .build();

            const createdNode = await routeNodesApi.create(newNodeData);
            const newNodeId = createdNode?.properties?.id;

            if (!newNodeId) {
                throw new Error("Backend didn't return node ID");
            }

            // Add connection if specified
            if (connectToNodeId) {
                logger.info("Adding connection between nodes", { newNodeId, connectToNodeId });
                await routeNodesApi.addConnection(newNodeId, connectToNodeId);
            }

            logger.info("Route node created successfully", { newNodeId });
            return newNodeId;
        } catch (error) {
            logger.error("Failed to create route node", error as Error);
            throw error;
        }
    }

    /**
     * Creates multiple connected nodes across floors (for elevators/stairs)
     */
    static async createMultiFloorNodes(options: CreateMultiFloorNodesOptions): Promise<number[]> {
        const { floorIds, lng, lat, nodeType, currentFloorId, connectToNodeId } = options;

        logger.info("Creating multi-floor nodes", { options });

        try {
            const createdNodeIds: number[] = [];

            // Step 1: Create nodes on all selected floors
            for (const targetFloorId of floorIds) {
                let currentConnectToNodeId: number | null = null;
                if (targetFloorId === currentFloorId && connectToNodeId) {
                    currentConnectToNodeId = connectToNodeId;
                }

                const nodeId = await this.createRouteNode({
                    floorId: targetFloorId,
                    lng,
                    lat,
                    nodeType,
                    connectToNodeId: currentConnectToNodeId
                });

                createdNodeIds.push(nodeId);
            }

            // Step 2: Connect all multi-floor nodes to each other (vertical connections)
            if (createdNodeIds.length > 1) {
                for (let i = 0; i < createdNodeIds.length; i++) {
                    const currentNodeId = createdNodeIds[i];
                    const otherNodeIds = createdNodeIds.filter(id => id !== currentNodeId);

                    for (const otherNodeId of otherNodeIds) {
                        await routeNodesApi.addConnection(currentNodeId, otherNodeId);
                    }
                }
            }

            logger.info("Multi-floor nodes created successfully", { createdNodeIds });
            return createdNodeIds;
        } catch (error) {
            logger.error("Failed to create multi-floor nodes", error as Error);
            throw error;
        }
    }

    /**
     * Creates a new polygon
     */
    static async createPolygon(options: CreatePolygonOptions): Promise<Polygon> {
        const { floorId, name, description = "", type = "Room", color = "#3b82f6", categoryId = null, points } = options;

        logger.info("Creating polygon", { options });

        try {
            const newPolygon = new PolygonBuilder()
                .setFloorId(floorId)
                .setName(name)
                .setDescription(description)
                .setType(type as any)
                .setIsVisible(true)
                .setColor(color)
                .setCategoryId(categoryId)
                .setGeometry(convertPointsToCoordinates(points))
                .build();

            // Remove ID from properties to let backend generate it
            const { id, ...propertiesWithoutId } = newPolygon.properties;
            const polygonForCreation = {
                ...newPolygon,
                properties: propertiesWithoutId
            };

            const createdPolygon = await polygonsApi.create(polygonForCreation);
            logger.info("Polygon created successfully", { name });
            return createdPolygon;
        } catch (error) {
            logger.error("Failed to create polygon", error as Error);
            throw error;
        }
    }

    /**
     * Creates a new beacon
     */
    static async createBeacon(options: CreateBeaconOptions): Promise<Beacon> {
        const {
            floorId,
            name,
            lng,
            lat,
            beaconTypeId = null,
            uuid = null,
            majorId = null,
            minorId = null,
            isActive = true,
            batteryLevel = 100
        } = options;

        logger.info("Creating beacon", { options });

        try {
            const newBeacon = new BeaconBuilder()
                .setFloorId(floorId)
                .setName(name)
                .setGeometry(lng, lat)
                .setBeaconTypeId(beaconTypeId)
                .setUuid(uuid)
                .setMajorId(majorId)
                .setMinorId(minorId)
                .setIsActive(isActive)
                .setIsVisible(true)
                .setBatteryLevel(batteryLevel)
                .build();

            // Remove ID from properties to let backend generate it
            const { id, ...propertiesWithoutId } = newBeacon.properties;
            const beaconForCreation = {
                ...newBeacon,
                properties: propertiesWithoutId
            };

            const createdBeacon = await beaconsApi.create(beaconForCreation);
            logger.info("Beacon created successfully", { name });
            return createdBeacon;
        } catch (error) {
            logger.error("Failed to create beacon", error as Error);
            throw error;
        }
    }

    /**
     * Updates a polygon using the builder pattern
     */
    static async updatePolygon(polygon: Polygon, updates: Partial<{ name: string; description: string; type: string; color: string; categoryId: number | null }>): Promise<Polygon> {
        logger.info("Updating polygon", { polygonId: polygon.properties.id, updates });

        try {
            let builder = PolygonBuilder.fromPolygon(polygon);

            if (updates.name !== undefined) builder = builder.setName(updates.name);
            if (updates.description !== undefined) builder = builder.setDescription(updates.description);
            if (updates.type !== undefined) builder = builder.setType(updates.type as any);
            if (updates.color !== undefined) builder = builder.setColor(updates.color);
            if (updates.categoryId !== undefined) builder = builder.setCategoryId(updates.categoryId);

            const updatedPolygon = builder.build();
            const result = await polygonsApi.update(polygon.properties.id, updatedPolygon);
            
            logger.info("Polygon updated successfully", { polygonId: polygon.properties.id });
            return result;
        } catch (error) {
            logger.error("Failed to update polygon", error as Error);
            throw error;
        }
    }

    /**
     * Updates a beacon using the builder pattern
     */
    static async updateBeacon(beacon: Beacon, updates: Partial<{ name: string; isActive: boolean; batteryLevel: number }>): Promise<Beacon> {
        logger.info("Updating beacon", { beaconId: beacon.properties.id, updates });

        try {
            let builder = BeaconBuilder.fromBeacon(beacon);

            if (updates.name !== undefined) builder = builder.setName(updates.name);
            if (updates.isActive !== undefined) builder = builder.setIsActive(updates.isActive);
            if (updates.batteryLevel !== undefined) builder = builder.setBatteryLevel(updates.batteryLevel);

            const updatedBeacon = builder.build();
            const result = await beaconsApi.update(beacon.properties.id, updatedBeacon);
            
            logger.info("Beacon updated successfully", { beaconId: beacon.properties.id });
            return result;
        } catch (error) {
            logger.error("Failed to update beacon", error as Error);
            throw error;
        }
    }

    /**
     * Deletes multiple entities of different types
     */
    static async bulkDelete(items: Array<{ type: 'polygon' | 'beacon' | 'node', id: number }>): Promise<void> {
        logger.info("Performing bulk delete", { items });

        try {
            const deletePromises = items.map(async (item) => {
                switch (item.type) {
                    case 'polygon':
                        return polygonsApi.delete(item.id);
                    case 'beacon':
                        return beaconsApi.delete(item.id);
                    case 'node':
                        return routeNodesApi.delete(item.id);
                    default:
                        throw new Error(`Unknown item type: ${item.type}`);
                }
            });

            await Promise.all(deletePromises);
            logger.info("Bulk delete completed successfully");
        } catch (error) {
            logger.error("Failed to perform bulk delete", error as Error);
            throw error;
        }
    }

    /**
     * Recalculates closest nodes for all POIs on a floor
     */
    static async recalculatePoiNodes(floorId: number): Promise<{ updatedPois: number; message: string }> {
        logger.info("Recalculating POI closest nodes", { floorId });

        try {
            const result = await polygonsApi.recalculateClosestNodes(floorId);
            logger.info("POI nodes recalculated successfully", { result });
            return result;
        } catch (error) {
            logger.error("Failed to recalculate POI nodes", error as Error);
            throw error;
        }
    }
}