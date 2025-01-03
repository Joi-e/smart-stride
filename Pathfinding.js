class PriorityQueue {
  constructor() {
    // Internal array to store queue elements
    this.values = [];
  }

  // Add a new node with its priority to the queue
  enqueue(node, priority) {
    // Push the node with its priority to the values array
    this.values.push({ node, priority });
    // Sort the queue to maintain priority order
    this.sort();
  }

  // Remove and return the highest priority (lowest numerical value) item
  dequeue() {
    return this.values.shift();
  }

  // Sort the queue based on priority (lowest priority first)
  sort() {
    this.values.sort((a, b) => a.priority - b.priority);
  }
}

// Represents a single node in the graph with geographical coordinates
class GraphNode {
  constructor(lat, lng) {
    // Latitude and longitude coordinates
    this.lat = lat;
    this.lng = lng;

    // List of neighboring nodes and their connection weights
    this.neighbors = [];

    // A* algorithm cost tracking
    this.g = Infinity; // Cost from start node
    this.h = 0; // Heuristic estimated cost to end node
    this.f = Infinity; // Total estimated cost (g + h)

    // Parent node for path reconstruction
    this.parent = null;
  }

  // Add a neighboring node with its connection weight
  addNeighbor(node, weight) {
    this.neighbors.push({ node, weight });
  }
}

// Pathfinding class implementing A* and Dijkstra algorithms
export class PathFinder {
  constructor(coordinates, heuristicType = "haversine") {
    // Build graph from input coordinates
    this.graph = this.buildGraph(coordinates);

    // Set initial heuristic method
    this.setHeuristic(heuristicType);
  }

  // Dynamically set the heuristic calculation method
  setHeuristic(heuristicType) {
    switch (heuristicType.toLowerCase()) {
      case "manhattan":
        this.heuristic = this.manhattanDistance;
        break;
      case "euclidean":
        this.heuristic = this.euclideanDistance;
        break;
      case "octile":
        this.heuristic = this.octileDistance;
        break;
      case "chebyshev":
        this.heuristic = this.chebyshevDistance;
        break;
      case "haversine":
      default:
        // Default to octile distance if no specific type is provided
        this.heuristic = this.octileDistance;
    }
  }

  // Manhattan distance: sum of absolute differences in coordinates
  // Useful for grid-like movements, approximated in kilometers
  manhattanDistance(node, goal) {
    const latDiff = Math.abs(node.lat - goal.lat);
    const lngDiff = Math.abs(node.lng - goal.lng);
    // Rough conversion to kilometers (1 degree ≈ 111.2 km)
    return (latDiff + lngDiff) * 111.2;
  }

  // Euclidean (straight-line) distance between two points
  euclideanDistance(node, goal) {
    const latDiff = node.lat - goal.lat;
    const lngDiff = node.lng - goal.lng;
    // Calculate straight-line distance and convert to kilometers
    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111.2;
  }

  // Octile distance: allows diagonal movement, useful for more natural pathfinding
  octileDistance(node, goal) {
    const latDiff = Math.abs(node.lat - goal.lat);
    const lngDiff = Math.abs(node.lng - goal.lng);

    const D = 111.2; // kilometers per degree at equator
    return (
      D *
      (Math.max(latDiff, lngDiff) +
        (Math.SQRT2 - 1) * Math.min(latDiff, lngDiff))
    );
  }

  // Chebyshev distance: maximum of coordinate differences
  // Represents movement where diagonal moves are allowed at the same cost
  chebyshevDistance(node, goal) {
    const latDiff = Math.abs(node.lat - goal.lat);
    const lngDiff = Math.abs(node.lng - goal.lng);
    // Convert to approximate kilometers
    return 111.2 * Math.max(latDiff, lngDiff);
  }

  // Haversine formula: most accurate distance calculation on a sphere (Earth)
  haversineDistance(node, goal) {
    const R = 6371; // Earth's radius in kilometers

    // Convert latitude and longitude to radians
    const dLat = ((goal.lat - node.lat) * Math.PI) / 180;
    const dLon = ((goal.lng - node.lng) * Math.PI) / 180;

    // Haversine formula calculations
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((node.lat * Math.PI) / 180) *
        Math.cos((goal.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // Return distance in kilometers
    return R * c;
  }

  // Construct graph by creating nodes and connecting nearby points
  buildGraph(coordinates) {
    // Create GraphNode instances from input coordinates
    const nodes = coordinates.map(
      (coord) => new GraphNode(coord.latitude, coord.longitude)
    );

    console.log("Total Nodes Created:", nodes.length);

    // Connect nodes that are within a short walking distance (500m)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        // Calculate distance between nodes
        const distance = this.haversineDistance(nodes[i], nodes[j]);

        // Only connect nodes within 500 meters
        if (distance <= 0.5) {
          nodes[i].addNeighbor(nodes[j], distance);
          nodes[j].addNeighbor(nodes[i], distance);
        }
      }
    }

    return nodes;
  }

  getMemoryUsage() {
    if (performance.memory) {
      return {
        usedJSHeapSize: Math.round(
          performance.memory.usedJSHeapSize / 1024 / 1024
        ),
        totalJSHeapSize: Math.round(
          performance.memory.totalJSHeapSize / 1024 / 1024
        ),
      };
    }
    return process?.memoryUsage
      ? {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        }
      : null;
  }

  // A* Pathfinding algorithm implementation
  async findPathAStar(start, end) {
    const metrics = {
      startTime: performance.now(),
      nodesExplored: 0,
      pathLength: 0,
      executionTime: 0,
      startMemory: this.getMemoryUsage(),
      peakMemory: null,
      endMemory: null,
    };

    console.log("A* Path Finding - Starting Search", {
      start: `${start.latitude},${start.longitude}`,
      end: `${end.latitude},${end.longitude}`,
      initialMemory: metrics.startMemory,
    });

    // Find the closest graph nodes to the start and end coordinates
    const startNode = this.graph.reduce((closest, node) => {
      const distance = this.haversineDistance(
        { lat: node.lat, lng: node.lng },
        { lat: start.latitude, lng: start.longitude }
      );
      return !closest || distance < closest.distance
        ? { node, distance }
        : closest;
    }, null)?.node;

    const endNode = this.graph.reduce((closest, node) => {
      const distance = this.haversineDistance(
        { lat: node.lat, lng: node.lng },
        { lat: end.latitude, lng: end.longitude }
      );
      return !closest || distance < closest.distance
        ? { node, distance }
        : closest;
    }, null)?.node;

    // Validate that start and end nodes were found
    if (!startNode || !endNode) {
      console.error("A* Path Finding: Start or end node not found", {
        startNodeFound: !!startNode,
        endNodeFound: !!endNode,
      });
      metrics.executionTime = performance.now() - metrics.startTime;
      console.log("A* Search Failed - Metrics:", metrics);
      return null;
    }

    // Initialize data structures for A* algorithm
    const openSet = new PriorityQueue();
    const closedSet = new Set();

    // Setup start node
    startNode.g = 0;
    startNode.h = this.heuristic(startNode, endNode);
    startNode.f = startNode.h;
    openSet.enqueue(startNode, startNode.f);

    // Main A* algorithm loop
    while (openSet.values.length > 0) {
      metrics.nodesExplored++;
      const currentMemory = this.getMemoryUsage();
      if (
        !metrics.peakMemory ||
        (currentMemory?.usedJSHeapSize || currentMemory?.heapUsed) >
          (metrics.peakMemory?.usedJSHeapSize || metrics.peakMemory?.heapUsed)
      ) {
        metrics.peakMemory = currentMemory;
      }
      // Get the node with lowest f-score
      const current = openSet.dequeue().node;

      // Check if reached the goal
      if (current === endNode) {
        const path = this.reconstructPath(current);
        metrics.pathLength = path.reduce((total, point, index, array) => {
          if (index === 0) return 0;
          return (
            total +
            this.haversineDistance(
              {
                lat: array[index - 1].latitude,
                lng: array[index - 1].longitude,
              },
              { lat: point.latitude, lng: point.longitude }
            )
          );
        }, 0);

        metrics.executionTime = performance.now() - metrics.startTime;
        metrics.endMemory = this.getMemoryUsage();
        console.log("A* Search Complete - Metrics:", {
          ...metrics,
          pathLength: `${metrics.pathLength.toFixed(2)}km`,
          executionTime: `${metrics.executionTime.toFixed(2)}ms`,
          memoryStats: {
            start: metrics.startMemory,
            peak: metrics.peakMemory,
            end: metrics.endMemory,
          },
          openSetSize: openSet.values.length,
          closedSetSize: closedSet.size,
        });

        return path;
      }

      // Mark current node as visited
      closedSet.add(current);

      // Explore neighbors
      for (const { node: neighbor, weight } of current.neighbors) {
        // Skip already visited neighbors
        if (closedSet.has(neighbor)) continue;

        // Calculate tentative g-score
        const tentativeG = current.g + weight;

        // Update neighbor if a better path is found
        if (tentativeG < neighbor.g) {
          neighbor.parent = current;
          neighbor.g = tentativeG;
          neighbor.h = this.heuristic(neighbor, endNode);
          neighbor.f = neighbor.g + neighbor.h;

          // Add to open set if not already present
          if (!openSet.values.some((item) => item.node === neighbor)) {
            openSet.enqueue(neighbor, neighbor.f);
          }
        }
      }
    }

    metrics.executionTime = performance.now() - metrics.startTime;
    console.log("A* Search Failed - No Path Found - Metrics:", {
      ...metrics,
      executionTime: `${metrics.executionTime.toFixed(2)}ms`,
      nodesExplored: metrics.nodesExplored,
    });
    return null; // No path found
  }

  // Dijkstra's shortest path algorithm implementation
  async findPathDijkstra(start, end) {
    const metrics = {
      startTime: performance.now(),
      nodesExplored: 0,
      pathLength: 0,
      executionTime: 0,
    };

    console.log("Dijkstra Path Finding - Starting Search", {
      start: `${start.latitude},${start.longitude}`,
      end: `${end.latitude},${end.longitude}`,
    });

    // Find the closest graph nodes to the start and end coordinates
    const startNode = this.graph.reduce((closest, node) => {
      const distance = this.haversineDistance(
        { lat: node.lat, lng: node.lng },
        { lat: start.latitude, lng: start.longitude }
      );
      return !closest || distance < closest.distance
        ? { node, distance }
        : closest;
    }, null)?.node;

    const endNode = this.graph.reduce((closest, node) => {
      const distance = this.haversineDistance(
        { lat: node.lat, lng: node.lng },
        { lat: end.latitude, lng: end.longitude }
      );
      return !closest || distance < closest.distance
        ? { node, distance }
        : closest;
    }, null)?.node;

    // Validate that start and end nodes were found
    if (!startNode || !endNode) {
      console.error("Dijkstra Path Finding: Start or end node not found", {
        startNodeFound: !!startNode,
        endNodeFound: !!endNode,
      });
      metrics.executionTime = performance.now() - metrics.startTime;
      console.log("Dijkstra Search Failed - Metrics:", metrics);
      return null;
    }

    // Initialize data structures for Dijkstra's algorithm
    const distances = new Map();
    const previous = new Map();
    const unvisited = new PriorityQueue();

    // Initialize all nodes with infinite distance
    this.graph.forEach((node) => {
      distances.set(node, Infinity);
      previous.set(node, null);
    });

    // Set start node distance to 0
    distances.set(startNode, 0);
    unvisited.enqueue(startNode, 0);

    // Main Dijkstra algorithm loop
    while (unvisited.values.length > 0) {
      metrics.nodesExplored++;
      // Get node with lowest distance
      const current = unvisited.dequeue().node;

      // Check if reached the goal

      if (current === endNode) {
        const path = this.reconstructPathDijkstra(endNode, previous);
        metrics.pathLength = path.reduce((total, point, index, array) => {
          if (index === 0) return 0;
          return (
            total +
            this.haversineDistance(
              {
                lat: array[index - 1].latitude,
                lng: array[index - 1].longitude,
              },
              { lat: point.latitude, lng: point.longitude }
            )
          );
        }, 0);

        metrics.executionTime = performance.now() - metrics.startTime;
        console.log("Dijkstra Search Complete - Metrics:", {
          ...metrics,
          pathLength: `${metrics.pathLength.toFixed(2)}km`,
          executionTime: `${metrics.executionTime.toFixed(2)}ms`,
          unvisitedSize: unvisited.values.length,
        });

        return path;
      }
      // Explore neighbors and update distances
      for (const { node: neighbor, weight } of current.neighbors) {
        const distance = distances.get(current) + weight;

        // Update if a shorter path is found
        if (distance < distances.get(neighbor)) {
          distances.set(neighbor, distance);
          previous.set(neighbor, current);
          unvisited.enqueue(neighbor, distance);
        }
      }
    }

    metrics.executionTime = performance.now() - metrics.startTime;
    console.log("Dijkstra Search Failed - No Path Found - Metrics:", {
      ...metrics,
      executionTime: `${metrics.executionTime.toFixed(2)}ms`,
      nodesExplored: metrics.nodesExplored,
    });

    return null; // No path found
  }

  // Reconstruct the path from start to end for A* algorithm
  reconstructPath(endNode) {
    const path = [];
    let current = endNode;

    // Traverse back through parent nodes
    while (current !== null) {
      path.unshift({
        latitude: current.lat,
        longitude: current.lng,
      });
      current = current.parent;
    }

    return path;
  }

  // Reconstruct the path from start to end for Dijkstra's algorithm
  reconstructPathDijkstra(endNode, previous) {
    const path = [];
    let current = endNode;

    // Traverse back through previous nodes
    while (current !== null) {
      path.unshift({
        latitude: current.lat,
        longitude: current.lng,
      });
      current = previous.get(current);
    }

    return path;
  }
}
