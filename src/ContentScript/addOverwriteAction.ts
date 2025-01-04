import { browser } from 'webextension-polyfill-ts';
import { DrawingStore } from '../lib/drawing-store';
import { XLogger } from '../lib/logger';

const addOverwriteAction = () => {
	const overwriteActionsDiv = document.querySelector(
		'.OverwriteConfirm__Actions'
	);
	const excalisaveButton = document.querySelector(
		'.overwriteconfirm_excalisave'
	);
	if (!overwriteActionsDiv || excalisaveButton) {
		return;
	}

	XLogger.info('OverwriteConfirm__Actions found');
	// create a copy for the first div child of overwriteActionsDiv
	const newAction = overwriteActionsDiv.firstChild.cloneNode(
		true
	) as HTMLDivElement;
	// change the text of the first h4 child inside newAction
	newAction.querySelector('h4').textContent = 'Excalisave';
	const innerDiv = newAction.querySelector(
		'div.OverwriteConfirm__Actions__Action__content'
	) as HTMLDivElement;
	// change the text inside html div inside the button
	innerDiv.textContent = 'Save the current drawing as an excalisave drawing.';
	// add overwriteconfirm_excalisave class to innerDiv
	innerDiv.classList.add('overwriteconfirm_excalisave');

	// get the button inside newAction
	const newButton = newAction.querySelector('button');
	// change the text inside html div inside the button
	newButton.querySelector('div').textContent = 'Save to excalisave.';

	// add click event listener
	newButton.addEventListener('click', () => {
		// open extention popup and trigger onclick for save
		// get name input from alert
		const name = prompt('Enter name for the new drawing');

		// send MessageAutoSave message to background script
		browser.runtime.sendMessage({
			type: 'MessageAutoSave',
			payload: {
				name,
				setCurrent: false,
			},
		});

		var elem = document.querySelector(
			'body > div.excalidraw.excalidraw-modal-container > div > div.Modal__content > div > div > div > div.OverwriteConfirm__Description.OverwriteConfirm__Description--color-danger > button'
		) as HTMLButtonElement;
		// convert elem into button
		elem.click();

		browser.runtime.sendMessage({ type: 'ClearDrawingID' });
		XLogger.log('ClearDrawingID message sent');
	});
	const newDiv = document.createElement('div');
	newDiv.innerHTML = `
        <h4>Excalisave</h4>
        <div class="OverwriteConfirm__Actions__Action__content overwriteconfirm_excalisave">Save the current drawing as an excalisave drawing.</div>
    `;

	// add button to div
	newDiv.appendChild(newButton);

	// add new class to div
	newDiv.classList.add('OverwriteConfirm__Actions__Action');
	// add new div to overwriteActionsDiv at first position
	overwriteActionsDiv.insertBefore(newDiv, overwriteActionsDiv.firstChild);
};

// Optionally, you can set up a MutationObserver to watch for changes in the DOM
const observer = new MutationObserver((mutations) => {
	mutations.forEach(() => {
		addOverwriteAction();
	});
});

observer.observe(document.body, { childList: true, subtree: true });

const addButton = () => {
	const menuContainer = document.querySelector(
		'.Stack.Stack_vertical.App-menu_top__left'
	);
	// Check if button already exists
	const existingButton = document.querySelector('.excalisave-button');

	if (menuContainer && !existingButton) {
		// Apply flex styling to menu container
		menuContainer.setAttribute('style', 'display: flex; gap: 0.75rem;');

		// Create and add Excalisave button
		const buttonContainer = document.createElement('div');
		buttonContainer.className = 'top-right-ui';

		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'excalidraw-button collab-button excalisave-button'; // Added excalisave-button class
		button.title = 'Open Excalisave';
		button.style.position = 'relative';
		button.style.width = 'auto';
		button.textContent = 'Excalisave';

		// Add click handler to open popup
		button.addEventListener('click', () => {
			browser.runtime.sendMessage({ type: 'OpenPopup' });
		});

		buttonContainer.appendChild(button);
		menuContainer.appendChild(buttonContainer);
	}
};

// Remove the setTimeout call and just use the load event
window.addEventListener('load', addButton);
