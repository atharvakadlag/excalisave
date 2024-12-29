import { browser } from "webextension-polyfill-ts";
import { DrawingStore } from "../lib/drawing-store";
import { XLogger } from "../lib/logger";

const addOverwriteAction = () => {
    const overwriteActionsDiv = document.querySelector('.OverwriteConfirm__Actions');
    const excalisaveButton = document.querySelector('.overwriteconfirm_excalisave');
    if (!overwriteActionsDiv || excalisaveButton) {
        return;
    }

    XLogger.info('OverwriteConfirm__Actions found');
    // create new div from html string
    // <button
    //     class="ExcButton ExcButton--color-muted ExcButton--variant-outlined ExcButton--size-large ExcButton--status-undefined ExcButton--fullWidth"
    //     type="button" aria - label="Save to Excalisave">
    //     <div class="ExcButton__contents"> Save to Excalisave </div>
    // </button>
    // create button from above html
    const newButton = document.createElement('button');
    newButton.innerHTML = `
        <div class="ExcButton__contents"> Save to Excalisave </div>
    `;
    // add new class to button
    newButton.classList.add('ExcButton');
    newButton.classList.add('ExcButton--color-muted');
    newButton.classList.add('ExcButton--variant-outlined');
    newButton.classList.add('ExcButton--size-large');
    newButton.classList.add('ExcButton--status-undefined');
    newButton.classList.add('ExcButton--fullWidth');
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
            },
        });

        // body > div.excalidraw.excalidraw-modal-container > div > div.Modal__content > div > div > div > div.OverwriteConfirm__Description.OverwriteConfirm__Description--color-danger > button
        // click on save button

        var elem = document.querySelector("body > div.excalidraw.excalidraw-modal-container > div > div.Modal__content > div > div > div > div.OverwriteConfirm__Description.OverwriteConfirm__Description--color-danger > button") as HTMLButtonElement;
        // convert elem into button
        elem.click();
        XLogger.log('Replace to Excalisave button clicked');
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