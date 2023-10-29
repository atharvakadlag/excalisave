const websiteName = 'https://excalidraw.com/';

function get_confirm_message(drawing_name) {
    return (
        `Your current drawing will be overwritten by the drawing: ${drawing_name}.\n`+
        `Do you want to proceed?`
    )
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.key === "drawing-info") {
        const value = message.value;
        console.log(JSON.stringify(value));
        const drawing_name = value['name'];

        chrome.storage.local.set({[drawing_name]: value}, function() {
            console.log(`drawing-info for ${value['name']} set in local storage`);
        });
    }
});

document.getElementById("save-button").addEventListener("click", () => {
    const name = document.getElementById("drawing-name").value;
    save_drawing(name);
});


document.getElementById("reload-button").addEventListener("click", () => {
    chrome.storage.local.get(null, function(items) {
        var { li_objects, allKeys } = create_list(items);

        for (let i = 0; i < li_objects.length; i++) {
            const load_drawing = function (tabs) {
                const tabId = tabs[0].id;
                const value = items[allKeys[i]];
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: (value) => {
                        localStorage.setItem("excalidraw", value["excalidraw"]);
                        localStorage.setItem("excalidraw-state", value["excalidraw-state"]);
                        localStorage.setItem("version-files", value["version-files"]);
                        localStorage.setItem("version-dataState", value["version-dataState"]);
                        localStorage.setItem("name", value["name"]);
                        location.reload();
                    },
                    args: [value]
                });
            };

            li_objects[i].addEventListener("click", function() {
                // if (confirm(get_confirm_message(li_objects[i].textContent)))
                // {
                    chrome.tabs.query(
                        {active: true, currentWindow: true},
                        load_drawing,
                    );
                // }
            });
            li_objects[i].querySelector(".delete-btn").addEventListener("click", async function(e) {
               e.preventDefault();
               e.stopPropagation();

               const drawingName = items[allKeys[i]].name;
               if (confirm(`Are you sure you want to delete "${drawingName}" drawing?`)) {
                await chrome.storage.local.remove(drawingName)

                    // Removes li from popup
                    li_objects[i].remove();
               }
            });
        }
    });
});

const create_list = (items) => {
    var allKeys = Object.keys(items);

    // Get the parent element where the list will be appended
    const parentElement = document.getElementById("parent");
    parentElement.innerHTML = "";

    // Create an unordered list element
    const ul = document.createElement("ul");

    const template = document.getElementById("li_template")
    // Loop through the allKeys and create list items
    for (let i = 0; i < allKeys.length; i++) {
        const newLi = template.content.cloneNode(true); // Create a list item element from template
        newLi.querySelector("li > p").textContent = allKeys[i]; // Set the text content of the list item
        ul.appendChild(newLi); // Append the list item to the unordered list element
    }

    // Append the unordered list to the parent element
    parentElement.appendChild(ul);

    const li_objects = document.querySelectorAll("li");
    return { li_objects, allKeys };
}

function save_drawing(name) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const tabId = tabs[0].id;
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: (name) => {
                const drawing = localStorage.getItem("excalidraw");
                const excalidraw_state = localStorage.getItem("excalidraw-state");
                const version_files = localStorage.getItem("version-files");
                const version_dataState = localStorage.getItem("version-dataState");

                // send the value back to the extension
                chrome.runtime.sendMessage({
                    key: "drawing-info",
                    value: {
                        "excalidraw": drawing,
                        "excalidraw-state": excalidraw_state,
                        "version-files": version_files,
                        "version-dataState": version_dataState,
                        "name": name
                    }
                });
            },
            args: [name]
        });
    });
}

