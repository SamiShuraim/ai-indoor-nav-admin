# Backend Implementation: addConnection Endpoint

## Endpoint
```
POST /api/RouteNode/addConnection
```

## Request Body
```json
{
  "nodeId1": 123,
  "nodeId2": 456
}
```

## Simple Backend Implementation Example

```csharp
[HttpPost("addConnection")]
public async Task<IActionResult> AddConnection([FromBody] AddConnectionRequest request)
{
    try
    {
        // 1. Get both nodes from database
        var node1 = await _context.RouteNodes.FindAsync(request.NodeId1);
        var node2 = await _context.RouteNodes.FindAsync(request.NodeId2);
        
        if (node1 == null || node2 == null)
        {
            return NotFound("One or both nodes not found");
        }

        // 2. Get current connections (handle null)
        var connections1 = node1.ConnectedNodeIds ?? new List<int>();
        var connections2 = node2.ConnectedNodeIds ?? new List<int>();

        // 3. Add bidirectional connections (avoid duplicates)
        if (!connections1.Contains(request.NodeId2))
        {
            connections1.Add(request.NodeId2);
            node1.ConnectedNodeIds = connections1;
        }
        
        if (!connections2.Contains(request.NodeId1))
        {
            connections2.Add(request.NodeId1);
            node2.ConnectedNodeIds = connections2;
        }

        // 4. Save changes
        await _context.SaveChangesAsync();
        
        return Ok();
    }
    catch (Exception ex)
    {
        return StatusCode(500, $"Error adding connection: {ex.Message}");
    }
}

public class AddConnectionRequest
{
    public int NodeId1 { get; set; }
    public int NodeId2 { get; set; }
}
```

## What This Endpoint Does:

1. **Takes two node IDs** and creates a bidirectional connection
2. **Handles duplicates** - won't add connection if it already exists
3. **Updates both nodes** with the new connection
4. **Returns success/error** status

## Frontend Usage:

```javascript
// Connect two existing nodes
await routeNodesApi.addConnection(nodeA_id, nodeB_id);

// Multi-floor nodes - connect each pair
for (const otherNodeId of otherNodeIds) {
    await routeNodesApi.addConnection(currentNodeId, otherNodeId);
}
```

## Benefits:

- ✅ **Simple**: One API call instead of complex update logic
- ✅ **Atomic**: Either both nodes get updated or neither
- ✅ **No Duplicates**: Backend handles duplicate prevention
- ✅ **Bidirectional**: Automatically creates both A→B and B→A connections
- ✅ **Clean Code**: Frontend just calls `addConnection(id1, id2)`

This endpoint eliminates all the complex frontend connection logic and makes both node-to-node and multi-floor connections work reliably!