// Extend a few objects from BHex

/**
 * The center of the hexagon.
 * @type {BHex.Drawing.Point}
 */
BHex.Hexagon.prototype.center = null;

/**
 * Array of each of the 6 corners in the hexagon.
 * @type {BHex.Drawing.Point[]}
 */
BHex.Hexagon.prototype.points = null;

/**
 * Rounds the values of x, y and z. Needed to find a hex at a specific position. Returns itself after.
 */
BHex.Cube.prototype.round = function () {
	var cx = this.x, 
		cy = this.y,
		cz = this.z;
	
	this.x = Math.round(cx);
	this.y = Math.round(cy);
	this.z = Math.round(cz);

	var x_diff = Math.abs(this.x - cx),
		y_diff = Math.abs(this.y - cy),
		z_diff = Math.abs(this.z - cz);

	if (x_diff > y_diff && x_diff > z_diff)
		this.x = -this.y -this.z;
	else if (y_diff > z_diff)
		this.y = -this.x -this.z;
	else
		this.z = -this.x -this.y;
	
	return this;
};


/**
 * This namespace does not include any code related to actually drawing hexagons. It's just the logics needed to draw them, such as calculating the corners and finding a hexagon at a specific point.
 * @namespace
 */
BHex.Drawing = BHex.Drawing || {};

/**
 * BHex.Drawing is used for all you need to draw the hexagon grid and finding hexagons within the grid. 
 * In using this constructor, the corners of all the hexes will be generated.
 * @class
 * @param {BHex.Grid} grid - The grid of hexagons to be used.
 * @param {BHex.Drawing.Options} options - Options to be used.
 * @property {BHex.Grid} grid - The grid of hexagons to be used.
 * @property {BHex.Drawing.Options} options - Options to be used.
 */
BHex.Drawing.Drawing = function (grid, options) {

	this.grid = grid;
	this.options = options;
	
	this.grid.hexes.forEach(function(hex) {
		hex.center = BHex.Drawing.Drawing.getCenter(hex, options);
		hex.points = BHex.Drawing.Drawing.getCorners(hex.center, options);
	});
};

/**
 * Creates 6 points that marks the corners of a hexagon.
 * @private
 * @param {BHex.Drawing.Point} center - The center point of the hexagon.
 * @param {BHex.Drawing.Options} options - Drawing options to be used.
 * @returns {BHex.Drawing.Point[]}
 */
BHex.Drawing.Drawing.getCorners = function (center, options) {
	var points = [];
		
	for (var i = 0; i < 6; i++) {
		points.push(BHex.Drawing.Drawing.getCorner(center, options, i));
	}
	return points;
};

/**
 * Find the given corner for a hex.
 * @param {BHex.Drawing.Point} center - The center of the hexagon.
 * @param {BHex.Drawing.Options} options - Drawing options to be used.
 * @param {number} corner - Which of the 6 corners should be calculated?
 * @returns {BHex.Drawing.Point}
 */
BHex.Drawing.Drawing.getCorner = function (center, options, corner) {
	var offset = (options.orientation == BHex.Drawing.Static.Orientation.PointyTop) ? 90 : 0,
		angle_deg = 60 * corner + offset,
		angle_rad = Math.PI / 180 * angle_deg;
	return new BHex.Drawing.Point(Math.round(center.x + options.size * Math.cos(angle_rad)),
								  Math.round(center.y + options.size * Math.sin(angle_rad)));
};

/**
 * Find the center point of the axial, given the options provided.
 * @param {BHex.Axial} axial - The axial for which to find the center point.
 * @param {BHex.Drawing.Options} options - Drawing options to be used.
 * @returns {BHex.Drawing.Point}
 */
BHex.Drawing.Drawing.getCenter = function (axial, options) {
	var x = 0, y = 0, c = axial.toCube();
			
	if (options.orientation == BHex.Drawing.Static.Orientation.FlatTop) {
		x = c.x * options.width * 3/4;
		y = (c.z + c.x / 2) * options.height;
		
	} else {
		x = (c.x + c.z / 2) * options.width;
		y = c.z * options.height * 3/4;
	}
	
	return new BHex.Drawing.Point(Math.round(x), Math.round(y));
};

/**
 * Get the hexagon at a specific point.
 * @param {BHex.Drawing.Point} p - The points for which to find a hex.
 * @returns {BHex.Hexagon}
 */
BHex.Drawing.Drawing.prototype.getHexAt = function (p) {
	var x, y;
	
	if (this.options.orientation == BHex.Drawing.Static.Orientation.FlatTop) {
		x = p.x * 2/3 / this.options.size;
		y = (-p.x / 3 + Math.sqrt(3)/3 * p.y) / this.options.size;
	} else {
		x = (p.x * Math.sqrt(3)/3 - p.y / 3) / this.options.size;
		y = p.y * 2/3 / this.options.size;
	}
	
	var a = new BHex.Axial(x, y).toCube().round().toAxial();
	
	return this.grid.getHexAt(a);
};

/**
 * A number of enums used to describe a grid.
 * @namespace
 */
BHex.Drawing.Static = {
	/**
	 * The rotation of the hexagon when drawn.
	 * @enum {number}
	 */
	Orientation: {
		/** The hexagon will have flat tops and bottom, and pointy sides. */
		FlatTop: 1,
		/** The hexagon will have flat sides, and pointy top and bottom. */
		PointyTop: 2
	}
};

/**
 * BHex.Drawing.Point is a horizontal and vertical representation of a position. 
 * @class
 * @param {number} x - The horizontal position.
 * @param {number} y - The vertical position.
 * @property {number} x - The horizontal position.
 * @property {number} y - The vertical position.
 */
BHex.Drawing.Point = function (x, y) {
	this.x = x;
	this.y = y;
};

/**
 * A Hexagon is a 6 sided polygon, our hexes don't have to be symmetrical, i.e. ratio of width to height could be 4 to 3
 * @class
 * @param {number} side - How long the flat side should be.
 * @param {BHex.Drawing.Static.Orientation} [orientation=BHex.Drawing.Static.Orientation.FlatTop] - Which orientation the hex will have.
 * @param {BHex.Drawing.Point} [center=new BHex.Drawing.Point(0, 0)] - Where is the center of the grid located. This helps by saving you the trouble of keeping track of the offset yourself.
 * @property {number} side - How long the flat side should be.
 * @property {BHex.Drawing.Static.Orientation} orientation - Which orientation the hex will have.
 */
BHex.Drawing.Options = function (side, orientation, center) {
	this.size = side;
	this.orientation = orientation || BHex.Drawing.Static.Orientation.FlatTop;
	this.center = center || new BHex.Drawing.Point(0, 0);
	
	if (this.orientation == BHex.Drawing.Static.Orientation.FlatTop) {
		this.width = side * 2;
		this.height = Math.sqrt(3) / 2 * this.width;
	} else {
		this.height = side * 2;
		this.width = Math.sqrt(3) / 2 * this.height;
	}
};
