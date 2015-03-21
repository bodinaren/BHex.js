/**
 * The namespace. This namespace does by itself not include any code related to drawing Hexagons. It's just the logics of them.
 * @namespace
 */
var BHex = BHex || {};

/**
 * BHex.Axial is a axial position of a Hexagon within a grid.
 * @class
 * @param {number} x - Value of the X axis
 * @param {number} y - Value of the Y axis
 * @property {number} x - Value of the X axis
 * @property {number} y - Value of the Y axis
 */
BHex.Axial = function (x, y) {
	this.x = x;
	this.y = y;
};

BHex.Axial.prototype.getKey = function () {
	return this.x + "x" + this.y;
};

/**
 * Return a BHex.Cube representation of the axial.
 * @returns {BHex.Cube}
 */
BHex.Axial.prototype.toCube = function() {
	return new BHex.Cube(this.x, -this.x - this.y, this.y);
};

/**
 * Check if two Axial items has the same x and y.
 * @param {BHex.Axial} other - The object to compare to.
 * @returns {boolean}
 */
BHex.Axial.prototype.compareTo = function(other) {
	return (this.x == other.x && this.y == other.y);
};

/**
 * BHex.Cube is a cubic position of a Hexagon within a grid which includes the Z variable. Note that in a hexagonal grid, x + y + z should always equal 0!
 * @class
 * @augments BHex.Axial
 * @param {number} x - Value of the cubic X axis
 * @param {number} y - Value of the cubic Y axis
 * @param {number} [z=x + y] - Value of the cubic Z axis.
 * @property {number} x - Value of the cubic X axis
 * @property {number} y - Value of the cubic Y axis
 * @property {number} < - Value of the cubic Z axis.
 */
BHex.Cube = function (x, y, z) {
	BHex.Axial.call(this, x, y);
	this.z = z || -x-y;
};
BHex.Cube.prototype = BHex.Axial.prototype;

/**
 * Returns a BHex.Axial representation of the cube.
 * @returns {BHex.Axial}
 */
BHex.Cube.prototype.toAxial = function () {
	return new BHex.Axial(this.x, this.z);
};

/**
 * BHex.Hexagon
 * @class
 * @augments BHex.Axial
 * @param {number} x - Value of the X axis
 * @param {number} y - Value of the Y axis
 * @param {number} [cost=1] - The movement cost to step on the hexagon. For the pathfinding to work optimally, minimum cost should be 1.
 * @param {boolean} [blocked=false] - If movement is enabled on this hexagon.
 * @property {number} x - Value of the X axis
 * @property {number} y - Value of the Y axis
 * @property {number} cost - The movement cost to step on the hexagon. For the pathfinding to work optimally, minimum cost should be 1.
 * @property {boolean} blocked - If movement is enabled on this hexagon.
 */
BHex.Hexagon = function (x, y, cost, blocked) {
	BHex.Axial.call(this, x, y);

	this.cost = (cost) ? cost : 1;
	this.blocked = !!blocked;
};
BHex.Hexagon.prototype = BHex.Axial.prototype;

/**
 * BHex.Grid is a grid of one or more Hexagons, created from the center outwards in a circle.
 * @class
 * @param {number} radius - The radius of the grid with 0 being just the center piece.
 * @property {number} radius - The radius of the grid with 0 being just the center piece.
 * @property {Array} hexes - The hexes of the grid.
 */
BHex.Grid = function (radius) {
	this.radius = radius || 0;
	this.hexes = [];
	
	for (var x = -radius; x <= radius; x++)
		for (var y = -radius; y <= radius; y++)
			for (var z = -radius; z <= radius; z++)
				if (x + y + z == 0)
					this.hexes.push(new BHex.Hexagon(x, y));
};

/**
 * Get the hexagon at a given axial position.
 * @param {BHex.Axial} a - The axial position to look for.
 * @returns {BHex.Hexagon}
 */
BHex.Grid.prototype.getHexAt = function (a) {
	var hex;
	this.hexes.some(function(h) {
		if (h.compareTo(a)) 
			return hex = h;
	});
	return hex;
};

/**
 * Get the neighboring hexagons at a given axial position.
 * @param {BHex.Axial} a - The axial position to get neighbors for.
 * @returns {BHex.Hexagon[]} Array of neighboring hexagons.
 */
BHex.Grid.prototype.getNeighbors = function (a) {
	var grid = this;
	
	var neighbors = [],
		directions = [
			new BHex.Axial(a.x + 1, a.y), new BHex.Axial(a.x + 1, a.y - 1), new BHex.Axial(a.x, a.y - 1),
			new BHex.Axial(a.x - 1, a.y), new BHex.Axial(a.x - 1, a.y + 1), new BHex.Axial(a.x, a.y + 1)
		];
	
	directions.forEach(function(d) {
		var h = grid.getHexAt(d)
		if (h) neighbors.push(h);
	});
	
	return neighbors;
	
};

/**
 * Gets the distance between two axial positions ignoring any obstacles.
 * @param {BHex.Axial} a - The first axial position.
 * @param {BHex.Axial} b - The second axial position.
 * @returns {number} How many hexes it is between the given Axials.
 */
BHex.Grid.prototype.getDistance = function (a, b) {
	return (Math.abs(a.x - b.x) 
		+ Math.abs(a.x + a.y - b.x - b.y)
		+ Math.abs(a.y - b.y))
		/ 2
};


/**
 * Contains helper objects for doing searches within the grid.
 * @namespace
 * @private
 */
BHex.Grid.Search = BHex.Grid.Search || {};


/**
 * Creates a binary heap.
 * @class
 * @private
 */
BHex.Grid.Search.Heap = function () {
	return new BinaryHeap(function (node) {
		return node.F;
	});
};

/**
 * Helper class to store data relevant to our astar search. This class is used to avoid dumping data on our hexes.
 * @class
 * @private
 * @param {BHex.Hexagon} hex - The hexagon this node is relevant for.
 * @param {BHex.Hexagon} parent - How we came to this hexagon.
 * @param {number} g - The movement cost to move from the starting point A to a given hex on the grid, following the path generated to get there.
 * @param {number} [h=0] - The Heuristic (estimated) cost to get to the final destination.
 * @property {number} F - The sum of G + H
 */
BHex.Grid.Search.Node = function (hex, parent, g, h) {
	this.hex = hex;
	this.parent = this.G = this.H = this.F = null;
	this.rescore(parent, g, h);
};
/**
 * Rescore the node. Set a new parent and updates the G, H and F score.
 * @param {BHex.Hexagon} parent - How we came to this hexagon.
 * @param {number} g - The movement cost to move from the starting point A to a given hex on the grid, following the path generated to get there.
 * @property {number} [h=0] - The Heuristic (estimated) cost to get to the final destination.
 */
BHex.Grid.Search.Node.prototype.rescore = function (parent, g, h) {
	this.parent = parent;
	this.G = g;
	this.H = h || 0;
	this.F = this.G + this.H;
};

/**
 * Gets all the hexes within a specified range, taking inertia (BHex.Hexagon.cost) into account.
 * @param {BHex.Axial} a - The starting axial position.
 * @param {number} movement - How far from the starting axial should be fetched.
 * @returns {BHex.Hexagon[]} All the hexes within range (excluding the starting position).
 */
BHex.Grid.prototype.getRange = function (start, movement) {
	var grid = this,
	
		openHeap = BHex.Grid.Search.Heap(),
		closedHexes = {},
		visitedNodes = {};

	openHeap.push(new BHex.Grid.Search.Node(start, null, 0));
	
	while(openHeap.size() > 0) {
		// Get the item with the lowest score (current + heuristic).
		var current = openHeap.pop();
		
		// Close the hex as processed.
		closedHexes[current.hex.getKey()] = current.hex;
		
		// Get and iterate the neighbors.
		var neighbors = grid.getNeighbors(current.hex);

		neighbors.forEach(function(n) {
			// Make sure the neighbor is not blocked and that we haven't already processed it.
			if (n.blocked || closedHexes[n.getKey()]) return;
			
			// Get the total cost of going to this neighbor.
			var g = current.G + n.cost,
				visited = visitedNodes[n.getKey()];
			
			// Is it cheaper the previously best path to get here?
			if (g <= movement && (!visited || g < visited.G)) {
				var h = 0;
				
				if (!visited) {
					// This was the first time we visited this node, add it to the heap.
					var nNode = new BHex.Grid.Search.Node(n, current, g, h);
					visitedNodes[n.getKey()] = nNode;
					openHeap.push(nNode);
				} else {
					// We've visited this path before, but found a better path. Rescore it.
					visited.rescore(current, g, h);
					openHeap.rescoreElement(visited);
				}
			}
		});
	}
	
	var arr = [];
	for (var i in visitedNodes)
		if (visitedNodes.hasOwnProperty(i))
			arr.push(visitedNodes[i].hex);
	
	return arr;
};

/**
 * Get the shortest path from two axial positions, taking inertia (BHex.Hexagon.cost) into account.
 * @param {BHex.Axial} start - The starting axial position.
 * @param {BHex.Axial} end - The ending axial position.
 * @returns {BHex.Hexagon[]} The path from the first hex to the last hex (excluding the starting position).
 */
BHex.Grid.prototype.findPath = function (start, end) {
	var grid = this,
		openHeap = new BHex.Grid.Search.Heap(),
		closedHexes = {},
		visitedNodes = {};

	openHeap.push(new BHex.Grid.Search.Node(start, null, 0, grid.getDistance(start, end)));
	
	while(openHeap.size() > 0) {
		// Get the item with the lowest score (current + heuristic).
		var current = openHeap.pop();
		
		// SUCCESS: If this is where we're going, backtrack and return the path.
		if (current.hex.compareTo(end)) {
			var path = [];
			while(current.parent) {
				path.push(current);
				current = current.parent;
			}
			return path.map(function(x) { return x.hex; }).reverse();
		}
		
		// Close the hex as processed.
		closedHexes[current.hex.getKey()] = current;
		
		// Get and iterate the neighbors.
		var neighbors = grid.getNeighbors(current.hex);
		neighbors.forEach(function(n) {
			// Make sure the neighbor is not blocked and that we haven't already processed it.
			if (n.blocked || closedHexes[n.getKey()]) return;
			
			// Get the total cost of going to this neighbor.
			var g = current.G + n.cost,
				visited = visitedNodes[n.getKey()];
			
			// Is it cheaper the previously best path to get here?
			if (!visited || g < visited.G) {
				var h = grid.getDistance(n, end);
				
				if (!visited) {
					// This was the first time we visited this node, add it to the heap.
					var nNode = new BHex.Grid.Search.Node(n, current, g, h);
					closedHexes[nNode.hex.getKey()] = nNode;
					openHeap.push(nNode);
				} else {
					// We've visited this path before, but found a better path. Rescore it.
					visited.rescore(current, g, h);
					openHeap.rescoreElement(visited);
				}
			}
		});
	}

	// Failed to find a path
	return [];
};





