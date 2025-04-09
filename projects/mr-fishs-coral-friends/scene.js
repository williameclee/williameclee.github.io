var canvas = document.getElementById("myCanvas");
var gl = canvas.getContext("webgl");

const numDisplayCellX = 256;
const numDisplayCellY = 144;
const numDisplayCellPadding = 2;
const aspectRatio = 1.0 * numDisplayCellY / numDisplayCellX;
const displayWidth = 8.0;
const displayHeight = displayWidth * aspectRatio;

const numCellX = numDisplayCellX + numDisplayCellPadding * 2;
const numCellY = numDisplayCellY + numDisplayCellPadding * 2;

canvas.focus();

if ((window.innerHeight - 20) / (window.innerWidth - 20) < aspectRatio) {
	canvas.height = window.innerHeight - 20;
	canvas.width = canvas.height / aspectRatio;
} else {
	canvas.width = window.innerWidth - 20;
	canvas.height = canvas.width * aspectRatio;
}
const simWidth = displayWidth * numCellX / numDisplayCellX;
const simHeight = displayWidth * aspectRatio * numCellY / numDisplayCellY;

const cScale = canvas.width / displayWidth;

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

let mouseXi = 10, mouseYi = 10;
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

	for (let xi = 1; xi <= f.NumCellX; xi++) {
		if (Math.random() >= 0.1) { // Random chance to skip a row for more sparse growth
			continue; // Skip this row
		}
		// const xi = Math.floor(i * coralSpacing);
		var baseYi = 2; // just above solid bottom
		var cellNr = xi * f.NumCellY + baseYi;

		// Check if the cell is a valid location for a coral
		while (baseYi < f.NumCellY && f.cellType[cellNr] === SOLID_CELL) {
			baseYi++;
			cellNr = xi * f.NumCellY + baseYi; // Update cellNr to the next row
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
			if (f.cellType[x * f.NumCellY + y] === SOLID_CELL) {
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

	var cellSpacing = simWidth / numCellX;
	var density = 1000.0;

	// // compute number of particles
	var pRadius = 0.3 * cellSpacing;	// particle radius w.r.t. cell size
	var pHorizontalSpacing = 2.0 * pRadius;
	var pVerticalSpacing = Math.sqrt(3.0) / 2.0 * pHorizontalSpacing;

	var numX = Math.floor((simWidth - 2.0 * cellSpacing - 2.0 * pRadius) / pHorizontalSpacing);
	var numY = Math.floor((simHeight - 2.0 * cellSpacing - 2.0 * pRadius) / pVerticalSpacing);
	var maxParticles = numX * numY;

	// create fluid
	f = scene.fluid = new FlipFluid(density, simWidth, simHeight, cellSpacing, pRadius, maxParticles);
	loadSceneFromImage('mr-fishs-coral-friends/scene.png', (imageData, width, height) => {
		// Set cell types
		for (let i = 0; i < f.NumCellX; i++) {
			for (let j = 0; j < f.NumCellY; j++) {
				const imgI = Math.floor(i * width / f.NumCellX);
				const imgJ = Math.floor((f.NumCellY - 1 - j) * height / f.NumCellY);
				const idx = (imgJ * width + imgI) * 4;
				const r = imageData[idx];
				const g = imageData[idx + 1];
				const b = imageData[idx + 2];

				let cellType = SOLID_CELL;
				let temp = tempRef;
				let fill = 0.0;

				if (r > 200 && g > 200 && b > 200) {
					// White: ice
					cellType = ICE_CELL;
					fill = 0.0;
					temp = -3.0;
				}
				else if (r < 100 && g < 100 && b < 100) {
					// Black: solid
					cellType = SOLID_CELL;
					fill = 0.0;
					temp = tempRef;
				}
				else if (b > 150 && r < 50 && g < 50) {
					// Blue: water
					cellType = FLUID_CELL;
					fill = 1.0;
					temp = tempRef;
				}
				else if (g > 150) {
					// Green: air
					cellType = AIR_CELL;
					fill = 1.0;
					temp = tempRef;
				}

				const idx1d = i * f.NumCellY + j;
				f.cell[idx1d] = fill;
				f.cellType[idx1d] = cellType;
				f.cellTemp[idx1d] = temp;
			}
		}

		// Now that cellType is ready, place particles & corals
		placeParticles(f, numX, numY, cellSpacing, pRadius, pHorizontalSpacing, pVerticalSpacing);
		addCorals();
		setObstacle(3.0, 2.0, true);
		initFish(gl);
		placeFishInFluid();
	});


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
	const NumCellX = f.NumCellX;
	const NumCellY = f.NumCellY;

	fishXi = Math.floor(NumCellX * 2 / 3);
	fishYi = Math.floor(NumCellY * 1 / 3);
}

function loadSceneFromImage(src, onReady) {
	const img = new Image();
	img.onload = function () {
		const canvas = document.createElement('canvas');
		canvas.width = img.width;
		canvas.height = img.height;
		const ctx = canvas.getContext('2d');
		ctx.drawImage(img, 0, 0);
		const imageData = ctx.getImageData(0, 0, img.width, img.height).data;

		onReady(imageData, img.width, img.height);
	};
	img.src = src;
}

function placeParticles(f, numX, numY, cellSpacing, pRadius, pHorizontalSpacing, pVerticalSpacing) {
	// create water particles
	var Lx = f.NumCellX;
	var Ly = f.NumCellY;

	var p = 0;
	for (var i = 0; i < numX; i++) {
		for (var j = 0; j < numY; j++) {
			// skip if this particle is in the basin
			var x = cellSpacing + pRadius + pHorizontalSpacing * i + (j % 2 == 0 ? 0.0 : pRadius);
			var y = cellSpacing + pRadius + pVerticalSpacing * j;
			var xi = Math.floor(x * Lx / simWidth);
			var yi = Math.floor(y * Ly / simHeight);
			cellId = xi * Ly + yi;
			if (f.cellType[cellId] === FLUID_CELL) {
				// is water particle
				p++;
				f.pPosition[p * 2 - 1] = y;
				f.pPosition[p * 2] = x;
				f.pType[p] = 1.0;
				f.pTemp[p] = f.cellTemp[cellId];
			}
			else if (f.cellType[cellId] === ICE_CELL) {
				// is ice particle
				p++;
				f.pPosition[p * 2 - 1] = y;
				f.pPosition[p * 2] = x;
				f.pType[p] = 0.0;
				f.pTemp[p] = f.cellTemp[cellId];
			}
		}
	}
	f.numWaterParticles = p;
}