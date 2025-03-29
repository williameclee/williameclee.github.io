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

function clamp(x, min, max) {
	if (x < min)
		return min;
	else if (x > max)
		return max;
	else
		return x;
}

// ----------------- start of simulator ------------------------------

class FlipFluid {
	constructor(density, width, height, spacing, particleRadius, maxParticles) {
		this.density = density;
		this.fNumX = Math.floor(width / spacing) + 1;
		this.fNumY = Math.floor(height / spacing) + 1;
		this.h = Math.max(width / this.fNumX, height / this.fNumY);
		this.fInvSpacing = 1.0 / this.h;
		this.fNumCells = this.fNumX * this.fNumY;

		// grid
		this.cellU = new Float32Array(this.fNumCells);
		this.cellV = new Float32Array(this.fNumCells);
		this.du = new Float32Array(this.fNumCells);
		this.dv = new Float32Array(this.fNumCells);
		this.prevU = new Float32Array(this.fNumCells);
		this.prevV = new Float32Array(this.fNumCells);
		this.p = new Float32Array(this.fNumCells);
		this.cell = new Float32Array(this.fNumCells);
		this.cellType = new Int32Array(this.fNumCells);
		this.cellTemp = new Float32Array(this.fNumCells);
		this.cellColor = new Float32Array(3 * this.fNumCells);

		// particles
		this.maxParticles = maxParticles;
		this.pPosition = new Float32Array(2 * this.maxParticles);
		this.pType = new Int32Array(this.maxParticles); // 0 = water, 1 = ice
		this.pTemp = new Float32Array(this.maxParticles);
		this.pColour = new Float32Array(3 * this.maxParticles);
		for (var i = 0; i < this.maxParticles; i++)
			this.pColour[3 * i + 2] = 1.0;

		this.pUV = new Float32Array(2 * this.maxParticles);
		this.pDensity = new Float32Array(this.fNumCells);
		this.particleRestDensity = 0.0;

		this.particleRadius = particleRadius;
		this.pInvSpacing = 1.0 / (2.2 * particleRadius);
		this.pNumX = Math.floor(width * this.pInvSpacing) + 1;
		this.pNumY = Math.floor(height * this.pInvSpacing) + 1;
		this.pNumCells = this.pNumX * this.pNumY;

		this.numCellParticles = new Int32Array(this.pNumCells);
		this.firstCellParticle = new Int32Array(this.pNumCells + 1);
		this.cellParticleIds = new Int32Array(maxParticles);

		this.numWaterParticles = 0;
	}

	integrateParticles(dt, gravity) {
		for (var i = 0; i < this.numWaterParticles; i++) {
			if (!this.pType[i]) continue;
			this.pUV[2 * i + 1] += dt * gravity;
			this.pPosition[2 * i] += this.pUV[2 * i] * dt;
			this.pPosition[2 * i + 1] += this.pUV[2 * i + 1] * dt;
		}
	}

	pushParticlesApart(numIters) {
		var colorDiffusionCoeff = 0.001;

		// count particles per cell
		this.numCellParticles.fill(0);

		for (var i = 0; i < this.numWaterParticles; i++) {
			if (!this.pType[i]) continue;
			var x = this.pPosition[2 * i];
			var y = this.pPosition[2 * i + 1];

			var xi = clamp(Math.floor(x * this.pInvSpacing), 0, this.pNumX - 1);
			var yi = clamp(Math.floor(y * this.pInvSpacing), 0, this.pNumY - 1);
			var cellNr = xi * this.pNumY + yi;
			this.numCellParticles[cellNr]++;
		}

		// partial sums
		var first = 0;

		for (var i = 0; i < this.pNumCells; i++) {
			first += this.numCellParticles[i];
			this.firstCellParticle[i] = first;
		}
		this.firstCellParticle[this.pNumCells] = first;		// guard

		// fill particles into cells
		for (var i = 0; i < this.numWaterParticles; i++) {
			if (!this.pType[i]) continue;
			var x = this.pPosition[2 * i];
			var y = this.pPosition[2 * i + 1];

			var xi = clamp(Math.floor(x * this.pInvSpacing), 0, this.pNumX - 1);
			var yi = clamp(Math.floor(y * this.pInvSpacing), 0, this.pNumY - 1);
			var cellNr = xi * this.pNumY + yi;
			this.firstCellParticle[cellNr]--;
			this.cellParticleIds[this.firstCellParticle[cellNr]] = i;
		}

		// push particles apart
		var minDist = 2.0 * this.particleRadius;
		var minDist2 = minDist * minDist;

		for (var iter = 0; iter < numIters; iter++) {

			for (var i = 0; i < this.numWaterParticles; i++) {
				if (!this.pType[i]) continue;
				var px = this.pPosition[2 * i];
				var py = this.pPosition[2 * i + 1];

				var pxi = Math.floor(px * this.pInvSpacing);
				var pyi = Math.floor(py * this.pInvSpacing);
				var x0 = Math.max(pxi - 1, 0);
				var y0 = Math.max(pyi - 1, 0);
				var x1 = Math.min(pxi + 1, this.pNumX - 1);
				var y1 = Math.min(pyi + 1, this.pNumY - 1);

				for (var xi = x0; xi <= x1; xi++) {
					for (var yi = y0; yi <= y1; yi++) {
						var cellNr = xi * this.pNumY + yi;
						var first = this.firstCellParticle[cellNr];
						var last = this.firstCellParticle[cellNr + 1];
						for (var j = first; j < last; j++) {
							var id = this.cellParticleIds[j];
							if (id == i) continue;
							var qx = this.pPosition[2 * id];
							var qy = this.pPosition[2 * id + 1];

							var dx = qx - px;
							var dy = qy - py;
							var d2 = dx * dx + dy * dy;
							if (d2 > minDist2 || d2 == 0.0)
								continue;
							var d = Math.sqrt(d2);
							var s = 0.5 * (minDist - d) / d;
							dx *= s;
							dy *= s;
							if (!this.pType[i]) continue;
							this.pPosition[2 * i] -= dx;
							this.pPosition[2 * i + 1] -= dy;
							this.pPosition[2 * id] += dx;
							this.pPosition[2 * id + 1] += dy;

							// diffuse colors

							for (var k = 0; k < 3; k++) {
								var color0 = this.pColour[3 * i + k];
								var color1 = this.pColour[3 * id + k];
								var color = (color0 + color1) * 0.5;
								this.pColour[3 * i + k] = color0 + (color - color0) * colorDiffusionCoeff;
								this.pColour[3 * id + k] = color1 + (color - color1) * colorDiffusionCoeff;
							}
						}
					}
				}
			}
		}
	}

	handleParticleCollisions() {
		const h = 1.0 / this.fInvSpacing;
		const r = this.particleRadius;

		const minX = h + r;
		const maxX = (this.fNumX - 1) * h - r;
		const minY = h + r;
		const maxY = (this.fNumY - 1) * h - r;


		for (var i = 0; i < this.numWaterParticles; i++) {
			if (!this.pType[i]) continue;
			var x = this.pPosition[2 * i];
			var y = this.pPosition[2 * i + 1];

			if (x < minX) {
				x = minX;
				this.pUV[2 * i] = 0.0;

			}
			if (x > maxX) {
				x = maxX;
				this.pUV[2 * i] = 0.0;
			}
			if (y < minY) {
				y = minY;
				this.pUV[2 * i + 1] = 0.0;
			}
			if (y > maxY) {
				y = maxY;
				this.pUV[2 * i + 1] = 0.0;
			}
			this.pPosition[2 * i] = x;
			this.pPosition[2 * i + 1] = y;

			// Find grid cell spaghetti code
			const Ly = this.fNumY;
			const xi = Math.floor(x * this.fInvSpacing);
			const yi = Math.floor(y * this.fInvSpacing);
			const cellNr = xi * Ly + yi;

			if (this.cell[cellNr] === 0.0) {  // solid cell
				// Push particle up and out slightly
				if (this.cell[(xi - 1) * Ly + yi] === 1.0) {
					this.pPosition[2 * i] -= 0.5 * h;
				} else if (this.cell[(xi + 1) * Ly + yi] === 1.0) {
					this.pPosition[2 * i] += 0.5 * h;
				}
				if (this.cell[xi * Ly + yi - 1] === 1.0) {
					this.pPosition[2 * i + 1] -= 0.5 * h;
				} else {
					this.pPosition[2 * i + 1] += 0.5 * h;
				}

				// Optional: cancel velocity to prevent re-entry
				// this.pUV[2 * i] = -this.pUV[2 * i];
				// this.pUV[2 * i + 1] = -this.pUV[2 * i + 1];
				this.pUV[2 * i] = 0.0;
				this.pUV[2 * i + 1] = 0.0;
			}
		}
	}

	// convertIce2Water(obstacleX, obstacleY, obstacleRadius) {
	// var r = this.particleRadius;
	// var minDist = obstacleRadius + r / 2;
	// var minDist2 = minDist * minDist;

	// for (var i = 0; i < this.numWaterParticles; i++) {
	// 	if (this.pType[i]) continue;

	// 	// Only check for ice particles (type 0)
	// 	var x = this.pPosition[2 * i];
	// 	var y = this.pPosition[2 * i + 1];
	// 	var xi = Math.floor(x * this.fInvSpacing) * this.h;
	// 	var yi = Math.floor(y * this.fInvSpacing) * this.h;

	// 	var dxi = xi - obstacleX;
	// 	var dyi = yi - obstacleY;
	// 	var d2 = dxi * dxi + dyi * dyi;

	// 	if (d2 >= minDist2) continue;

	// 	this.pType[i] = 1;
	// 	xi = Math.floor(x * this.fInvSpacing);
	// 	yi = Math.floor(y * this.fInvSpacing);

	// 	if (this.cellType[xi * this.fNumY + yi] == SOLID_CELL) continue;

	// 	this.cell[xi * this.fNumY + yi] = 1.0;
	// 	this.cellType[xi * this.fNumY + yi] = FLUID_CELL;
	// 	this.cellTemp[xi * this.fNumY + yi] = -10.0;
	// }
	// }
	heatWater(obstacleX, obstacleY, obstacleRadius) {
		const r = this.particleRadius;
		const minDist = obstacleRadius + r / 2;
		const minDist2 = minDist * minDist;

		for (var i = 0; i < this.numWaterParticles; i++) {
			// Cap max temperature
			if (this.pTemp[i] >= 30) continue;

			// Only check for ice particles (type 0)
			const x = this.pPosition[2 * i];
			const y = this.pPosition[2 * i + 1];
			var xi = Math.floor(x * this.fInvSpacing) * this.h;
			var yi = Math.floor(y * this.fInvSpacing) * this.h;

			const dxi = xi - obstacleX;
			const dyi = yi - obstacleY;
			const d2 = dxi * dxi + dyi * dyi;

			if (d2 >= minDist2) continue;

			xi = Math.floor(x * this.fInvSpacing);
			yi = Math.floor(y * this.fInvSpacing);

			this.pTemp[i] += 0.1; // heat rate

			// Cpnvert to water
			if (this.pTemp[i] >= 0) {
				if (this.cellType[xi * this.fNumY + yi] == ICE_CELL) {
					this.cell[xi * this.fNumY + yi] = 1.0;
					this.cellType[xi * this.fNumY + yi] = FLUID_CELL;
				}
			}
		}
		for (var i = 0; i < this.numWaterParticles; i++) {
			if (this.pType[i]) continue;

			const x = this.pPosition[2 * i];
			const y = this.pPosition[2 * i + 1];

			const xi = Math.floor(x * this.fInvSpacing);
			const yi = Math.floor(y * this.fInvSpacing);

			if (this.cellType[xi * this.fNumY + yi] == FLUID_CELL) {
				this.pType[i] = 1;
			}
		}
	}

	updatepDensity() {
		const n = this.fNumY;
		const h = this.h;
		const h1 = this.fInvSpacing;
		const h2 = 0.5 * h;

		const d = f.pDensity;

		d.fill(0.0);

		for (var i = 0; i < this.numWaterParticles; i++) {
			var x = this.pPosition[2 * i];
			var y = this.pPosition[2 * i + 1];

			x = clamp(x, h, (this.fNumX - 1) * h);
			y = clamp(y, h, (this.fNumY - 1) * h);

			var x0 = Math.floor((x - h2) * h1);
			var tx = ((x - h2) - x0 * h) * h1;
			var x1 = Math.min(x0 + 1, this.fNumX - 2);

			var y0 = Math.floor((y - h2) * h1);
			var ty = ((y - h2) - y0 * h) * h1;
			var y1 = Math.min(y0 + 1, this.fNumY - 2);

			var sx = 1.0 - tx;
			var sy = 1.0 - ty;

			if (x0 < this.fNumX && y0 < this.fNumY) d[x0 * n + y0] += sx * sy;
			if (x1 < this.fNumX && y0 < this.fNumY) d[x1 * n + y0] += tx * sy;
			if (x1 < this.fNumX && y1 < this.fNumY) d[x1 * n + y1] += tx * ty;
			if (x0 < this.fNumX && y1 < this.fNumY) d[x0 * n + y1] += sx * ty;
		}

		if (this.particleRestDensity == 0.0) {
			var sum = 0.0;
			var numFluidCells = 0;

			for (var i = 0; i < this.fNumCells; i++) {
				if (this.cellType[i] == FLUID_CELL) {
					sum += d[i];
					numFluidCells++;
				}
			}

			if (numFluidCells > 0)
				this.particleRestDensity = sum / numFluidCells;
		}

		const expansionCoeff = 0.05;     // thermal expansion coefficient

		for (var i = 0; i < this.fNumCells; i++) {
			if (this.cellType[i] == FLUID_CELL) {
				const temp = this.cellTemp[i];
				const tempFactor = 1.0 + expansionCoeff * (temp - tempRef); // IDK why the sign is flipped for it to work
				d[i] *= tempFactor;
			}
		}
	}

	transferVelocities(toGrid, flipRatio) {
		var n = this.fNumY;
		var h = this.h;
		var h1 = this.fInvSpacing;
		var h2 = 0.5 * h;

		if (toGrid) {

			this.prevU.set(this.cellU);
			this.prevV.set(this.cellV);

			this.du.fill(0.0);
			this.dv.fill(0.0);
			this.cellU.fill(0.0);
			this.cellV.fill(0.0);

			for (var i = 0; i < this.fNumCells; i++)
				if (this.cell[i] == 0.0) {
					// this.cellType[i] = SOLID_CELL;
				} else {
					this.cellType[i] = AIR_CELL;
				}
			// if (this.cell[i] == 0.0) {
			// 	this.cellType[i] = SOLID_CELL;
			// } else if (this.cell[i] == 2.0) {
			// 	this.cellType[i] = ICE_CELL;
			// } else {
			// 	this.cellType[i] = AIR_CELL;
			// }

			for (var i = 0; i < this.numWaterParticles; i++) {
				var x = this.pPosition[2 * i];
				var y = this.pPosition[2 * i + 1];
				var xi = clamp(Math.floor(x * h1), 0, this.fNumX - 1);
				var yi = clamp(Math.floor(y * h1), 0, this.fNumY - 1);
				var cellNr = xi * n + yi;
				if (this.cellType[cellNr] == AIR_CELL)
					this.cellType[cellNr] = FLUID_CELL;
			}
		}

		for (var component = 0; component < 2; component++) {

			var dx = component == 0 ? 0.0 : h2;
			var dy = component == 0 ? h2 : 0.0;

			var f = component == 0 ? this.cellU : this.cellV;
			var prevF = component == 0 ? this.prevU : this.prevV;
			var d = component == 0 ? this.du : this.dv;

			for (var i = 0; i < this.numWaterParticles; i++) {
				var x = this.pPosition[2 * i];
				var y = this.pPosition[2 * i + 1];

				x = clamp(x, h, (this.fNumX - 1) * h);
				y = clamp(y, h, (this.fNumY - 1) * h);

				var x0 = Math.min(Math.floor((x - dx) * h1), this.fNumX - 2);
				var tx = ((x - dx) - x0 * h) * h1;
				var x1 = Math.min(x0 + 1, this.fNumX - 2);

				var y0 = Math.min(Math.floor((y - dy) * h1), this.fNumY - 2);
				var ty = ((y - dy) - y0 * h) * h1;
				var y1 = Math.min(y0 + 1, this.fNumY - 2);

				var sx = 1.0 - tx;
				var sy = 1.0 - ty;

				var d0 = sx * sy;
				var d1 = tx * sy;
				var d2 = tx * ty;
				var d3 = sx * ty;

				var nr0 = x0 * n + y0;
				var nr1 = x1 * n + y0;
				var nr2 = x1 * n + y1;
				var nr3 = x0 * n + y1;

				if (toGrid) {
					var pv = this.pUV[2 * i + component];
					f[nr0] += pv * d0; d[nr0] += d0;
					f[nr1] += pv * d1; d[nr1] += d1;
					f[nr2] += pv * d2; d[nr2] += d2;
					f[nr3] += pv * d3; d[nr3] += d3;
				}
				else {
					var offset = component == 0 ? n : 1;
					var valid0 = this.cellType[nr0] != AIR_CELL || this.cellType[nr0 - offset] != AIR_CELL ? 1.0 : 0.0;
					var valid1 = this.cellType[nr1] != AIR_CELL || this.cellType[nr1 - offset] != AIR_CELL ? 1.0 : 0.0;
					var valid2 = this.cellType[nr2] != AIR_CELL || this.cellType[nr2 - offset] != AIR_CELL ? 1.0 : 0.0;
					var valid3 = this.cellType[nr3] != AIR_CELL || this.cellType[nr3 - offset] != AIR_CELL ? 1.0 : 0.0;

					var v = this.pUV[2 * i + component];
					var d = valid0 * d0 + valid1 * d1 + valid2 * d2 + valid3 * d3;

					if (d > 0.0) {

						var picV = (valid0 * d0 * f[nr0] + valid1 * d1 * f[nr1] + valid2 * d2 * f[nr2] + valid3 * d3 * f[nr3]) / d;
						var corr = (valid0 * d0 * (f[nr0] - prevF[nr0]) + valid1 * d1 * (f[nr1] - prevF[nr1])
							+ valid2 * d2 * (f[nr2] - prevF[nr2]) + valid3 * d3 * (f[nr3] - prevF[nr3])) / d;
						var flipV = v + corr;

						this.pUV[2 * i + component] = (1.0 - flipRatio) * picV + flipRatio * flipV;
					}
				}
			}

			if (toGrid) {
				for (var i = 0; i < f.length; i++) {
					if (d[i] > 0.0)
						f[i] /= d[i];
				}

				// restore solid cells

				for (var i = 0; i < this.fNumX; i++) {
					for (var j = 0; j < this.fNumY; j++) {
						var solid = this.cell[i * n + j] == 0.0;
						if (solid || (i > 0 && this.cell[(i - 1) * n + j] == 0.0))
							this.cellU[i * n + j] = this.prevU[i * n + j];
						if (solid || (j > 0 && this.cell[i * n + j - 1] == 0.0))
							this.cellV[i * n + j] = this.prevV[i * n + j];
					}
				}
			}
		}
	}

	solveIncompressibility(numIters, dt, overRelaxation, compensateDrift = true) {

		this.p.fill(0.0);
		this.prevU.set(this.cellU);
		this.prevV.set(this.cellV);

		var Ny = this.fNumY;
		var cp = this.density * this.h / dt;

		for (var i = 0; i < this.fNumCells; i++) {
			var u = this.cellU[i];
			var v = this.cellV[i];
		}

		for (var iter = 0; iter < numIters; iter++) {

			for (var i = 1; i < this.fNumX - 1; i++) {
				for (var j = 1; j < this.fNumY - 1; j++) {

					if (this.cellType[i * Ny + j] != FLUID_CELL)
						continue;

					var center = i * Ny + j;
					var left = (i - 1) * Ny + j;
					var right = (i + 1) * Ny + j;
					var bottom = i * Ny + j - 1;
					var top = i * Ny + j + 1;

					var s = this.cell[center];
					var sx0 = this.cell[left];
					var sx1 = this.cell[right];
					var sy0 = this.cell[bottom];
					var sy1 = this.cell[top];
					var s = sx0 + sx1 + sy0 + sy1;
					if (s == 0.0)
						continue;

					var div = this.cellU[right] - this.cellU[center] +
						this.cellV[top] - this.cellV[center];

					if (this.particleRestDensity > 0.0 && compensateDrift) {
						var k = 1.0;
						var compression = this.pDensity[i * Ny + j] - this.particleRestDensity;
						if (compression > 0.0)
							div = div - k * compression;
					}

					var p = -div / s;
					p *= overRelaxation;
					this.p[center] += cp * p;

					this.cellU[center] -= sx0 * p;
					this.cellU[right] += sx1 * p;
					this.cellV[center] -= sy0 * p;
					this.cellV[top] += sy1 * p;
				}
			}
		}
	}

	diffuseTemperature(dt, diffusionRate = 0.2) {
		const nx = this.fNumX, ny = this.fNumY;
		const newTemp = new Float32Array(this.fNumCells);

		for (let i = 1; i < nx - 1; i++) {
			for (let j = 1; j < ny - 1; j++) {
				const idx = i * ny + j;

				if (this.cellType[idx] !== FLUID_CELL) continue;

				const tC = this.cellTemp[idx];
				let laplacian = 0.0;
				let count = 0;

				const nbs = [
					[(i - 1) * ny + j],
					[(i + 1) * ny + j],
					[i * ny + (j - 1)],
					[i * ny + (j + 1)]
				];

				for (const nbIdx of nbs) {
					if (this.cellType[nbIdx] === FLUID_CELL) {
						laplacian += this.cellTemp[nbIdx] - tC;
						count++;
					}
				}

				// Avoid divide-by-zero
				if (count > 0) {
					newTemp[idx] = tC + diffusionRate * dt * (laplacian / count);
				} else {
					newTemp[idx] = tC;
				}
			}
		}

		// Write back only to fluid cells
		for (let i = 0; i < this.fNumCells; i++) {
			if (this.cellType[i] === FLUID_CELL) {
				this.cellTemp[i] = newTemp[i];
			}
		}
	}

	sampleTemperature() {
		const nx = this.fNumX, ny = this.fNumY;
		var tempPCount = new Float32Array(this.fNumCells);
		var tempSum = new Float32Array(this.fNumCells);

		for (let i = 0; i < this.numWaterParticles; i++) {
			const x = this.pPosition[2 * i];
			const y = this.pPosition[2 * i + 1];
			const temp = this.pTemp[i];

			const xi = Math.floor(x * this.fInvSpacing);
			const yi = Math.floor(y * this.fInvSpacing);
			const cellNr = xi * ny + yi;

			if (this.cellType[cellNr] === FLUID_CELL) {
				tempSum[cellNr] += temp;
				tempPCount[cellNr]++;
			}
		}

		for (let i = 0; i < this.fNumCells; i++) {
			if (this.cellType[i] !== FLUID_CELL) {
				if (this.cellType[i] === AIR_CELL) {
					this.cellTemp[i] = tempRef;
				} else if (this.cellType[i] !== ICE_CELL) {
					continue;
				}
			}
			if (tempPCount[i] > 0) {
				this.cellTemp[i] = tempSum[i] / tempPCount[i];
			} else {
				this.cellTemp[i] = tempRef;
			}
		}
	}

	updateTemperature() {
		for (let i = 0; i < this.numWaterParticles; i++) {
			const x = this.pPosition[2 * i];
			const y = this.pPosition[2 * i + 1];

			const xi = Math.floor(x * this.fInvSpacing);
			const yi = Math.floor(y * this.fInvSpacing);
			const cellNr = xi * this.fNumY + yi;

			if (this.cellType[cellNr] === FLUID_CELL || this.cellType[cellNr] === AIR_CELL) {
				this.pTemp[i] = this.cellTemp[cellNr];
			}
		}
	}


	updatepColours() {
		for (var i = 0; i < this.numWaterParticles; i++) {
			var t = this.pTemp[i] / 20;
			this.pColour[3 * i] = 0.2 + 0.2 * t;
			this.pColour[3 * i + 1] = 0.2 + 0.4 * (1 - t);
			this.pColour[3 * i + 2] = 0.5 + 0.5 * (1 - t);
		}
	}

	setSciColor(cellNr, val, minVal, maxVal) {
		val = Math.min(Math.max(val, minVal), maxVal - 0.0001);
		var d = maxVal - minVal;
		val = d == 0.0 ? 0.5 : (val - minVal) / d;
		var m = 0.25;
		var num = Math.floor(val / m);
		var s = (val - num * m) / m;
		var r, g, b;

		switch (num) {
			case 0: r = 0.0; g = s; b = 1.0; break;
			case 1: r = 0.0; g = 1.0; b = 1.0 - s; break;
			case 2: r = s; g = 1.0; b = 0.0; break;
			case 3: r = 1.0; g = 1.0 - s; b = 0.0; break;
		}

		this.cellColor[3 * cellNr] = r;
		this.cellColor[3 * cellNr + 1] = g;
		this.cellColor[3 * cellNr + 2] = b;
	}

	updateCellColors() {
		this.cellColor.fill(0.0);

		for (var i = 0; i < this.fNumCells; i++) {

			if (this.cellType[i] == SOLID_CELL) {
				this.cellColor[3 * i] = 0.8;
				this.cellColor[3 * i + 1] = 0.6;
				this.cellColor[3 * i + 2] = 0.4;
			} else if (this.cellType[i] == ICE_CELL) {
				let t = (this.cellTemp[i] + 3) / 3;
				t = Math.max(0, Math.min(1, t));

				// this.cellColor[3 * i] = 0.4;
				this.cellColor[3 * i] = 0.4 + 0.2 * t; // Red component (0.4 to 0.8)
				this.cellColor[3 * i + 1] = 0.6;
				this.cellColor[3 * i + 2] = 0.8;
			} else if (this.cellType[i] == AIR_CELL) {
				this.cellColor[3 * i] = 0.5;
				this.cellColor[3 * i + 1] = 0.5;
				this.cellColor[3 * i + 2] = 0.8;
			} else {
				let t = this.cellTemp[i] / 20;
				t = Math.max(0, Math.min(1, t));

				let depth = 0;
				for (let j = i % this.fNumY + 1; j < this.fNumY; j++) {
					if (this.cellType[Math.floor(i / this.fNumY) * this.fNumY + j] === FLUID_CELL) {
						depth++;
					} else {
						break;
					}
				}
				let lightFactor = Math.exp(-0.001 * Math.max(depth - 20, 0) ** 2); // tweak for smoother/faster falloff

				// Blend temperature and sunlight (lightFactor)
				this.cellColor[3 * i] = (0.2 + 0.2 * t) * lightFactor;
				this.cellColor[3 * i + 1] = (0.2 + 0.4 * (1 - t)) * lightFactor;
				this.cellColor[3 * i + 2] = (0.5 + 0.5 * (1 - t)) * lightFactor;
			}
		}
	}

	simulate(dt, gravity, flipRatio, numPressureIters, numParticleIters, overRelaxation, compensateDrift, separateParticles, obstacleX, obstacleY, obstacleRadius) {
		var numSubSteps = 1;
		var sdt = dt / numSubSteps;

		for (var step = 0; step < numSubSteps; step++) {
			this.integrateParticles(sdt, gravity);
			if (separateParticles)
				this.pushParticlesApart(numParticleIters);
			this.handleParticleCollisions()
			// this.convertIce2Water(obstacleX, obstacleY, obstacleRadius);
			this.transferVelocities(true);
			this.sampleTemperature();
			this.diffuseTemperature(sdt, 20.0);
			this.updateTemperature();
			this.heatWater(obstacleX, obstacleY, obstacleRadius); // Heat water particles near the obstacle
			this.updatepDensity();
			this.solveIncompressibility(numPressureIters, sdt, overRelaxation, compensateDrift);
			this.transferVelocities(false, flipRatio);
		}

		this.updatepColours();
		this.updateCellColors();

	}
}

// ----------------- end of simulator ------------------------------

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

	var res = 144;

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
}


// draw -------------------------------------------------------

const pointVertexShader = `
		attribute vec2 attrPosition;
		attribute vec3 attrColor;
		uniform vec2 domainSize;
		uniform float pointSize;
		uniform float drawDisk;

		varying vec3 fragColor;
		varying float fragDrawDisk;

		void main() {
		vec4 screenTransform = 
			vec4(2.0 / domainSize.x, 2.0 / domainSize.y, -1.0, -1.0);
		gl_Position =
			vec4(attrPosition * screenTransform.xy + screenTransform.zw, 0.0, 1.0);

		gl_PointSize = pointSize;
		fragColor = attrColor;
		fragDrawDisk = drawDisk;
		}
	`;

const pointFragmentShader = `
		precision mediump float;
		varying vec3 fragColor;
		varying float fragDrawDisk;

		void main() {
			if (fragDrawDisk == 1.0) {
				float rx = 0.5 - gl_PointCoord.x;
				float ry = 0.5 - gl_PointCoord.y;
				float r2 = rx * rx + ry * ry;
				if (r2 > 0.25)
					discard;
			}
			gl_FragColor = vec4(fragColor, 1.0);
		}
	`;

const meshVertexShader = `
		attribute vec2 attrPosition;
		uniform vec2 domainSize;
		uniform vec3 color;
		uniform vec2 translation;
		uniform float scale;

		varying vec3 fragColor;

		void main() {
			vec2 v = translation + attrPosition * scale;
		vec4 screenTransform = 
			vec4(2.0 / domainSize.x, 2.0 / domainSize.y, -1.0, -1.0);
		gl_Position =
			vec4(v * screenTransform.xy + screenTransform.zw, 0.0, 1.0);

		fragColor = color;
		}
	`;

const meshFragmentShader = `
		precision mediump float;
		varying vec3 fragColor;

		void main() {
			gl_FragColor = vec4(fragColor, 1.0);
		}
	`;

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

var pointShader = null;
var meshShader = null;

var pointVertexBuffer = null;
var pointColorBuffer = null;

var gridVertBuffer = null;
var gridColorBuffer = null;

var diskVertBuffer = null;
var diskIdBuffer = null;

var coralVertexBuffer = null;
var coralColorBuffer = null;

function draw() {
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);

	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

	// prepare shaders

	if (pointShader == null)
		pointShader = createShader(gl, pointVertexShader, pointFragmentShader);
	if (meshShader == null)
		meshShader = createShader(gl, meshVertexShader, meshFragmentShader);

	// grid

	if (gridVertBuffer == null) {

		var f = scene.fluid;
		gridVertBuffer = gl.createBuffer();
		var cellCenters = new Float32Array(2 * f.fNumCells);
		var p = 0;

		for (var i = 0; i < f.fNumX; i++) {
			for (var j = 0; j < f.fNumY; j++) {
				cellCenters[p++] = (i + 0.5) * f.h;
				cellCenters[p++] = (j + 0.5) * f.h;
			}
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, gridVertBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, cellCenters, gl.DYNAMIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	}

	if (gridColorBuffer == null)
		gridColorBuffer = gl.createBuffer();

	if (scene.showGrid) {

		var pointSize = 1.0 * scene.fluid.h / simWidth * canvas.width;

		gl.useProgram(pointShader);
		gl.uniform2f(gl.getUniformLocation(pointShader, 'domainSize'), simWidth, simHeight);
		gl.uniform1f(gl.getUniformLocation(pointShader, 'pointSize'), pointSize);
		gl.uniform1f(gl.getUniformLocation(pointShader, 'drawDisk'), 0.0);

		gl.bindBuffer(gl.ARRAY_BUFFER, gridVertBuffer);
		var posLoc = gl.getAttribLocation(pointShader, 'attrPosition');
		gl.enableVertexAttribArray(posLoc);
		gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, gridColorBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, scene.fluid.cellColor, gl.DYNAMIC_DRAW);

		var colorLoc = gl.getAttribLocation(pointShader, 'attrColor');
		gl.enableVertexAttribArray(colorLoc);
		gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);

		gl.drawArrays(gl.POINTS, 0, scene.fluid.fNumCells);

		gl.disableVertexAttribArray(posLoc);
		gl.disableVertexAttribArray(colorLoc);

		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	}

	// water
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

	// coral
	if (corals.length > 0) {
		gl.useProgram(meshShader);
		gl.uniform2f(gl.getUniformLocation(meshShader, 'domainSize'), simWidth, simHeight);

		let posLoc = gl.getAttribLocation(meshShader, 'attrPosition');
		gl.enableVertexAttribArray(posLoc);

		if (coralVertexBuffer == null) {
			coralVertexBuffer = gl.createBuffer();
			const half = 0.5;
			const squareVerts = new Float32Array([
				-half, -half,
				half, -half,
				half, half,
				-half, half
			]);
			gl.bindBuffer(gl.ARRAY_BUFFER, coralVertexBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, squareVerts, gl.STATIC_DRAW);
		}

		gl.bindBuffer(gl.ARRAY_BUFFER, coralVertexBuffer);
		gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

		const f = scene.fluid;
		const h = f.h;
		
		for (const coral of corals) {
			for (const cell of coral) {
				const x = (cell.xi + 0.5) * h;
				const y = (cell.yi + 0.5) * h;

				const health = cell.health ?? 1.0;
				if (cell.colour === 0) {
					var r = 1.0;
					var g = 0.8;
					var b = 0.2;
				} else if (cell.colour === 1) {
					var r = 0.6;
					var g = 0.9;
					var b = 0.3;
				} else {
					var r = 1.0;
					var g = 0.8;
					var b = 0.8;
				}
				r = r + (0.9 - r) * (1 - health); // Red fades as it dies
				g = g + (0.9 - g) * (1 - health); // Green fades as it dies
				b = b + (0.9 - b) * (1 - health); // Blue fades as it dies

				gl.uniform3f(gl.getUniformLocation(meshShader, 'color'), r, g, b);
				gl.uniform2f(gl.getUniformLocation(meshShader, 'translation'), x, y);
				gl.uniform1f(gl.getUniformLocation(meshShader, 'scale'), h);

				gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
			}
		}

		gl.disableVertexAttribArray(posLoc);
	}

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

// interaction -------------------------------------------------------
var mouseDown = false;

function startDrag(x, y) {
	let bounds = canvas.getBoundingClientRect();

	let mx = x - bounds.left - canvas.clientLeft;
	let my = y - bounds.top - canvas.clientTop;
	mouseDown = true;

	x = mx / cScale;
	y = (canvas.height - my) / cScale;

	setObstacle(x, y, true);
	scene.paused = false;
}

function drag(x, y) {
	if (mouseDown) {
		let bounds = canvas.getBoundingClientRect();
		let mx = x - bounds.left - canvas.clientLeft;
		let my = y - bounds.top - canvas.clientTop;
		x = mx / cScale;
		y = (canvas.height - my) / cScale;
		setObstacle(x, y, false);
	}
}

function endDrag() {
	mouseDown = false;
	scene.obstacleVelX = 0.0;
	scene.obstacleVelY = 0.0;
}

canvas.addEventListener('mousedown', event => {
	startDrag(event.x, event.y);
});

canvas.addEventListener('mouseup', event => {
	endDrag();
});

canvas.addEventListener('mousemove', event => {
	drag(event.x, event.y);
});

canvas.addEventListener('touchstart', event => {
	startDrag(event.touches[0].clientX, event.touches[0].clientY)
});

canvas.addEventListener('touchend', event => {
	endDrag()
});

canvas.addEventListener('touchmove', event => {
	event.preventDefault();
	event.stopImmediatePropagation();
	drag(event.touches[0].clientX, event.touches[0].clientY)
}, { passive: false });


document.addEventListener('keydown', event => {
	switch (event.key) {
		case 'p': scene.paused = !scene.paused; break;
		case 'm': scene.paused = false; simulate(); scene.paused = true; break;
	}
});

function toggleStart() {
	var button = document.getElementById('startButton');
	if (scene.paused)
		button.innerHTML = "Stop";
	else
		button.innerHTML = "Start";
	scene.paused = !scene.paused;
}

// main -------------------------------------------------------

function simulate() {
	if (!scene.paused)
		scene.fluid.simulate(
			scene.dt, scene.gravity, scene.flipRatio, scene.numPressureIters, scene.numParticleIters,
			scene.overRelaxation, scene.compensateDrift, scene.separateParticles,
			scene.obstacleX, scene.obstacleY, scene.obstacleRadius, scene.colorFieldNr);
	scene.frameNr++;
}

const fps = 25;

function update() {
	simulate();
	draw();
	requestAnimationFrame(update);
	// setTimeout(() => {
	// 	requestAnimationFrame(update);
	// }, 1000 / fps);
}


setupScene();
update();