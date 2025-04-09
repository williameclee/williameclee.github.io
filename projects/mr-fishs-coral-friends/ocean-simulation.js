function clamp(x, min, max) {
	if (x < min)
		return min;
	else if (x > max)
		return max;
	else
		return x;
}

class FlipFluid {
	constructor(density, width, height, spacing, particleRadius, maxParticles) {
		this.density = density;
		this.NumCellX = Math.floor(width / spacing);
		this.NumCellY = Math.floor(height / spacing);
		this.h = Math.max(width / this.NumCellX, height / this.NumCellY);
		this.cellInvSpacing = 1.0 / this.h;
		this.fNumCells = this.NumCellX * this.NumCellY;

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
		const h = 1.0 / this.cellInvSpacing;
		const r = this.particleRadius;

		const minX = h + r;
		const maxX = (this.NumCellX - 1) * h - r;
		const minY = h + r;
		const maxY = (this.NumCellY - 1) * h - r;


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
			const Ly = this.NumCellY;
			const xi = Math.floor(x * this.cellInvSpacing);
			const yi = Math.floor(y * this.cellInvSpacing);
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
			var xi = Math.floor(x * this.cellInvSpacing) * this.h;
			var yi = Math.floor(y * this.cellInvSpacing) * this.h;

			const dxi = xi - obstacleX;
			const dyi = yi - obstacleY;
			const d2 = dxi * dxi + dyi * dyi;

			if (d2 >= minDist2) continue;

			xi = Math.floor(x * this.cellInvSpacing);
			yi = Math.floor(y * this.cellInvSpacing);

			this.pTemp[i] += 0.1; // heat rate

			// Cpnvert to water
			if (this.pTemp[i] >= 0) {
				if (this.cellType[xi * this.NumCellY + yi] == ICE_CELL) {
					this.cell[xi * this.NumCellY + yi] = 1.0;
					this.cellType[xi * this.NumCellY + yi] = FLUID_CELL;
				}
			}
		}
		for (var i = 0; i < this.numWaterParticles; i++) {
			if (this.pType[i]) continue;

			const x = this.pPosition[2 * i];
			const y = this.pPosition[2 * i + 1];

			const xi = Math.floor(x * this.cellInvSpacing);
			const yi = Math.floor(y * this.cellInvSpacing);

			if (this.cellType[xi * this.NumCellY + yi] == FLUID_CELL) {
				this.pType[i] = 1;
			}
		}
	}

	updatepDensity() {
		const n = this.NumCellY;
		const h = this.h;
		const h1 = this.cellInvSpacing;
		const h2 = 0.5 * h;

		const d = f.pDensity;

		d.fill(0.0);

		for (var i = 0; i < this.numWaterParticles; i++) {
			var x = this.pPosition[2 * i];
			var y = this.pPosition[2 * i + 1];

			x = clamp(x, h, (this.NumCellX - 1) * h);
			y = clamp(y, h, (this.NumCellY - 1) * h);

			var x0 = Math.floor((x - h2) * h1);
			var tx = ((x - h2) - x0 * h) * h1;
			var x1 = Math.min(x0 + 1, this.NumCellX - 2);

			var y0 = Math.floor((y - h2) * h1);
			var ty = ((y - h2) - y0 * h) * h1;
			var y1 = Math.min(y0 + 1, this.NumCellY - 2);

			var sx = 1.0 - tx;
			var sy = 1.0 - ty;

			if (x0 < this.NumCellX && y0 < this.NumCellY) d[x0 * n + y0] += sx * sy;
			if (x1 < this.NumCellX && y0 < this.NumCellY) d[x1 * n + y0] += tx * sy;
			if (x1 < this.NumCellX && y1 < this.NumCellY) d[x1 * n + y1] += tx * ty;
			if (x0 < this.NumCellX && y1 < this.NumCellY) d[x0 * n + y1] += sx * ty;
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
		var n = this.NumCellY;
		var h = this.h;
		var h1 = this.cellInvSpacing;
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
				var xi = clamp(Math.floor(x * h1), 0, this.NumCellX - 1);
				var yi = clamp(Math.floor(y * h1), 0, this.NumCellY - 1);
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

				x = clamp(x, h, (this.NumCellX - 1) * h);
				y = clamp(y, h, (this.NumCellY - 1) * h);

				var x0 = Math.min(Math.floor((x - dx) * h1), this.NumCellX - 2);
				var tx = ((x - dx) - x0 * h) * h1;
				var x1 = Math.min(x0 + 1, this.NumCellX - 2);

				var y0 = Math.min(Math.floor((y - dy) * h1), this.NumCellY - 2);
				var ty = ((y - dy) - y0 * h) * h1;
				var y1 = Math.min(y0 + 1, this.NumCellY - 2);

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

				for (var i = 0; i < this.NumCellX; i++) {
					for (var j = 0; j < this.NumCellY; j++) {
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

		var Ny = this.NumCellY;
		var cp = this.density * this.h / dt;

		for (var i = 0; i < this.fNumCells; i++) {
			var u = this.cellU[i];
			var v = this.cellV[i];
		}

		for (var iter = 0; iter < numIters; iter++) {

			for (var i = 1; i < this.NumCellX - 1; i++) {
				for (var j = 1; j < this.NumCellY - 1; j++) {

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
		const nx = this.NumCellX, ny = this.NumCellY;
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
		const nx = this.NumCellX, ny = this.NumCellY;
		var tempPCount = new Float32Array(this.fNumCells);
		var tempSum = new Float32Array(this.fNumCells);

		for (let i = 0; i < this.numWaterParticles; i++) {
			const x = this.pPosition[2 * i];
			const y = this.pPosition[2 * i + 1];
			const temp = this.pTemp[i];

			const xi = Math.floor(x * this.cellInvSpacing);
			const yi = Math.floor(y * this.cellInvSpacing);
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

			const xi = Math.floor(x * this.cellInvSpacing);
			const yi = Math.floor(y * this.cellInvSpacing);
			const cellNr = xi * this.NumCellY + yi;

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

	// updateCellColors();
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

				this.cellColor[3 * i] = 0.4 + 0.2 * t; // Red component (0.4 to 0.8)
				this.cellColor[3 * i + 1] = 0.6;
				this.cellColor[3 * i + 2] = 0.8;
			} else if (this.cellType[i] == AIR_CELL) {
				this.cellColor[3 * i] = 0.5;
				this.cellColor[3 * i + 1] = 0.5;
				this.cellColor[3 * i + 2] = 0.8;
			} else {
				let t = Math.round(this.cellTemp[i]) / 20;
				t = Math.max(0, Math.min(1, t));

				let depth = 0;
				for (let j = i % this.NumCellY + 1; j < this.NumCellY; j++) {
					if (this.cellType[Math.floor(i / this.NumCellY) * this.NumCellY + j] === FLUID_CELL) {
						depth++;
					} else {
						break;
					}
				}
				let lightFactor = Math.exp(-0.001 * Math.max(depth - 20, 0) ** 2); // tweak for smoother/faster falloff

				// Blend temperature and sunlight (lightFactor)
				this.cellColor[3 * i] = (22 + (63 - 22) * (1 - t)) / 255 * lightFactor;
				this.cellColor[3 * i + 1] = (231 + (90 - 231) * (t)) / 255 * lightFactor;
				this.cellColor[3 * i + 2] = (207 + (183 - 207) * (t)) / 255 * lightFactor;
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
			if (mouseDown) {
				this.heatWater(obstacleX, obstacleY, obstacleRadius); // Heat water particles near the obstacle
			}
			this.updatepDensity();
			this.solveIncompressibility(numPressureIters, sdt, overRelaxation, compensateDrift);
			this.transferVelocities(false, flipRatio);
		}

		this.updatepColours();
		this.updateCellColors();
		updateCoralHealthAndColor();

	}
}

function updateFish() {
	const f = scene.fluid;
	const NumCellX = f.NumCellX;
	const NumCellY = f.NumCellY;
	const now = performance.now();

	const shouldChaseMouse = !mouseDown;

	// === Update fish target ===
	const needNewTarget = (shouldChaseMouse && (
		(now - lastTargetSetTime > TARGET_UPDATE_INTERVAL) ||
		(now - lastMouseMoveTime < 100)
	));

	if (needNewTarget) {
		// Chase target near mouse
		const dx = Math.floor((Math.random() - 0.5) * 2 * TARGET_OFFSET_RANGE);
		const dy = Math.floor((Math.random() - 0.5) * 2 * TARGET_OFFSET_RANGE);

		fishTargetXi = Math.max(0, Math.min(NumCellX - 1, mouseXi + dx));
		fishTargetYi = Math.max(0, Math.min(NumCellY - 1, mouseYi + dy));

		lastTargetSetTime = now;
	}

	// === Optional: Random wander when mouse held down ===
	if (!shouldChaseMouse && now - lastTargetSetTime > TARGET_UPDATE_INTERVAL) {
		fishTargetXi = Math.floor(Math.random() * NumCellX);
		fishTargetYi = Math.floor(Math.random() * NumCellY);
		lastTargetSetTime = now;
	}

	// === Move toward target ===
	let dx = fishTargetXi - fishXi;
	let dy = fishTargetYi - fishYi;

	const stepX = dx === 0 ? 0 : dx > 0 ? 1 : -1;
	const stepY = dy === 0 ? 0 : dy > 0 ? 1 : -1;

	const tryMove = (xi, yi) => {
		if (xi >= 0 && xi < NumCellX && yi >= 0 && yi < NumCellY) {
			const cellType = f.cellType[xi * NumCellY + yi];
			if (cellType === FLUID_CELL) {
				fishXi = xi;
				fishYi = yi;
				return true;
			}
		}
		return false;
	};

	const moved = tryMove(fishXi + stepX, fishYi + stepY) ||
		tryMove(fishXi + stepX, fishYi) ||
		tryMove(fishXi, fishYi + stepY);

	// === Snap correction ===
	let idx = fishXi * NumCellY + fishYi;
	let type = f.cellType[idx];

	if (type === SOLID_CELL) {
		while (fishYi > 0) {
			fishYi++;
			idx = fishXi * NumCellY + fishYi;
			if (f.cellType[idx] === FLUID_CELL) break;
		}
	} else if (type === AIR_CELL) {
		while (fishYi < NumCellY - 1) {
			fishYi--;
			idx = fishXi * NumCellY + fishYi;
			if (f.cellType[idx] === FLUID_CELL) break;
		}
	}

	// === Update world coordinates ===
	const h = f.h;
	fishX = (fishXi + 0.5) * h;
	fishY = (fishYi + 0.5) * h;
}

function updateCoralHealthAndColor() {
	const f = scene.fluid;

	for (let coralGroup of corals) {
		for (let coral of coralGroup) {
			const { xi, yi } = coral;
			const idx = xi * f.NumCellY + yi;

			// Get temperature and water depth above coral
			const temp = f.cellTemp[idx];

			// Count fluid cells above this coral (proxy for sea level rise)
			let depthAbove = 0;
			for (let j = yi + 1; j < f.NumCellY; j++) {
				if (f.cellType[xi * f.NumCellY + j] === FLUID_CELL) {
					depthAbove++;
				} else {
					break;
				}
			}

			// === Health Degradation ===
			// Warmer than 28°C = bleaching; more than 10 layers above = too deep
			let damage = 0;
			if (temp > 20) damage += 0.05 * (temp - 20); // higher temp = more damage
			if (depthAbove > 60) damage += 0.005 * (depthAbove - 10); // deeper = less light

			// Apply and clamp health
			coral.health = Math.max(0, coral.health - damage * scene.dt * 10);

			// === Update coral color ===
			// Blend from original color to grey (0.8, 0.8, 0.8) based on health
			const health = coral.health;
			let baseColor;
			switch (coral.colour) {
				case 0: baseColor = [1.0, 0.5, 0.5]; break; // reddish
				case 1: baseColor = [0.5, 1.0, 0.5]; break; // greenish
				case 2: baseColor = [0.5, 0.5, 1.0]; break; // bluish
			}
			const bleachedColor = [0.8, 0.8, 0.8];
			const blended = baseColor.map((c, i) => c * health + bleachedColor[i] * (1 - health));

			f.cellColor[3 * idx + 0] = blended[0];
			f.cellColor[3 * idx + 1] = blended[1];
			f.cellColor[3 * idx + 2] = blended[2];
		}
	}
}

// main -------------------------------------------------------
function simulate() {
	if (!scene.paused)
		scene.fluid.simulate(
			scene.dt, scene.gravity, scene.flipRatio, scene.numPressureIters, scene.numParticleIters,
			scene.overRelaxation, scene.compensateDrift, scene.separateParticles,
			scene.obstacleX, scene.obstacleY, scene.obstacleRadius, scene.colorFieldNr);
	updateFish();
	scene.frameNr++;
}

function update() {
	simulate();
	draw();
	requestAnimationFrame(update);
}


setupScene();
update();