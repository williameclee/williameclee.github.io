var canvas = document.getElementById("myCanvas");
var gl = canvas.getContext("webgl");
canvas.width = window.innerWidth - 20;
canvas.height = window.innerHeight - 20;


canvas.focus();

var simHeight = 3.0;
var cScale = canvas.height / simHeight;
var simWidth = canvas.width / cScale;

var U_FIELD = 0;
var V_FIELD = 1;

var FLUID_CELL = 0;
var AIR_CELL = 1;
var SOLID_CELL = 2;
var ICE_CELL = 4;

var tempRef = 10.0;

var cnt = 0;

let fishDirX = 1;
let fishDirY = 0;

// Timers to hold direction before changing
let fishDirXTimer = 0;
let fishDirYTimer = 0;

// Delay range for switching direction (in frames)
const MIN_DIR_HOLD = 30;
const MAX_DIR_HOLD = 60;


let fishTargetXi = 10;
let fishTargetYi = 10;

let lastTargetSetTime = 0;
const TARGET_UPDATE_INTERVAL = 500; // ms
const TARGET_OFFSET_RANGE = 64; // randomness

let mouseXi  = 10, mouseYi  = 10;
let lastMouseXi = 10, lastMouseYi = 10;
let lastMouseMoveTime = 0;

var scene = {
	gravity: -9.81,
	dt: 1.0 / 120.0,
	flipRatio: 0.1,
	numPressureIters: 100,
	numParticleIters: 2,
	frameNr: 0,
	overRelaxation: 1.9,
	compensateDrift: true,
	separateParticles: true,
	obstacleX: 0.0,
	obstacleY: 0.0,
	obstacleRadius: 0.15,
	paused: false,
	showObstacle: true,
	obstacleVelX: 0.0,
	obstacleVelY: 0.0,
	showParticles: false,
	showGrid: true,
	fluid: null
};

var corals = [];
var fishXi, fishYi;
var fishWidth, fishHeight;

function addCorals() {
	const f = scene.fluid;

	corals = []; // Array to hold coral cells

	var colourId = 0;
	const visited = new Set();

	for (let xi = 1; xi <= f.fNumX; xi++) {
		if (Math.random() >= 0.1) { // Random chance to skip a row for more sparse growth
			continue; // Skip this row
		}
		// const xi = Math.floor(i * coralSpacing);
		var baseYi = 2; // just above solid bottom
		var cellNr = xi * f.fNumY + baseYi;

		// Check if the cell is a valid location for a coral
		while (baseYi < f.fNumY && f.cellType[cellNr] === SOLID_CELL) {
			baseYi++;
			cellNr = xi * f.fNumY + baseYi; // Update cellNr to the next row
		}

		if (f.cellType[cellNr] === ICE_CELL) {
			continue;
		}

		let coralCells = [];

		// Recursive sparse growth
		const maxBranchDepth = 10;
		// Grows one branch (can call itself recursively to fork)
		function growBranch(x, y, depth, colourId = 1, canHorizontal = true) {
			if (depth > maxBranchDepth) return;
			if (f.cellType[x * f.fNumY + y] === SOLID_CELL) {
				return; // Stop if we hit a non-fluid cell
			}

			const key = `${x},${y}`;
			if (visited.has(key)) return;
			visited.add(key);
			coralCells.push({ xi: x, yi: y, colour: colourId, health: 1.0 });

			// Maybe fork left-up
			if (canHorizontal && Math.random() < 1 - depth / maxBranchDepth / 2) {
				coralCells.push({ xi: x, yi: y + 1, colour: colourId, health: 1.0 });

				if (!visited.has(`${x - 1},${y + 1}`) && !visited.has(`${x - 1},${y}`)) {
					growBranch(x - 1, y + 1, depth + 1, colourId, false);
				}
				if (!visited.has(`${x + 1},${y + 1}`) && !visited.has(`${x + 1},${y}`)) {
					growBranch(x + 1, y + 1, depth + 1, colourId, false);
				}
			} else if (Math.random() < 1 - depth / maxBranchDepth / 2) {
				if (visited.has(`${x},${y + 1}`)) {
					return;
				}
				growBranch(x, y + 1, depth + 1, colourId);
			}

		}
		growBranch(xi, baseYi, 0, colourId);
		colourId = (colourId + 1) % 3;

		corals.push(coralCells);

		// corals.push({
		// 	xi: xi,
		// 	yi: baseYi,
		// 	cellNr: cellNr,
		// 	health: 1.0 // full health
		// });
	}
}

function setupScene() {
	scene.obstacleRadius = 0.2;
	scene.overRelaxation = 1.9;

	scene.dt = 1.0 / 60.0;
	scene.numPressureIters = 50;
	scene.numParticleIters = 2;

	var res = 160;

	var tankHeight = 1.0 * simHeight;
	var tankWidth = 1.0 * simWidth;
	var h = tankHeight / res;
	var density = 1000.0;

	var relWaterHeight = 0.4
	var relWaterWidth = 1.0
	var relIceHeight = 0.6
	var relIceWidth = 0.3
	var relIceOffset = 0.2

	// compute number of particles
	var r = 0.3 * h;	// particle radius w.r.t. cell size
	var dx = 2.0 * r;
	var dy = Math.sqrt(3.0) / 2.0 * dx;

	var numX = Math.floor((tankWidth - 2.0 * h - 2.0 * r) / dx);
	var numY = Math.floor((tankHeight - 2.0 * h - 2.0 * r) / dy);
	var maxParticles = numX * numY;

	// create fluid
	f = scene.fluid = new FlipFluid(density, tankWidth, tankHeight, h, r, maxParticles);

	// setup grid cells for tank
	var Lx = f.fNumX;
	var Ly = f.fNumY;

	for (var i = 0; i < Lx; i++) {
		for (var j = 0; j < Ly; j++) {
			var s = 1.0;	// fluid
			if (i == 0 || i == Lx - 1 || j == 0)
				s = 0.0;	// solid
			f.cell[i * Ly + j] = s
			f.cellType[i * Ly + j] = s == 0.0 ? SOLID_CELL : AIR_CELL;
		}
	}

	// Create a raised basin on the left side
	for (var i = 0; i < Lx; i++) {
		for (var j = 0; j < Ly; j++) {
			f.cellTemp[i * Ly + j] = tempRef;
			var slope = Ly * (Lx - i) / Lx * 0.3;
			// ice
			if (i < Lx * relIceWidth && j < slope + Ly * relIceHeight) {
				f.cell[i * Ly + j] = 0.0;
				f.cellType[i * Ly + j] = ICE_CELL;
				f.cellTemp[i * Ly + j] = -3.0;
			}
			// basin
			if (j < slope) {
				f.cell[i * Ly + j] = 0.0;
				f.cellType[i * Ly + j] = SOLID_CELL;
				f.cellTemp[i * Ly + j] = 0.0;
			} else if (i < Lx * relIceWidth && j < slope + relIceOffset * Ly) {
				f.cell[i * Ly + j] = 0.0;
				f.cellType[i * Ly + j] = SOLID_CELL;
				f.cellTemp[i * Ly + j] = 0.0;
			}
		}
	}

	// create water particles
	var p = 0;
	for (var i = 0; i < numX; i++) {
		for (var j = 0; j < numY; j++) {
			// skip if this particle is in the basin
			var x = h + r + dx * i + (j % 2 == 0 ? 0.0 : r);
			var y = h + r + dy * j;
			var xi = Math.floor(x / tankWidth * Lx);
			var yi = Math.floor(y / tankHeight * Ly);
			if (f.cell[xi * Ly + yi] == 1.0 && x < relWaterWidth * tankWidth && y < relWaterHeight * tankHeight) {
				// is water particle
				p++;
				f.pPosition[p * 2 - 1] = y;
				f.pPosition[p * 2] = x;
				f.pType[p] = 1;
				f.pTemp[p] = tempRef;
				f.cellTemp[xi * Ly + yi] = 20.0;
			}
			else if (f.cellType[xi * Ly + yi] == ICE_CELL) {
				// is ice particle
				p++;
				f.pPosition[p * 2 - 1] = y;
				f.pPosition[p * 2] = x;
				f.pType[p] = 0;
				f.pTemp[p] = -3.0;
			}
		}
	}
	f.numWaterParticles = p;

	addCorals(); // Add corals to the scene

	setObstacle(3.0, 2.0, true);

	// Fish state
	initFish(gl);
	placeFishInFluid();
}

function setObstacle(x, y, reset) {

	var vx = 0.0;
	var vy = 0.0;

	if (!reset) {
		vx = (x - scene.obstacleX) / scene.dt;
		vy = (y - scene.obstacleY) / scene.dt;
	}

	scene.obstacleX = x;
	scene.obstacleY = y;
	var r = scene.obstacleRadius;
	var f = scene.fluid;
	var n = f.numY;
	var cd = Math.sqrt(2) * f.h;

	for (var i = 1; i < f.numX - 2; i++) {
		for (var j = 1; j < f.numY - 2; j++) {

			f.cell[i * n + j] = 1.0;

			dx = (i + 0.5) * f.h - x;
			dy = (j + 0.5) * f.h - y;

			if (dx * dx + dy * dy < r * r) {
				f.cell[i * n + j] = 0.0;
				f.u[i * n + j] = vx;
				f.u[(i + 1) * n + j] = vx;
				f.v[i * n + j] = vy;
				f.v[i * n + j + 1] = vy;
			}
		}
	}

	scene.showObstacle = true;
	scene.obstacleVelX = vx;
	scene.obstacleVelY = vy;
}

function initFish(gl) {
	// Create quad buffer
	fishVertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, fishVertexBuffer);
	const fishQuad = new Float32Array([
		-0.5, -0.5, 0, 0,
		0.5, -0.5, 1, 0,
		0.5, 0.5, 1, 1,
		-0.5, 0.5, 0, 1
	]);
	gl.bufferData(gl.ARRAY_BUFFER, fishQuad, gl.STATIC_DRAW);

	// Create index buffer
	fishIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, fishIndexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);

	// Load texture
	loadTexture(gl, 'mr-fishs-coral-friends/fish.png', function (sprite) {
		fishTexture = sprite.texture;

		fishWidth = sprite.width * scene.fluid.h;
		fishHeight = sprite.height * scene.fluid.h;

		fishTextureReady = true;
	});
}

function placeFishInFluid() {
	const f = scene.fluid;
	const fNumX = f.fNumX;
	const fNumY = f.fNumY;

	fishXi = Math.floor(fNumX * 2 / 3);
	fishYi = Math.floor(fNumY * 1 / 3);
}