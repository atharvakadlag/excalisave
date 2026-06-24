import {browser} from "webextension-polyfill-ts";
import {BackgroundMessage, MessageType} from "../constants/message.types";
import {IDrawing} from "../interfaces/drawing.interface";
import {XLogger} from "../lib/logger";
import {IdUtils} from "../lib/utils/id.utils";
import {getDefaultDrawingName} from "../lib/utils/date.utils";
import {TabUtils} from "../lib/utils/tab.utils";
import {GitHubConfigService} from "../services/github/gitHubConfig.service";
import {SyncService} from "../services/sync.service";
import {FragmentHandlerRegistry} from "./urlFragmentHandler";
import {searchDrawings} from "../services/search.service";

// Initialize services
const syncService = SyncService.getInstance();
const githubConfigService = GitHubConfigService.getInstance();

// URL Fragment Handler
const fragmentRegistry = new FragmentHandlerRegistry();

function isExcalidrawOrigin(url: string): boolean {
    try {
        return new URL(url).origin === "https://excalidraw.com";
    } catch {
        return false;
    }
}

// Register #json= shared link handler
fragmentRegistry.register({
    pattern: /^#json=([^,]+),(.+)$/,
    handler: async (tabId, _match) => {
        XLogger.log(`[SharedLink] Detected shared link on tab ${tabId}`);
        await browser.scripting.executeScript({
            target: {tabId},
            files: ["./js/execute-scripts/shared-link-import.bundle.js"],
        });
    },
});

// Register #room= live collaboration handler
fragmentRegistry.register({
    pattern: /^#room=([^,]+),(.+)$/,
    handler: async (tabId, _match) => {
        XLogger.log(`[RoomJoin] Detected room link on tab ${tabId}`);
        await browser.scripting.executeScript({
            target: {tabId},
            files: ["./js/execute-scripts/room-join.bundle.js"],
        });
    },
});

// Listen for URL changes on Excalidraw tabs
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url && isExcalidrawOrigin(tab.url)) {
        fragmentRegistry.handleUrl(tabId, tab.url);
    }
});

// Clean up when tabs are closed
browser.tabs.onRemoved.addListener((tabId) => {
    fragmentRegistry.clearTab(tabId);
});

browser.runtime.onInstalled.addListener(async () => {
    XLogger.log("onInstalled...");

    for (const cs of (browser.runtime.getManifest() as any).content_scripts) {
        for (const tab of await browser.tabs.query({url: cs.matches})) {
            browser.scripting.executeScript({
                target: {tabId: tab.id},
                files: cs.js,
            });
        }
    }

});
browser.runtime.onMessage.addListener(
    async (message: BackgroundMessage, _sender: any): Promise<any> => {
        try {
            XLogger.log("Message background", message);
            if (!message || !message.type)
                return {success: false, error: "Invalid message"};

            switch (message.type) {
                case MessageType.OPEN_POPUP:
                    try {
                        await browser.action.openPopup();
                    } catch (popupError) {
                        XLogger.warn("[OPEN_POPUP] browser.action.openPopup() failed, using fallback window", popupError);
                        // Fallback: browser.action.openPopup() fails in Firefox when called
                        // from a message handler (user gesture context is lost).
                        // Open popup.html in a small popup window instead.
                        // Pass the originating tab ID so the popup can target the correct Excalidraw tab.
                        const senderTabId = _sender.tab?.id;
                        const popupUrl = senderTabId
                            ? browser.runtime.getURL(`popup.html?tabId=${senderTabId}`)
                            : browser.runtime.getURL("popup.html");
                        await browser.windows.create({
                            url: popupUrl,
                            type: "popup",
                            width: 400,
                            height: 600,
                        });
                    }
                    break;

                case MessageType.SAVE_NEW_DRAWING:
                    const drawing: IDrawing = {
                        id: message.payload.id,
                        name: message.payload.name,
                        sync: message.payload.sync ?? false,
                        createdAt: new Date().toISOString(),
                        imageBase64: message.payload.imageBase64,
                        viewBackgroundColor: message.payload.viewBackgroundColor,
                        data: {
                            excalidraw: message.payload.excalidraw,
                            excalidrawState: message.payload.excalidrawState,
                            versionFiles: message.payload.versionFiles,
                            versionDataState: message.payload.versionDataState,
                        },
                    };

                    await browser.storage.local.set({[message.payload.id]: drawing});
                    const saveResult = await syncService.updateDrawing(drawing);
                    return {success: saveResult.success};

                case MessageType.SAVE_DRAWING: {
                    const existentDrawing = (
                        await browser.storage.local.get(message.payload.id)
                    )[message.payload.id] as IDrawing;

                    if (!existentDrawing) {
                        XLogger.error("No drawing found with id", message.payload.id);
                        return {success: false, error: "No drawing found with id"};
                    }

                    const newData: IDrawing = {
                        ...existentDrawing,
                        name: message.payload.name ?? existentDrawing.name,
                        sync: message.payload.sync ?? existentDrawing.sync,
                        imageBase64:
                            message.payload.imageBase64 ?? existentDrawing.imageBase64,
                        viewBackgroundColor:
                            message.payload.viewBackgroundColor ??
                            existentDrawing.viewBackgroundColor,
                        data: {
                            excalidraw: message.payload.excalidraw,
                            excalidrawState: message.payload.excalidrawState,
                            versionFiles: message.payload.versionFiles,
                            versionDataState: message.payload.versionDataState,
                        },
                    };

                    await browser.storage.local.set({
                        [message.payload.id]: newData,
                    });

                    const updateResult = await syncService.updateDrawing(newData);
                    return {success: updateResult.success};
                }

                case MessageType.SYNC_DRAWING:
                    const drawingToSync = (
                        await browser.storage.local.get(message.payload.id)
                    )[message.payload.id] as IDrawing;

                    if (!drawingToSync) {
                        XLogger.error("No drawing found with id", message.payload.id);
                        return {success: false, error: "No drawing found with id"};
                    }

                    const syncResult = await syncService.updateDrawing(drawingToSync);
                    return {success: syncResult.success};

                case MessageType.DELETE_DRAWING:
                    XLogger.info("Deleting drawing", message.payload.id);

                    const drawingToDelete = (
                        await browser.storage.local.get(message.payload.id)
                    )[message.payload.id] as IDrawing;

                    if (!drawingToDelete) return {success: true};

                    await syncService.deleteDrawing(drawingToDelete);
                    return {success: true};

                case MessageType.CLEANUP_FILES:
                    XLogger.info("Cleaning up files");

                    const drawings = Object.values(
                        await browser.storage.local.get()
                    ).filter((o) => o?.id?.startsWith?.("drawing:"));

                    const imagesUsed = drawings
                        .map((drawing) => {
                            return JSON.parse(drawing.data.excalidraw).filter(
                                (item: any) => item.type === "image"
                            );
                        })
                        .flat()
                        .map<string>((item) => item?.fileId);

                    const uniqueImagesUsed = Array.from(new Set(imagesUsed));

                    XLogger.log("Used fileIds", uniqueImagesUsed);

                    // This workaround is to pass params to script, it's ugly, but it works
                    await browser.scripting.executeScript({
                        target: {
                            tabId: message.payload.tabId,
                        },
                        func: (fileIds: string[], executionTimestamp: number) => {
                            window.__SCRIPT_PARAMS__ = {fileIds, executionTimestamp};
                        },
                        args: [uniqueImagesUsed, message.payload.executionTimestamp],
                    });

                    await browser.scripting.executeScript({
                        target: {tabId: message.payload.tabId},
                        files: ["./js/execute-scripts/delete-unused-files.bundle.js"],
                    });

                    return {success: true};

                case MessageType.MESSAGE_AUTO_SAVE:
                    const name = message.payload.name;
                    const setCurrent = message.payload.setCurrent;
                    XLogger.log("Saving new drawing", {name});
                    const activeTab = await TabUtils.getActiveTab();

                    if (!activeTab) {
                        XLogger.warn("No active tab found");
                        return {success: false, error: "No active tab found"};
                    }

                    // doing this kind of breaks the auto syncing.
                    // There should be a proper check to see if the file already exist as a stored file
                    const id = IdUtils.createDrawingId();

                    // This workaround is to pass params to script, it's ugly, but it works
                    await browser.scripting.executeScript({
                        target: {tabId: activeTab.id},
                        func: (id, name, setCurrent) => {
                            window.__SCRIPT_PARAMS__ = {id, name, setCurrent};
                        },
                        args: [id, name, setCurrent],
                    });

                    await browser.scripting.executeScript({
                        target: {tabId: activeTab.id},
                        files: ["./js/execute-scripts/sendDrawingDataToSave.bundle.js"],
                    });

                    return {success: true};

                case MessageType.CONFIGURE_GITHUB_PROVIDER:
                    return await githubConfigService.configureGitHubProvider(
                        message.payload.token,
                        message.payload.repoOwner,
                        message.payload.repoName,
                        message.payload.drawingsToSync
                    );

                case MessageType.REMOVE_GITHUB_PROVIDER:
                    return await githubConfigService.removeGitHubProvider();

                case MessageType.GET_GITHUB_CONFIG:
                    return await githubConfigService.getGitHubConfig();

                case MessageType.CHECK_GITHUB_AUTH:
                    return await githubConfigService.checkGitHubAuth();

                case MessageType.DELETE_DRAWING_SYNC:
                    const drawingToDeleteSync = (
                        await browser.storage.local.get(message.payload.id)
                    )[message.payload.id] as IDrawing;
                    if (drawingToDeleteSync) {
                        await syncService.deleteDrawing(drawingToDeleteSync);
                    }
                    return {success: true};

                case MessageType.GET_CHANGE_HISTORY:
                    const changeHistory = await syncService.getChangeHistory(
                        message.payload?.limit
                    );

                    return {
                        success: true,
                        commits: changeHistory,
                    };

                case MessageType.LOAD_DRAWING: {
                    const drawingId = message.payload.id;

                    // 1. Determine the target tab: sender tab (content script) → active excalidraw tab (popup) → open a new tab
                    let loadTabId = _sender.tab?.id;

                    if (!loadTabId) {
                        const activeTab = await TabUtils.getActiveTab();
                        if (activeTab?.url && isExcalidrawOrigin(activeTab.url)) {
                            loadTabId = activeTab.id;
                        }
                    }

                    if (!loadTabId) {
                        // Check if any existing tab is already on an excalidraw page
                        const excalidrawTabs = await browser.tabs.query({url: "https://excalidraw.com/*"});

                        if (excalidrawTabs.length > 0 && excalidrawTabs[0].id) {
                            // Reuse existing excalidraw tab — focus it
                            loadTabId = excalidrawTabs[0].id;
                            await browser.tabs.update(loadTabId, {active: true});
                            if (excalidrawTabs[0].windowId) {
                                await browser.windows.update(excalidrawTabs[0].windowId, {focused: true});
                            }
                        } else {
                            // No excalidraw tab exists — open one
                            const result = await browser.storage.local.get(drawingId);
                            const drawingData = result[drawingId] as IDrawing | undefined;
                            const url = drawingData?.roomUrl || "https://excalidraw.com";

                            const newTab = await browser.tabs.create({url});

                            // Room URLs load directly, no script injection needed
                            if (drawingData?.roomUrl) {
                                return {success: true};
                            }

                            // Wait for the new tab to finish loading
                            await new Promise<void>((resolve) => {
                                const listener = (tabId: number, changeInfo: {status?: string}) => {
                                    if (tabId === newTab.id && changeInfo.status === "complete") {
                                        browser.tabs.onUpdated.removeListener(listener);
                                        resolve();
                                    }
                                };
                                browser.tabs.onUpdated.addListener(listener);
                            });

                            loadTabId = newTab.id;
                        }
                    }

                    await browser.scripting.executeScript({
                        target: {tabId: loadTabId},
                        func: (id: string) => {
                            window.__SCRIPT_PARAMS__ = {id};
                        },
                        args: [drawingId],
                    });

                    await browser.scripting.executeScript({
                        target: {tabId: loadTabId},
                        files: ["./js/execute-scripts/loadDrawing.bundle.js"],
                    });

                    return {success: true};
                }

                case MessageType.CREATE_NEW_DRAWING: {
                    const newDrawingTabId = _sender.tab?.id;
                    if (!newDrawingTabId)
                        return {success: false, error: "No sender tab ID"};

                    const newDrawingId = IdUtils.createDrawingId();
                    const newDrawingName = getDefaultDrawingName();

                    await browser.scripting.executeScript({
                        target: {tabId: newDrawingTabId},
                        func: (id: string, name: string) => {
                            window.__SCRIPT_PARAMS__ = {id, name};
                        },
                        args: [newDrawingId, newDrawingName],
                    });

                    await browser.scripting.executeScript({
                        target: {tabId: newDrawingTabId},
                        files: ["./js/execute-scripts/newDrawing.bundle.js"],
                    });

                    return {success: true};
                }

                case MessageType.GET_ALL_DRAWINGS:
                    const allDrawings = Object.values(
                        await browser.storage.local.get()
                    )
                        .filter((o) => o?.id?.startsWith?.("drawing:"))
                        .map((d) => ({id: d.id, name: d.name, createdAt: d.createdAt, roomUrl: d.roomUrl}));

                    return {success: true, drawings: allDrawings};

                case MessageType.SEARCH_DRAWINGS: {
                    const allStoredDrawings = Object.values(
                        await browser.storage.local.get()
                    ).filter((o) => o?.id?.startsWith?.("drawing:")) as IDrawing[];

                    const results = searchDrawings(
                        allStoredDrawings,
                        message.payload.query
                    );

                    return {
                        success: true,
                        drawings: results.map((d) => ({
                            id: d.id,
                            name: d.name,
                            createdAt: d.createdAt,
                            roomUrl: d.roomUrl,
                        })),
                    };
                }

                case MessageType.FIND_DRAWING_BY_ROOM_URL: {
                    const allData = await browser.storage.local.get();
                    const match = Object.values(allData).find(
                        (d) =>
                            d?.id?.startsWith?.("drawing:") &&
                            d.roomUrl === message.payload.roomUrl
                    ) as IDrawing | undefined;

                    return match
                        ? {success: true, drawing: {id: match.id, name: match.name}}
                        : {success: true, drawing: null};
                }

                case MessageType.SET_DRAWING_ROOM_URL: {
                    const existing = await browser.storage.local.get(message.payload.id);
                    const drawingToUpdate = existing[message.payload.id];
                    if (!drawingToUpdate) {
                        return {success: false, error: "Drawing not found"};
                    }
                    await browser.storage.local.set({
                        [message.payload.id]: {
                            ...drawingToUpdate,
                            roomUrl: message.payload.roomUrl,
                        },
                    });
                    return {success: true};
                }

                default:
                    return {success: false, error: "Unknown message type"};
            }
        } catch (error) {
            XLogger.error("Error on background message listener", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
);
