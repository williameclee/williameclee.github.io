// Shaders
let pointShader = null;
let meshShader = null;
let fishShader = null;

// Buffers
let pointVertexBuffer = null;
let pointColorBuffer = null;
let gridVertBuffer = null;
let gridColorBuffer = null;
let coralVertexBuffer = null;
let fishVertexBuffer = null;
let fishIndexBuffer = null;

// Textures
let fishTexture = null;
let fishTextureReady = false;

// Colours
const MUD_COLOUR = [151.0 / 255.0, 109.0 / 255.0, 77.0 / 255.0];
const SKY_COLOUR = [135.0 / 255.0, 206.0 / 255.0, 235.0 / 255.0];
const ICE_COLOUR = [160.0 / 255.0, 180.0 / 255.0, 255.0 / 255.0];
const BRIGHT_ICE_COLOUR = [180.0 / 255.0, 200.0 / 255.0, 255.0 / 255.0];
const COLD_WATER_COLOUR = [15.0 / 255.0, 212.0 / 255.0, 203.0 / 255.0];
const NORMAL_WATER_COLOUR = [56.0 / 255.0, 132.0 / 255.0, 207.0 / 255.0];
const WARM_WATER_COLOUR = [230.0 / 255.0, 80.0 / 255.0, 160.0 / 255.0];
const CORAL_COLOUR_1 = [1.0, 0.5, 0.5];
const CORAL_COLOUR_2 = [0.5, 1.0, 0.5];
const CORAL_COLOUR_3 = [0.5, 0.5, 1.0];
const CORAL_COLOUR_BLEACHED = [0.8, 0.8, 0.8];

// Colour variations
var randomMap = new Float32Array(numCellX * numCellY);
for (var i = 0; i < numCellX * numCellY; i++) {
	randomMap[i] = Math.random();
}

var diagonalStripesMap = new Float32Array(numCellX * numCellY);
for (var i = 0; i < numCellX; i++) {
	for (var j = 0; j < numCellY; j++) {
		diagonalStripesMap[i * numCellY + j] = (Math.sin(-i * 0.3 + j * 0.3) + 1) / 2;
	}
}

function draw() {
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);

	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

	// prepare shaders
	if (!pointShader) pointShader = createShader(gl, pointVertexShader, pointFragmentShader);
	if (!meshShader) meshShader = createShader(gl, meshVertexShader, meshFragmentShader);
	if (!fishShader) fishShader = createShader(gl, fishVertexShader, fishFragmentShader);

	// Update colours
	updateCellColors(scene.fluid);
	updatepColours(scene.fluid);
	// updateCoralColours();

	// grid
	drawGridCells(gl, meshShader, scene, gridVertBuffer);
	drawParticles(gl, scene);
	drawCorals(gl, meshShader, corals, scene, coralVertexBuffer);

	if (fishTextureReady) {
		drawFish(gl);
	}
}

function drawFish(gl) {
	gl.useProgram(fishShader);

	gl.uniform2f(gl.getUniformLocation(fishShader, 'domainSize'), displayWidth, displayHeight);
	gl.uniform2f(gl.getUniformLocation(fishShader, 'fishPos'), fishX, fishY);
	gl.uniform2f(gl.getUniformLocation(fishShader, 'fishSize'), fishWidth, fishHeight);

	const flipX = fishTargetXi < fishXi ? 0.0 : 1.0;
	gl.uniform1f(gl.getUniformLocation(fishShader, 'flipX'), flipX);

	gl.bindBuffer(gl.ARRAY_BUFFER, fishVertexBuffer);
	const posLoc = gl.getAttribLocation(fishShader, 'attrPosition');
	const uvLoc = gl.getAttribLocation(fishShader, 'attrUV');
	gl.enableVertexAttribArray(posLoc);
	gl.enableVertexAttribArray(uvLoc);
	gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0);
	gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 16, 8);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, fishTexture);
	gl.uniform1i(gl.getUniformLocation(fishShader, 'fishTexture'), 0);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, fishIndexBuffer);
	gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

	gl.disableVertexAttribArray(posLoc);
	gl.disableVertexAttribArray(uvLoc);
}

function drawCorals(gl, meshShader, corals, scene, coralVertexBuffer) {
	gl.useProgram(meshShader);
	gl.uniform2f(gl.getUniformLocation(meshShader, 'domainSize'), displayWidth, displayHeight);

	if (coralVertexBuffer == null) {
		coralVertexBuffer = gl.createBuffer();
	}

	const f = scene.fluid;
	const cellSpacing = displayWidth / numDisplayCellX;
	const vertices = [];
	const colors = [];
	const cellHalfSpacing = cellSpacing / 2;

	for (const coralGroup of corals) {
		for (const coralCell of coralGroup) {
			const x = (coralCell.xi - numDisplayCellPadding + 0.5) * cellSpacing;
			const y = (coralCell.yi - numDisplayCellPadding + 0.5) * cellSpacing;

			const health = coralCell.health ?? 1.0;
			let r, g, b;
			if (coralCell.colour === 0) {
				r = 1.0; g = 0.8; b = 0.2;
			} else if (coralCell.colour === 1) {
				r = 0.6; g = 0.9; b = 0.3;
			} else {
				r = 1.0; g = 0.8; b = 0.8;
			}
			r = r + (0.9 - r) * (1 - health);
			g = g + (0.9 - g) * (1 - health);
			b = b + (0.9 - b) * (1 - health);

			// Add vertices for the quad (two triangles per quad)
			vertices.push(
				x - cellHalfSpacing, y - cellHalfSpacing, // Bottom-left
				x + cellHalfSpacing, y - cellHalfSpacing, // Bottom-right
				x + cellHalfSpacing, y + cellHalfSpacing, // Top-right

				x - cellHalfSpacing, y - cellHalfSpacing, // Bottom-left
				x + cellHalfSpacing, y + cellHalfSpacing, // Top-right
				x - cellHalfSpacing, y + cellHalfSpacing  // Top-left
			);

			// Add color for each vertex
			for (let i = 0; i < 6; i++) { // 6 vertices per quad
				colors.push(r, g, b);
			}
		}
	}

	// Upload positions
	gl.bindBuffer(gl.ARRAY_BUFFER, coralVertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

	const posLoc = gl.getAttribLocation(meshShader, 'attrPosition');
	gl.enableVertexAttribArray(posLoc);
	gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

	// Upload colours
	const colourBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, colourBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);

	const colourLoc = gl.getAttribLocation(meshShader, 'attrColor');
	gl.enableVertexAttribArray(colourLoc);
	gl.vertexAttribPointer(colourLoc, 3, gl.FLOAT, false, 0, 0);

	// Draw all quads as triangles
	gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);

	gl.disableVertexAttribArray(posLoc);
	gl.disableVertexAttribArray(colourLoc);
}

function drawParticles(gl, scene) {
	if (scene.showParticles) {
		gl.clear(gl.DEPTH_BUFFER_BIT);

		var pointSize = 2.0 * scene.fluid.particleRadius / simWidth * canvas.width;

		gl.useProgram(pointShader);
		gl.uniform2f(gl.getUniformLocation(pointShader, 'domainSize'), displayWidth, displayHeight);
		gl.uniform1f(gl.getUniformLocation(pointShader, 'pointSize'), pointSize);
		gl.uniform1f(gl.getUniformLocation(pointShader, 'drawDisk'), 1.0);

		if (pointVertexBuffer == null)
			pointVertexBuffer = gl.createBuffer();
		if (pointColorBuffer == null)
			pointColorBuffer = gl.createBuffer();

		gl.bindBuffer(gl.ARRAY_BUFFER, pointVertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, scene.fluid.pPosition, gl.DYNAMIC_DRAW);

		var posLoc = gl.getAttribLocation(pointShader, 'attrPosition');
		gl.enableVertexAttribArray(posLoc);
		gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, pointColorBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, scene.fluid.pColour, gl.DYNAMIC_DRAW);

		var colorLoc = gl.getAttribLocation(pointShader, 'attrColor');
		gl.enableVertexAttribArray(colorLoc);
		gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);

		gl.drawArrays(gl.POINTS, 0, scene.fluid.numParticles);

		gl.disableVertexAttribArray(posLoc);
		gl.disableVertexAttribArray(colorLoc);

		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	}
}

function drawGridCells(gl, meshShader, scene, gridVertexBuffer) {
	gl.useProgram(meshShader);
	gl.uniform2f(gl.getUniformLocation(meshShader, 'domainSize'), displayWidth, displayHeight);

	const f = scene.fluid;
	const cellSpacing = displayWidth / numDisplayCellX;

	const vertices = [];
	const colours = [];
	
	const cellHalfSpacing = cellSpacing / 2;

	for (let i = numDisplayCellPadding; i < numDisplayCellX + numDisplayCellPadding; i++) {
		const iDisp = i - numDisplayCellPadding;
		for (let j = numDisplayCellPadding; j < numDisplayCellY + numDisplayCellPadding; j++) {
			const jDisp = j - numDisplayCellPadding;
			const x = (iDisp + 0.5) * cellSpacing;
			const y = (jDisp + 0.5) * cellSpacing;

			const idx = i * f.NumCellY + j;
			const r = scene.fluid.cellColour[3 * idx];
			const g = scene.fluid.cellColour[3 * idx + 1];
			const b = scene.fluid.cellColour[3 * idx + 2];

			// Add 6 vertices for the cell quad
			vertices.push(
				x - cellHalfSpacing, y - cellHalfSpacing,
				x + cellHalfSpacing, y - cellHalfSpacing,
				x + cellHalfSpacing, y + cellHalfSpacing,

				x - cellHalfSpacing, y - cellHalfSpacing,
				x + cellHalfSpacing, y + cellHalfSpacing,
				x - cellHalfSpacing, y + cellHalfSpacing
			);

			for (let k = 0; k < 6; k++) {
				colours.push(r, g, b);
			}
		}
	}

	if (gridVertexBuffer == null) {
		gridVertexBuffer = gl.createBuffer();
	}

	gl.bindBuffer(gl.ARRAY_BUFFER, gridVertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

	const posLoc = gl.getAttribLocation(meshShader, 'attrPosition');
	gl.enableVertexAttribArray(posLoc);
	gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

	const colourBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, colourBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colours), gl.DYNAMIC_DRAW);

	const colourLoc = gl.getAttribLocation(meshShader, 'attrColor');
	gl.enableVertexAttribArray(colourLoc);
	gl.vertexAttribPointer(colourLoc, 3, gl.FLOAT, false, 0, 0);

	gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);

	gl.disableVertexAttribArray(posLoc);
	gl.disableVertexAttribArray(colourLoc);
}

function drawDisk() {
	// disk
	// prepare disk mesh
	// var numSegs = 50;

	// if (diskVertBuffer == null) {

	// 	diskVertBuffer = gl.createBuffer();
	// 	var dphi = 2.0 * Math.PI / numSegs;
	// 	var diskVerts = new Float32Array(2 * numSegs + 2);
	// 	var p = 0;
	// 	diskVerts[p++] = 0.0;
	// 	diskVerts[p++] = 0.0;
	// 	for (var i = 0; i < numSegs; i++) {
	// 		diskVerts[p++] = Math.cos(i * dphi);
	// 		diskVerts[p++] = Math.sin(i * dphi);
	// 	}
	// 	gl.bindBuffer(gl.ARRAY_BUFFER, diskVertBuffer);
	// 	gl.bufferData(gl.ARRAY_BUFFER, diskVerts, gl.DYNAMIC_DRAW);
	// 	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	// 	diskIdBuffer = gl.createBuffer();
	// 	var diskIds = new Uint16Array(3 * numSegs);
	// 	p = 0;
	// 	for (var i = 0; i < numSegs; i++) {
	// 		diskIds[p++] = 0;
	// 		diskIds[p++] = 1 + i;
	// 		diskIds[p++] = 1 + (i + 1) % numSegs;
	// 	}

	// 	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, diskIdBuffer);
	// 	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, diskIds, gl.DYNAMIC_DRAW);
	// 	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	// }

	// gl.clear(gl.DEPTH_BUFFER_BIT);

	// var diskColor = [1.0, 0.0, 0.0];

	// gl.useProgram(meshShader);
	// gl.uniform2f(gl.getUniformLocation(meshShader, 'domainSize'), simWidth, simHeight);
	// gl.uniform3f(gl.getUniformLocation(meshShader, 'color'), diskColor[0], diskColor[1], diskColor[2]);
	// gl.uniform2f(gl.getUniformLocation(meshShader, 'translation'), scene.obstacleX, scene.obstacleY);
	// gl.uniform1f(gl.getUniformLocation(meshShader, 'scale'), scene.obstacleRadius + scene.fluid.particleRadius);

	// posLoc = gl.getAttribLocation(meshShader, 'attrPosition');
	// gl.enableVertexAttribArray(posLoc);
	// gl.bindBuffer(gl.ARRAY_BUFFER, diskVertBuffer);
	// gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

	// gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, diskIdBuffer);
	// gl.drawElements(gl.TRIANGLES, 3 * numSegs, gl.UNSIGNED_SHORT, 0);

	// gl.disableVertexAttribArray(posLoc);
}

function loadTexture(gl, url, onReady = () => { }) {
	const texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);

	// Temporary 1x1 blue pixel
	const pixel = new Uint8Array([0, 0, 255, 255]);
	gl.texImage2D(
		gl.TEXTURE_2D, 0, gl.RGBA,
		1, 1, 0,
		gl.RGBA, gl.UNSIGNED_BYTE, pixel
	);

	const image = new Image();
	image.src = url;
	image.onload = function () {
		gl.bindTexture(gl.TEXTURE_2D, texture);

		// Flip the image vertically to match WebGL texture coords
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

		gl.texImage2D(
			gl.TEXTURE_2D, 0, gl.RGBA,
			gl.RGBA, gl.UNSIGNED_BYTE, image
		);

		const isPOT = isPowerOf2(image.width) && isPowerOf2(image.height);

		if (isPOT) {
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		} else {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		}

		onReady({
			texture: texture,
			width: image.width,
			height: image.height
		});
	};

	return texture;

	function isPowerOf2(value) {
		return (value & (value - 1)) === 0;
	}
}

function updateCellColors(f, lightLayerDepth = 20) {
	f.cellColour.fill(0.0);

	for (var i = 0; i < f.fNumCells; i++) {

		if (f.cellType[i] == SOLID_CELL) {
			f.cellColour[3 * i] = MUD_COLOUR[0] + randomMap[i] * 0.1;
			f.cellColour[3 * i + 1] = MUD_COLOUR[1] + randomMap[i] * 0.1;
			f.cellColour[3 * i + 2] = MUD_COLOUR[2] + randomMap[i] * 0.1;
		} else if (f.cellType[i] == ICE_CELL) {

			f.cellColour[3 * i] = lerp(ICE_COLOUR[0] + randomMap[i] * 0.1, BRIGHT_ICE_COLOUR[0], diagonalStripesMap[i]);
			f.cellColour[3 * i + 1] = lerp(ICE_COLOUR[1] + randomMap[i] * 0.1, BRIGHT_ICE_COLOUR[1], diagonalStripesMap[i]);
			f.cellColour[3 * i + 2] = lerp(ICE_COLOUR[2] + randomMap[i] * 0.1, BRIGHT_ICE_COLOUR[2], diagonalStripesMap[i]);
		} else if (f.cellType[i] == AIR_CELL) {
			f.cellColour[3 * i] = SKY_COLOUR[0];
			f.cellColour[3 * i + 1] = SKY_COLOUR[1];
			f.cellColour[3 * i + 2] = SKY_COLOUR[2];
		} else {
			// Colour based on temperature
			var blendColour = NORMAL_WATER_COLOUR;
			if (f.cellTemp[i] >= tempRef) {
				var t = (f.cellTemp[i] - tempRef) / (tempMax - tempRef);
				blendColour = WARM_WATER_COLOUR;
			} else {
				var t = (f.cellTemp[i] - tempRef) / (0 - tempRef);
				blendColour = COLD_WATER_COLOUR;
			}
			t = Math.round(t * 20) / 20; // arbitrary banding
			t = Math.max(0, Math.min(1, t));

			f.cellColour[3 * i] = lerp(NORMAL_WATER_COLOUR[0], blendColour[0], t);
			f.cellColour[3 * i + 1] = lerp(NORMAL_WATER_COLOUR[1], blendColour[1], t);
			f.cellColour[3 * i + 2] = lerp(NORMAL_WATER_COLOUR[2], blendColour[2], t);

			let lightFactor = Math.exp(-0.001 * Math.max(f.cellDepth[i] - lightLayerDepth, 0) ** 2); // tweak for smoother/faster falloff
			f.cellColour[3 * i] *= lightFactor;
			f.cellColour[3 * i + 1] *= lightFactor;
			f.cellColour[3 * i + 2] *= lightFactor;
		}
	}
}

function updatepColours(f) {
	for (var i = 0; i < f.numParticles; i++) {
		var t = f.pTemp[i] / 20;
		f.pColour[3 * i] = 0.2 + 0.2 * t;
		f.pColour[3 * i + 1] = 0.2 + 0.4 * (1 - t);
		f.pColour[3 * i + 2] = 0.5 + 0.5 * (1 - t);
	}
}

// Linear interpolation
function lerp(a, b, t) {
	return a + (b - a) * t;
}

function updateCoralColours() {
	const f = scene.fluid;

	for (let coralGroup of corals) {
		for (let coral of coralGroup) {
			const { xi, yi } = coral;
			const idx = xi * f.NumCellY + yi;

			let baseColour;
			switch (coral.colour) {
				case 0: baseColour = CORAL_COLOUR_1; break;
				case 1: baseColour = CORAL_COLOUR_2; break;
				case 2: baseColour = CORAL_COLOUR_3; break;
			}

			f.cellColour[3 * idx + 0] = lerp(baseColour[0], CORAL_COLOUR_BLEACHED[0], 1 - coral.health);
			f.cellColour[3 * idx + 1] = lerp(baseColour[1], CORAL_COLOUR_BLEACHED[1], 1 - coral.health);
			f.cellColour[3 * idx + 2] = lerp(baseColour[2], CORAL_COLOUR_BLEACHED[2], 1 - coral.health);
		}
	}
}