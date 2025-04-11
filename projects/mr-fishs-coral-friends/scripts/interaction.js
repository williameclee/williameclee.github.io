var mouseDown = false;
var fishMustFollowMouse = false;


function startDrag(x, y) {
	const bounds = canvas.getBoundingClientRect();
	const mx = x - bounds.left - canvas.clientLeft;
	const my = y - bounds.top - canvas.clientTop;

	const simX = mx / cScale;
	const simY = (canvas.height - my) / cScale;

	const handleY = seaLevelLineYi / numCellY * simHeight;
	if (showSeaLevelLine && handleY - simY <= 0.1 && simX >= simWidth - 0.5) {
		console.log("dragging sea level");
		draggingSeaLevel = true;
		return;
	}

	mouseDown = true;
	draggingSeaLevel = false;
	setObstacle(simX, simY, true);
	scene.paused = false;
}

function drag(x, y) {
	if (mouseDown) {
		let bounds = canvas.getBoundingClientRect();
		let mx = x - bounds.left - canvas.clientLeft;
		let my = y - bounds.top - canvas.clientTop;
		x = mx / cScale;
		y = (canvas.height - my) / cScale;

		if (draggingSeaLevel) {
			seaLevelLineYi = Math.round(y / simHeight * numCellY);
			return;
		}
		setObstacle(x, y, false);
	}
}

function endDrag() {
	mouseDown = false;
	draggingSeaLevel = false;
	scene.obstacleVelX = 0.0;
	scene.obstacleVelY = 0.0;
}

canvas.addEventListener('mousedown', event => {
	mouseDown = true;
	startDrag(event.x, event.y);
});

canvas.addEventListener('mouseup', event => {
	mouseDown = false;
	endDrag();
});

canvas.addEventListener('mousemove', event => {
	drag(event.x, event.y);
});

canvas.addEventListener('touchstart', event => {
	mouseDown = true;
	startDrag(event.touches[0].clientX, event.touches[0].clientY)
});

canvas.addEventListener('touchend', event => {
	mouseDown = false;
	endDrag()
});

canvas.addEventListener('touchmove', event => {
	event.preventDefault();
	event.stopImmediatePropagation();
	drag(event.touches[0].clientX, event.touches[0].clientY)
}, { passive: false });


document.addEventListener('keydown', event => {
	switch (event.key) {
		case ' ': scene.paused = !scene.paused; break;
		case 'ArrowRight': scene.paused = false; simulate(); scene.paused = true; break;
		case 'n': scene.paused = false; simulate(); scene.paused = true; break;
		case 'c': showSeaLevelLine = !showSeaLevelLine; break;
		case 'f': fishMustFollowMouse = !fishMustFollowMouse; break;
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

canvas.addEventListener("mousemove", (e) => {
	const rect = canvas.getBoundingClientRect();
	const px = e.clientX - rect.left;
	const py = e.clientY - rect.top;

	const x = px / canvas.width * simWidth;
	const y = (canvas.height - py) / canvas.height * simHeight;

	const f = scene.fluid;
	mouseXi = Math.floor(x / f.h);
	mouseYi = Math.floor(y / f.h);

	if (mouseXi !== lastMouseXi || mouseYi !== lastMouseYi) {
		lastMouseXi = mouseXi;
		lastMouseYi = mouseYi;
		lastMouseMoveTime = performance.now();
	}
});