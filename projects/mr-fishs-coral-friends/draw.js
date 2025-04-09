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

function createShader(gl, vsSource, fsSource) {
	const vsShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vsShader, vsSource);
	gl.compileShader(vsShader);
	if (!gl.getShaderParameter(vsShader, gl.COMPILE_STATUS))
		console.log("vertex shader compile error: " + gl.getShaderInfoLog(vsShader));

	const fsShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fsShader, fsSource);
	gl.compileShader(fsShader);
	if (!gl.getShaderParameter(fsShader, gl.COMPILE_STATUS))
		console.log("fragment shader compile error: " + gl.getShaderInfoLog(fsShader));

	var shader = gl.createProgram();
	gl.attachShader(shader, vsShader);
	gl.attachShader(shader, fsShader);
	gl.linkProgram(shader);

	return shader;
}

function draw() {
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);

	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

	// prepare shaders
	if (!pointShader) pointShader = createShader(gl, pointVertexShader, pointFragmentShader);
	if (!meshShader) meshShader = createShader(gl, meshVertexShader, meshFragmentShader);
	if (!fishShader) fishShader = createShader(gl, fishVertexShader, fishFragmentShader);

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

	for (const coral of corals) {
		for (const cell of coral) {
			const x = (cell.xi-numDisplayCellPadding + 0.5) * cellSpacing;
			const y = (cell.yi-numDisplayCellPadding + 0.5) * cellSpacing;

			const health = cell.health ?? 1.0;
			let r, g, b;
			if (cell.colour === 0) {
				r = 1.0; g = 0.8; b = 0.2;
			} else if (cell.colour === 1) {
				r = 0.6; g = 0.9; b = 0.3;
			} else {
				r = 1.0; g = 0.8; b = 0.8;
			}
			r = r + (0.9 - r) * (1 - health);
			g = g + (0.9 - g) * (1 - health);
			b = b + (0.9 - b) * (1 - health);

			// Add vertices for the quad (two triangles per quad)
			vertices.push(
				x - cellSpacing / 2, y - cellSpacing / 2, // Bottom-left
				x + cellSpacing / 2, y - cellSpacing / 2, // Bottom-right
				x + cellSpacing / 2, y + cellSpacing / 2, // Top-right

				x - cellSpacing / 2, y - cellSpacing / 2, // Bottom-left
				x + cellSpacing / 2, y + cellSpacing / 2, // Top-right
				x - cellSpacing / 2, y + cellSpacing / 2  // Top-left
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

	// Upload colors
	const colorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);

	const colorLoc = gl.getAttribLocation(meshShader, 'attrColor');
	gl.enableVertexAttribArray(colorLoc);
	gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);

	// Draw all quads as triangles
	gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);

	gl.disableVertexAttribArray(posLoc);
	gl.disableVertexAttribArray(colorLoc);
}

function drawParticles(gl, scene) {
	if (scene.showParticles) {
		gl.clear(gl.DEPTH_BUFFER_BIT);

		var pointSize = 2.0 * scene.fluid.particleRadius / simWidth * canvas.width;

		gl.useProgram(pointShader);
		gl.uniform2f(gl.getUniformLocation(pointShader, 'domainSize'), simWidth, simHeight);
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

		gl.drawArrays(gl.POINTS, 0, scene.fluid.numWaterParticles);

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
	const colors = [];

	for (let i = numDisplayCellPadding; i < numDisplayCellX + numDisplayCellPadding; i++) {
		const iDisp = i - numDisplayCellPadding;
		for (let j = numDisplayCellPadding; j < numDisplayCellY + numDisplayCellPadding; j++) {
			const jDisp = j - numDisplayCellPadding;
			const x = (iDisp + 0.5) * cellSpacing;
			const y = (jDisp + 0.5) * cellSpacing;

			const idx = i * f.NumCellY + j;
			const r = scene.fluid.cellColor[3 * idx];
			const g = scene.fluid.cellColor[3 * idx + 1];
			const b = scene.fluid.cellColor[3 * idx + 2];

			// Add 6 vertices for the cell quad
			vertices.push(
				x - cellSpacing / 2, y - cellSpacing / 2,
				x + cellSpacing / 2, y - cellSpacing / 2,
				x + cellSpacing / 2, y + cellSpacing / 2,

				x - cellSpacing / 2, y - cellSpacing / 2,
				x + cellSpacing / 2, y + cellSpacing / 2,
				x - cellSpacing / 2, y + cellSpacing / 2
			);

			for (let k = 0; k < 6; k++) {
				colors.push(r, g, b);
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

	const colorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);

	const colorLoc = gl.getAttribLocation(meshShader, 'attrColor');
	gl.enableVertexAttribArray(colorLoc);
	gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);

	gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);

	gl.disableVertexAttribArray(posLoc);
	gl.disableVertexAttribArray(colorLoc);
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

		// ✅ Flip the image vertically to match WebGL texture coords
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

