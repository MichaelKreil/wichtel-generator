// Theme preview on the start page
for (const radio of document.querySelectorAll('input[name="theme"]')) {
	radio.addEventListener('change', () => {
		document.body.dataset.theme = radio.value;
	});
}

// Share buttons for links, only where the device can share (mostly phones)
for (const button of document.querySelectorAll('[data-share]')) {
	if (!navigator.share) continue;
	button.hidden = false;
	button.addEventListener('click', () => {
		const url = button.closest('.copy').querySelector('input').value;
		navigator.share({ title: 'Wichteltopf', text: button.dataset.share, url }).catch(() => {});
	});
}

// Copy buttons for links
for (const button of document.querySelectorAll('[data-copy]')) {
	button.addEventListener('click', async () => {
		const input = button.closest('.copy').querySelector('input');
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
