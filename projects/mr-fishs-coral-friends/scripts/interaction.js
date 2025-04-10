var mouseDown = false;

function startDrag(x, y) {
	let bounds = canvas.getBoundingClientRect();

	let mx = x - bounds.left - canvas.clientLeft;
	let my = y - bounds.top - canvas.clientTop;

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