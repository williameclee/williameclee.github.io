var canvas = document.getElementById("fluid-box");
var c = canvas.getContext("2d");	
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	canvas.focus();

	var simHeight = 1.0;	
	var cScale = canvas.height / simHeight;
	var simWidth = canvas.width / cScale;

	var U_FIELD = 0;
	var V_FIELD = 1;
	var S_FIELD = 2;

	var cnt = 0;

	function cX(x) {
		return x * cScale;
	}

	function cY(y) {
		return canvas.height - y * cScale;
	}

	// ----------------- start of simulator ------------------------------

	class Fluid {
		constructor(density, Nx, Ny, h) {
			this.density = density;
			this.Nx = Nx + 2; 
			this.Ny = Ny + 2;
			this.NN = this.Nx * this.Ny;
			this.h = h;
			this.u = new Float32Array(this.NN);
			this.v = new Float32Array(this.NN);
			this.newU = new Float32Array(this.NN);
			this.newV = new Float32Array(this.NN);
			this.p = new Float32Array(this.NN);
			this.div = new Float32Array(this.NN);
			this.s = new Float32Array(this.NN);
			this.m = new Float32Array(this.NN);
			this.newM = new Float32Array(this.NN);
			this.m.fill(1.0)
		}

		integrate(dt, gravity) {
			var n = this.Ny;
			for (var i = 1; i < this.Nx; i++) {
				for (var j = 1; j < this.Ny-1; j++) {
					if (this.s[i*n + j] != 0.0 && this.s[i*n + j-1] != 0.0)
						this.v[i*n + j] += gravity * dt;
				}	 
			}
		}

		boundary(F,bc_flag) {
			var n = this.Ny;
			for (var j = 1; j < this.Ny; j++) {
				F[0*n + j]           = bc_flag==1 ? -F[1*n + j]           : F[1*n + j];
				F[(this.Nx-1)*n + j] = bc_flag==1 ? -F[(this.Nx-2)*n + j] : F[(this.Nx-2)*n + j];
			}
			for (var i = 1; i < this.Nx; i++) {
				F[i*n + 0]         = bc_flag==2 ? -F[i*n + 1]         : F[i*n + 1];
				F[i*n + this.Ny-1] = bc_flag==2 ? -F[i*n + this.Ny-2] : F[i*n + this.Ny-2];
			}
			F[0*n + 0]                     = 0.5*(F[1*n + 0] + F[0*n + 1]);
			F[0*n + this.Ny-1]             = 0.5*(F[1*n + this.Ny-1] + F[0*n + this.Ny-2]);
			F[(this.Nx-1)*n + 0]           = 0.5*(F[(this.Nx-2)*n + 0] + F[(this.Nx-1)*n + 1]);
			F[(this.Nx-1)*n + (this.Ny-1)] = 0.5*(F[(this.Nx-2)*n + this.Ny-1] + F[(this.Nx-2)*n + this.Ny-2]);
		}

		extrapolate() {
			var n = this.Ny;
			for (var i = 0; i < this.Nx; i++) {
				this.u[i*n + 0] = this.u[i*n + 1];
				this.u[i*n + this.Ny-1] = this.u[i*n + this.Ny-2]; 
			}
			for (var j = 0; j < this.Ny; j++) {
				this.v[0*n + j] = this.v[1*n + j];
				this.v[(this.Nx-1)*n + j] = this.v[(this.Nx-2)*n + j] 
			}
		}

		project(K, Dt) {

			var n = this.Ny;
			var cp = this.density * this.h / Dt;

			for (var k = 0; k < K; k++) {

				for (var i = 1; i < this.Nx-1; i++) {
					for (var j = 1; j < this.Ny-1; j++) {

						if (this.s[i*n + j] == 0.0)
							continue;

						var s = this.s[i*n + j];
						var sx0 = this.s[(i-1)*n + j];
						var sx1 = this.s[(i+1)*n + j];
						var sy0 = this.s[i*n + j-1];
						var sy1 = this.s[i*n + j+1];
						var s = sx0 + sx1 + sy0 + sy1;
						if (s == 0.0)
							continue;

						var div = this.u[(i+1)*n + j] - this.u[i*n + j] + 
							this.v[i*n + j+1] - this.v[i*n + j];

						var p = -div / s;
						p *= scene.overRelaxation;
						this.p[i*n + j] += cp * p;

						this.u[i*n + j] -= sx0 * p;
						this.u[(i+1)*n + j] += sx1 * p;
						this.v[i*n + j] -= sy0 * p;
						this.v[i*n + j+1] += sy1 * p;
					}
				}
			}
			this.boundary(this.u,1);
			this.boundary(this.v,2);
		}
		// project(U,V,P,Div,K) {
		// 	var n = this.Ny;
		// 	var hh = 1.0/(n-2);
		// 	var Ux = 0; var Vy = 0;
		// 	for (var i = 1; i < this.Nx-1; i++) {
		// 		for (var j = 1; j < this.Ny-1; j++) {
		// 			if (this.s[i*n + j] != 0.0) {
		// 				// Div[i*n + j] = -(+ U[(i+1)*n + j-1] + 2*U[(i+1)*n + j  ] + U[(i+1)*n + j+1] 
		// 				// 	             - U[(i-1)*n + j-1] - 2*U[(i-1)*n + j  ] - U[(i-1)*n + j+1]
		// 				// 				 + V[(i-1)*n + j+1] + 2*V[(i  )*n + j+1] + V[(i+1)*n + j+1] 
		// 				// 	        	 - V[(i-1)*n + j-1] - 2*V[(i  )*n - j-1] - V[(i+1)*n + j-1])/8;
		// 				// Ux = (+ U[(i+1)*n + j-1] + 2*U[(i+1)*n + j  ] + U[(i+1)*n + j+1] 
		// 				// 	  - U[(i-1)*n + j-1] - 2*U[(i-1)*n + j  ] - U[(i-1)*n + j+1])/8;
		// 				// Vy = (+ V[(i-1)*n + j+1] + 2*V[(i  )*n + j+1] + V[(i+1)*n + j+1] 
		// 				// 	  - V[(i-1)*n + j-1] - 2*V[(i  )*n - j-1] - V[(i+1)*n + j-1])/8;
		// 				// Div[i*n + j] = -(Ux+Vy);
		// 				Div[i*n + j] = -(U[((i+1)*n + j)] - U[(i-1)*n + j] + V[(i*n + j+1)] - V[i*n + j-1])/2*hh;
		// 			}
		// 		}
		// 	}
		// 	this.boundary(Div,0); 
		// 	P.fill(0.0);
		// 	this.boundary(P,0); 
		// 	for (var k = 0; k < K; k++) {
		// 		for (var i = 1; i < this.Nx-1; i++) {
		// 			for (var j = 1; j < this.Ny-1; j++) {
		// 				if (this.s[i*n + j] != 0.0) {
		// 					// P[i*n + j] = (
		// 					// 	1 * (P[(i-1)*n + j-1] + P[(i+1)*n + j-1] + P[(i-1)*n + j+1] + P[(i+1)*n + j+1]) + 
		// 					// 	4 * (P[(i-1)*n + j  ] + P[i    *n  +j-1] + P[i    *n + j+1] + P[(i+1)*n + j  ]) +
		// 					// 	6 * Div[i*n + j])/20;
		// 					P[i*n + j] = (Div[i*n + j] + P[(i-1)*n + j] + P[(i+1)*n + j] + P[i*n + j-1] + P[i*n + j+1])/4;
		// 				}
		// 			}
		// 		}
		// 		this.boundary(P,0);
		// 	}
		// 	for (var i = 1; i < this.Nx-1; i++) {
		// 		for (var j = 1; j < this.Ny-1; j++) {
		// 			if (this.s[i*n + j] != 0.0) {
		// 				// U[i*n + j] -= (+ P[(i+1)*n + j-1] + 2*P[(i+1)*n + j  ] + P[(i+1)*n + j+1] 
		// 				// 			   - P[(i-1)*n + j-1] - 2*P[(i-1)*n + j  ] - P[(i-1)*n + j+1])/8;
		// 				// V[i*n + j] -= (+ P[(i+1)*n + j+1] + 2*P[(i  )*n + j+1] + P[(i-1)*n + j+1]
		// 				// 			   - P[(i+1)*n + j-1] - 2*P[(i  )*n + j-1] - P[(i-1)*n + j-1])/8;
		// 				U[i*n + j] -= 0.5*(P[((i+1)*n + j)] - P[(i-1)*n + j])/hh;
		// 				V[i*n + j] -= 0.5*(P[(i*n + j+1)] - P[i*n + j-1])/hh;
		// 			}
		// 		}
		// 	}
		// 	this.boundary(U,1);
		// 	this.boundary(V,2);
		// }

		advect(Rho_next,Rho,U,V,Dt,bc_flag) {
			Rho_next.set(Rho);
			var n = this.Ny;
			var Dx = this.h;

			for (var i = 1; i < this.Nx-1; i++) {
				for (var j = 1; j < this.Ny-1; j++) {
					
					if (this.s[i*n + j] != 0.0) {
						var i_prev = i - Dt/Dx*U[i*n + j];
						var j_prev = j - Dt/Dx*V[i*n + j];
						i_prev = Math.min(Math.max(i_prev,0.5),this.Nx-1.5);
						j_prev = Math.min(Math.max(j_prev,0.5),this.Ny-1.5);
						var i0 = Math.floor(i_prev); var i1 = i0+1;
						var j0 = Math.floor(j_prev); var j1 = j0+1;
						var s1 = i_prev-i0; 
						var t1 = j_prev-j0;
						var s0 = 1.0 - s1;
						var t0 = 1.0 - t1;

						Rho_next[i*n + j] = s0*t0 * Rho[i0*n + j0] + s1*t0 * Rho[i1*n + j0] 
							+ s1*t1 * Rho[i1*n + j1] + s0*t1 * Rho[i0*n + j1];
 					}
				}	 
			}
			this.boundary(Rho_next,bc_flag);
			Rho.set(Rho_next);
		}

		// ----------------- end of simulator ------------------------------


		simulate(Dt, gravity, numIters) {

			this.integrate(Dt, gravity);

			this.p.fill(0.0);
			// this.project(this.u,this.v,this.p,this.div,numIters);
			this.project(numIters,Dt);

			// this.extrapolate();
			this.advect(this.newU,this.u,this.u,this.v,Dt,1);
			this.advect(this.newV,this.v,this.u,this.v,Dt,2);
			this.advect(this.newM,this.m,this.u,this.v,Dt,0);
		}
	}

	var scene = 
	{
		gravity : 0.0, //-9.81,
		dt :  1.0 / 60.0,
		numIters : 40,
		frameNr : 0,
		overRelaxation : 1.9,
		obstacleX : 0.0,
		obstacleY : 0.0,
		obstacleRadius: 0.05,
		paused: false,
		sceneNr: 2,
		showObstacle: false,
		showSmoke: true,
		fluid: null,
	};

	var res = 100;

	var Ly = 1.0;
	var Lx = Ly / simHeight * simWidth;
	var Dx = Ly / res;

	var Nx = Math.ceil(Lx / Dx);
	var Ny = Math.ceil(Ly / Dx);

	var rho0 = 1000.0;

	function setupScene() 
	{
		f = scene.fluid = new Fluid(rho0, Nx, Ny, Dx);
	}


	// draw -------------------------------------------------------

	// function setColor(r,g,b) {
	// 	c.fillStyle = `rgb(
	// 		${Math.floor(255*r)},
	// 		${Math.floor(255*g)},
	// 		${Math.floor(255*b)})`
	// 	c.strokeStyle = `rgb(
	// 		${Math.floor(255*r)},
	// 		${Math.floor(255*g)},
	// 		${Math.floor(255*b)})`
	// }

	function getSciColor(val, minVal, maxVal) {
		val = Math.min(Math.max(val, minVal), maxVal);
		var d = maxVal - minVal;
		val = d == 0.0 ? 0 : (val - minVal) / d;
		// var m = 0.25;
		// var num = Math.floor(val / m);
		// var s = (val - num * m) / m;
		// var r, g, b;

		// switch (num) {
		// 	case 0 : r = 1.0; g = s; b = 1.0; break;
		// 	case 1 : r = 0.0; g = 1.0; b = 1.0-s; break;
		// 	case 2 : r = s; g = 1.0; b = 0.0; break;
		// 	case 3 : r = 1.0; g = 1.0 - s; b = 0.0; break;
		// }
		// return[255*r,255*g,255*b, 255]

		var s, r, g, b;
		if (val <= 1.0/16*4) {
			s = val / (1.0/16*4);
			r = (1-s) * 255 + s * 229;
			g = (1-s) * 244 + s * 168;
			b = (1-s) * 217 + s * 109;
		} else if (val <= 1.0/16*7) {
			s = (val-1.0/16*4) / (1.0/16*3);
			r = (1-s) * 229 + s * 145;
			g = (1-s) * 168 + s * 138;
			b = (1-s) * 109 + s * 127;
		} else if (val <= 1.0/16*11) {
			s = (val-1.0/16*7) / (1.0/16*4);
			r = (1-s) * 145 + s * 082;
			g = (1-s) * 138 + s * 105;
			b = (1-s) * 127 + s * 115;
		} else {
			s = (val-1.0/16*11) / (1.0/16*5);
			r = (1-s) * 082 + s * 015;
			g = (1-s) * 105 + s *  69;
			b = (1-s) * 115 + s * 080;
		}
		return[r,g,b, 255]
	}

	function draw() 
	{
		c.clearRect(0, 0, canvas.width, canvas.height);

		c.fillStyle = "#FF0000";
		f = scene.fluid;
		n = f.Ny;

		var cellScale = 1.0;

		var h = f.h;

		id = c.getImageData(0,0, canvas.width, canvas.height)

		var color = [255, 255, 255, 255]

		for (var i = 0; i < f.Nx; i++) {
			for (var j = 0; j < f.Ny; j++) {
					var rho = f.m[i*n + j];
					color = getSciColor(rho, 0.0, 1.0);

				var x = Math.floor(cX((i-1) * h));
				var y = Math.floor(cY((j) * h));
				var cx = Math.floor(cScale * cellScale * h) + 1;
				var cy = Math.floor(cScale * cellScale * h) + 1;

				r = color[0];
				g = color[1];
				b = color[2];

				for (var yi = y; yi < y + cy; yi++) {
					var p = 4 * (yi * canvas.width + x)

					for (var xi = 0; xi < cx; xi++) {
						id.data[p++] = r;
						id.data[p++] = g;
						id.data[p++] = b;
						id.data[p++] = 255;
					}
				}
			}
		}

		c.putImageData(id, 0, 0);
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
		var n = f.Ny;
		// var cd = Math.sqrt(2) * f.h;

		for (var i = 1; i < f.Nx-2; i++) {
			for (var j = 1; j < f.Ny-2; j++) {

				f.s[i*n + j] = 1.0;

				dx = (i + 0.5) * f.h - x;
				dy = (j + 0.5) * f.h - y;

				if (dx * dx + dy * dy < r * r) {
					f.s[i*n + j] = 0.0;
					// f.m[i*n + j] = 0.5 + 0.5 * Math.sin(0.1 * scene.frameNr);
					f.m[i*n + j] =0.0;
					f.u[i*n + j] = vx;
					f.u[(i+1)*n + j] = vx;
					f.v[i*n + j] = vy;
					f.v[i*n + j+1] = vy;
				}
			}
		}
		
		scene.showObstacle = true;
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

		setObstacle(x,y, true);
	}

	function drag(x, y) {
		if (mouseDown) {
			let bounds = canvas.getBoundingClientRect();
			let mx = x - bounds.left - canvas.clientLeft;
			let my = y - bounds.top - canvas.clientTop;
			x = mx / cScale;
			y = (canvas.height - my) / cScale;
			setObstacle(x,y, false);
		}
	}

	function endDrag() {
		mouseDown = false;
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
	}, { passive: false});


	document.addEventListener('keydown', event => {
		switch(event.key) {
			case 'p': scene.paused = !scene.paused; break;
			case 'f': scene.paused = false; simulate(); scene.paused = true; break;
		}
	});

	function toggleStart()
	{
		var button = document.getElementById('startButton');
		if (scene.paused)
			button.innerHTML = "Stop";
		else
			button.innerHTML = "Start";
		scene.paused = !scene.paused;
	}

	// main -------------------------------------------------------

	function simulate() 
	{
		if (!scene.paused)
			scene.fluid.simulate(scene.dt, scene.gravity, scene.numIters)
			// scene.frameNr++;
	}

	function update() {
		simulate();
		draw();
		requestAnimationFrame(update);
	}
	
	setupScene();
	update();