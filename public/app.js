// Theme preview on the start page
for (const radio of document.querySelectorAll('input[name="theme"]')) {
	radio.addEventListener('change', () => {
		document.body.dataset.theme = radio.value;
	});
}

// Copy buttons for links
for (const button of document.querySelectorAll('[data-copy]')) {
	button.addEventListener('click', async () => {
		const input = button.parentElement.querySelector('input');
		try {
			await navigator.clipboard.writeText(input.value);
			button.textContent = 'Kopiert ✓';
		} catch {
			input.select();
		}
	});
}

// Confirmation for destructive forms
for (const form of document.querySelectorAll('form[data-confirm]')) {
	form.addEventListener('submit', (event) => {
		if (!confirm(form.dataset.confirm)) event.preventDefault();
	});
}

// Snowfall
(() => {
	const canvas = document.getElementById('snow');
	if (!canvas || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	const ctx = canvas.getContext('2d');
	let width = 0;
	let height = 0;
	let flakes = [];

	function resize() {
		const dpr = window.devicePixelRatio || 1;
		width = canvas.clientWidth;
		height = canvas.clientHeight;
		canvas.width = width * dpr;
		canvas.height = height * dpr;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		const count = Math.round((width * height) / 12000);
		flakes = Array.from({ length: count }, () => newFlake(Math.random() * height));
	}

	function newFlake(y) {
		const r = 1 + Math.random() * 3;
		return { x: Math.random() * width, y, r, speed: 0.3 + r * 0.25, phase: Math.random() * Math.PI * 2 };
	}

	let last = performance.now();
	function frame(now) {
		const dt = Math.min(now - last, 50) / 16;
		last = now;
		ctx.clearRect(0, 0, width, height);
		ctx.fillStyle = 'rgb(255 255 255 / 0.8)';
		ctx.beginPath();
		for (const [i, f] of flakes.entries()) {
			f.y += f.speed * dt;
			f.phase += 0.01 * dt;
			const x = f.x + Math.sin(f.phase) * 20;
			if (f.y - f.r > height) flakes[i] = newFlake(-5);
			ctx.moveTo(x + f.r, f.y);
			ctx.arc(x, f.y, f.r, 0, Math.PI * 2);
		}
		ctx.fill();
		requestAnimationFrame(frame);
	}

	addEventListener('resize', resize);
	resize();
	requestAnimationFrame(frame);
})();
