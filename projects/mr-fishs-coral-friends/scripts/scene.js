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

const FLUID_CELL = 0;
const AIR_CELL = 1;
const SOLID_CELL = 2;
const ICE_CELL = 3;

const tempRef = 10.0;
const tempIce = -3.0;
const tempMax = 30.0;

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

seaLevelLineYi = Math.round(numCellY / 3); // in simulation coordinates
draggingSeaLevel = false;
showSeaLevelLine = false;

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
	obstacleRadius: 32 / numDisplayCellX * displayWidth,
	paused: false,
	showObstacle: true,
	obstacleVelX: 0.0,
	obstacleVelY: 0.0,
	showParticles: false,
	showGrid: true,
	fluid: null,
};

var corals = [];
var fishXi, fishYi;
var fishHomeXi = 210, fishHomeYi = 22;
var fishWidth, fishHeight;

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
	loadSceneFromImage('mr-fishs-coral-friends/assets/scene.png', (imageData, width, height) => {
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
					temp = tempIce;
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
		// addCorals();
		loadSceneFromImage('mr-fishs-coral-friends/assets/corals.png', (imageData, Lx, Ly) => {

			if (Lx !== f.NumCellX || Ly !== f.NumCellY) {
				console.error('Coral image size does not match fluid size');
				return;
			}

			for (let i = 0; i < Lx; i++) {
				for (let j = 0; j < Ly; j++) {
					const imgI = Math.floor(i * width / Lx);
					const imgJ = Math.floor((Ly - 1 - j) * height / Ly);
					const idx = (imgJ * width + imgI) * 4;
					const a = imageData[idx + 3];
					if (a === 0) continue; // skip fully transparent
					const r = imageData[idx] / 255.0;
					const g = imageData[idx + 1] / 255.0;
					const b = imageData[idx + 2] / 255.0;

					corals.push([{ xi: i, yi: j, colour: [r, g, b], health: 1.0 }]);
				}
			}
		});

		setObstacle(3.0, 2.0, true);
		loadFish(gl);
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

function loadFish(gl) {
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
	loadTexture(gl, 'mr-fishs-coral-friends/assets/fish.png', function (sprite) {
		fishTexture = sprite.texture;

		fishWidth = sprite.width * scene.fluid.h;
		fishHeight = sprite.height * scene.fluid.h;
		fishXi = fishHomeXi;
		fishYi = fishHomeYi;

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
			const x = cellSpacing + pRadius + pHorizontalSpacing * i + (j % 2 == 0 ? 0.0 : pRadius);
			const y = cellSpacing + pRadius + pVerticalSpacing * j;
			const xi = Math.floor(x * Lx / simWidth);
			const yi = Math.floor(y * Ly / simHeight);
			cellId = xi * Ly + yi;

			if (f.cellType[cellId] === FLUID_CELL) {
				// is water particle
				p++;
				f.pType[p] = 1.0;
			}
			else if (f.cellType[cellId] === ICE_CELL) {
				// is ice particle
				p++;
				f.pType[p] = 0.0;
			} else {
				continue;
			}
			f.pPosition[p * 2 - 1] = y;
			f.pPosition[p * 2] = x;
			f.pTemp[p] = f.cellTemp[cellId];
		}
	}
	f.numParticles = p;
}