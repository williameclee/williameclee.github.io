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

		// cell
		this.cellU = new Float32Array(this.fNumCells);
		this.cellV = new Float32Array(this.fNumCells);
		this.du = new Float32Array(this.fNumCells);
		this.dv = new Float32Array(this.fNumCells);
		this.prevU = new Float32Array(this.fNumCells);
		this.prevV = new Float32Array(this.fNumCells);
		this.p = new Float32Array(this.fNumCells);
		this.cell = new Float32Array(this.fNumCells);
		this.cellDepth = new Int32Array(this.fNumCells);
		this.cellType = new Int32Array(this.fNumCells);
		this.cellTemp = new Float32Array(this.fNumCells);
		this.cellColour = new Float32Array(3 * this.fNumCells);

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

		this.numParticles = 0;
		this.meanTemp = tempRef;
	}

	integrateParticles(dt, gravity) {
		for (var i = 0; i < this.numParticles; i++) {
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

		for (var i = 0; i < this.numParticles; i++) {
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
		for (var i = 0; i < this.numParticles; i++) {
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

			for (var i = 0; i < this.numParticles; i++) {
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


		for (var i = 0; i < this.numParticles; i++) {
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

	heatWater(obstacleX, obstacleY, obstacleRadius, heatingRate = 0.2) {
		const r = this.particleRadius;
		const minDist = obstacleRadius + r / 2;
		const minDist2 = minDist * minDist;

		for (var i = 0; i < this.numParticles; i++) {
			// Cap max temperature
			if (this.pTemp[i] >= tempMax) {
				this.pTemp[i] = tempMax;
				continue;
			}

			// Check distance
			const px = this.pPosition[2 * i];
			const py = this.pPosition[2 * i + 1];
			// Heat entire cell
			const cellxi = Math.floor(px * this.cellInvSpacing);
			const cellyi = Math.floor(py * this.cellInvSpacing);
			const cellx = cellxi * this.h;
			const celly = cellyi * this.h;

			const dxi = cellx - obstacleX;
			const dyi = celly - obstacleY;
			const d2 = dxi * dxi + dyi * dyi;

			if (d2 >= minDist2) continue;

			// Heat particle
			this.pTemp[i] += heatingRate;

			// Convert ice to water
			if (this.pTemp[i] < 0) {
				continue;
			}

			let cellId = cellxi * this.NumCellY + cellyi;
			if (this.cellType[cellId] !== ICE_CELL) {
				continue;
			}
			this.cell[cellId] = 1.0;
			this.cellType[cellId] = FLUID_CELL;
			this.cellTemp[cellId] = 0;
		}
		// Update particle type
		for (var i = 0; i < this.numParticles; i++) {
			if (this.pType[i]) continue;

			const x = this.pPosition[2 * i];
			const y = this.pPosition[2 * i + 1];

			const cellxi = Math.floor(x * this.cellInvSpacing);
			const cellyi = Math.floor(y * this.cellInvSpacing);

			if (this.cellType[cellxi * this.NumCellY + cellyi] == FLUID_CELL) {
				this.pType[i] = 1.0;
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

		for (var i = 0; i < this.numParticles; i++) {
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
			if (this.cellType[i] !== FLUID_CELL) {
				continue;
			}
			const temp = this.cellTemp[i];
			const tempFactor = 1.0 + expansionCoeff * (temp - tempRef); // IDK why the sign is flipped for it to work
			d[i] *= tempFactor;
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

			for (var i = 0; i < this.numParticles; i++) {
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

			for (var i = 0; i < this.numParticles; i++) {
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

		for (let i = 0; i < this.numParticles; i++) {
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
			} else if (this.cellType[i] === ICE_CELL) {
				this.cellTemp[i] = tempRef;
			}
		}
	}

	updateTemperature() {
		for (let i = 0; i < this.numParticles; i++) {
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

	calculateDepth() {
		for (let i = 0; i < this.NumCellX; i++) {
			let depth = 0; // Initialise depth for the current column
			for (let j = this.NumCellY - 1; j >= 0; j--) {
				const cellId = i * this.NumCellY + j;

				// If the current cell is not a fluid cell, reset depth
				if (this.cellType[cellId] !== FLUID_CELL) {
					this.cellDepth[cellId] = 0;
					depth = Math.max(depth - 1, 0);
				} else {
					// Otherwise, increment depth and assign it
					depth++;
					this.cellDepth[cellId] = depth;
				}
			}
		}
	}

	calculateMeanTemp() {
		let sum = 0.0;
		let count = 0.0;
		for (var i = 0; i < this.fNumCells; i++) {
			if (this.cellType[i] == FLUID_CELL) {
				sum += this.cellTemp[i];
				count++;
			}
		}

		if (count > 0) {
			this.meanTemp = sum / count;
		} else {
			this.meanTemp = tempRef;
		}
		// console.log("Mean temp (sim):", scene.fluid.meanTemp);
	}


	simulate(dt, gravity, flipRatio, numPressureIters, numParticleIters, overRelaxation, compensateDrift, separateParticles, obstacleX, obstacleY, obstacleRadius) {
		var numSubSteps = 1;
		var sdt = dt / numSubSteps;

		for (var step = 0; step < numSubSteps; step++) {
			this.integrateParticles(sdt, gravity);
			if (separateParticles)
				this.pushParticlesApart(numParticleIters);
			this.handleParticleCollisions()
			this.transferVelocities(true);
			this.sampleTemperature();
			this.diffuseTemperature(sdt, 20.0);
			this.updateTemperature();
			if (mouseDown && !draggingSeaLevel) {
				this.heatWater(obstacleX, obstacleY, obstacleRadius); // Heat water particles near the obstacle
			}
			this.updatepDensity();
			this.solveIncompressibility(numPressureIters, sdt, overRelaxation, compensateDrift);
			this.transferVelocities(false, flipRatio);
		}

		this.calculateDepth();
		this.calculateMeanTemp();

	}
}

function updateFish() {
	const f = scene.fluid;
	const NumCellX = f.NumCellX;
	const NumCellY = f.NumCellY;
	const now = performance.now();


	if (fishMustFollowMouse) {
		fishTargetXi = mouseXi;
		fishTargetYi = mouseYi;
	} else {
		const needNewTarget = (now - lastTargetSetTime > TARGET_UPDATE_INTERVAL);

		if (needNewTarget) {
			const shouldChaseMouse = (now - lastMouseMoveTime < TARGET_UPDATE_INTERVAL * 2) && !mouseDown;
			// Chase target near mouse
			const dx = Math.floor((Math.random() - 0.5) * 4 * TARGET_OFFSET_RANGE) * ((now - lastMouseMoveTime) / TARGET_UPDATE_INTERVAL % 6);
			const dy = Math.floor((Math.random() - 0.5) * 4 * TARGET_OFFSET_RANGE) * ((now - lastMouseMoveTime) / TARGET_UPDATE_INTERVAL % 6);

			if (shouldChaseMouse) {
				fishTargetXi = Math.max(0, Math.min(NumCellX - 1, mouseXi + dx));
				fishTargetYi = Math.max(0, Math.min(NumCellY - 1, mouseYi + dy));
			} else {
				// console.log("Fish returning to home");
				fishTargetXi = Math.max(0, Math.min(NumCellX - 1, fishHomeXi + dx));
				fishTargetYi = Math.max(0, Math.min(NumCellY - 1, fishHomeYi + dy));
			}

			lastTargetSetTime = now;
		}
	}
	let dx = fishTargetXi - fishXi;
	let dy = fishTargetYi - fishYi;

	const stepX = dx === 0 ? 0 : dx > 0 ? 1 : -1;
	// Probability of moving in Y direction depends on the tangent of the path
	const stepY = dy / Math.abs(dy) * (Math.abs(dy) / Math.abs(dx) > Math.tan(Math.random() * Math.PI / 2) ? 1 : 0);

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

function updateCoralHealth(maxCoralDepth = 60) {
	const f = scene.fluid;

	for (let coralGroup of corals) {
		for (let coralCell of coralGroup) {
			const { xi, yi } = coralCell;
			const idx = xi * f.NumCellY + yi;

			let damage = 0;
			if (f.cellTemp[idx] > tempRef + 2) damage += 0.005 * (f.cellTemp[idx] - (tempRef + 2)); // higher temp = more damage
			if (f.cellDepth[idx] > maxCoralDepth) damage += 0.005 * (f.cellDepth[idx] - 10); // deeper = less light

			// Apply and clamp health
			coralCell.health = Math.max(0, coralCell.health - damage * scene.dt * 10);
		}
	}
}


function simulate() {
	if (!scene.paused) {
		scene.fluid.simulate(
			scene.dt, scene.gravity, scene.flipRatio, scene.numPressureIters, scene.numParticleIters,
			scene.overRelaxation, scene.compensateDrift, scene.separateParticles,
			scene.obstacleX, scene.obstacleY, scene.obstacleRadius, scene.colorFieldNr);

		updateCoralHealth();
		if (scene.frameNr % 3 == 0) updateFish();
	}
	scene.frameNr++;
}

function update() {
	simulate();
	draw();
	requestAnimationFrame(update);
}


setupScene();
update();