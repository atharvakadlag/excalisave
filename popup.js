const websiteName = 'https://excalidraw.com/';

chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const tabId = tabs[0].id;
    chrome.scripting.executeScript({
        target: {tabId: tabId},
        func: () => {
            const value = localStorage.getItem("excalidraw");
            // send the value back to the extension
            chrome.runtime.sendMessage({key: "excalidraw", value: value});
        }
    });
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.key === "excalidraw") {
        const value = message.value;
        // handle the value
        console.log(value);
        chrome.storage.local.set({excalidraw: value}, function() {
            console.log("Value set in local storage");
        });
    }
});

document.getElementById("save-button").addEventListener("click", () => {
    const name = document.getElementById("drawing-name").value;
    chrome.storage.local.get('excalidraw', function(data) {
        console.log('Value of myKey:', data["excalidraw"]);
        const item = {};
        item[name] = data["excalidraw"];
        chrome.storage.local.set(item, function () {
            console.log('Settings saved');
        });
    });
});


document.getElementById("reload-button").addEventListener("click", () => {
    chrome.storage.local.get(null, function(items) {
        var allKeys = Object.keys(items);
        // Get the parent element where the list will be appended
        const parentElement = document.getElementById("parent");
        parentElement.innerHTML = "";

        // Create an unordered list element
        const ul = document.createElement("ul");

        // Loop through the allKeys and create list items
        for (let i = 0; i < allKeys.length; i++) {
            const li = document.createElement("li"); // Create a list item element
            li.textContent = allKeys[i]; // Set the text content of the list item
            ul.appendChild(li); // Append the list item to the unordered list element
        }

        // Append the unordered list to the parent element
        parentElement.appendChild(ul);

        const li_objects = document.querySelectorAll("li")

        for (let i = 0; i < li_objects.length; i++) {
            li_objects[i].addEventListener("click", function() {
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    const tabId = tabs[0].id;
                    const value = items[allKeys[i]];
                    chrome.scripting.executeScript({
                        target: {tabId: tabId},
                        func: (value) => {
                            localStorage.setItem("excalidraw", value);
                        },
                        args: [value]
                    });
                });
            });
        }
    });
});
