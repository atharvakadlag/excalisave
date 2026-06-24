import { XLogger } from "../lib/logger";

interface FragmentHandler {
  pattern: RegExp;
  handler: (tabId: number, match: RegExpMatchArray) => void;
}

export class FragmentHandlerRegistry {
  private handlers: FragmentHandler[] = [];
  private lastHandledUrls = new Map<number, string>();

  register(handler: FragmentHandler): void {
    this.handlers.push(handler);
  }

  handleUrl(tabId: number, url: string): void {
    const lastUrl = this.lastHandledUrls.get(tabId);
    if (lastUrl === url) return;

    let fragment: string;
    try {
      fragment = new URL(url).hash;
    } catch {
      return;
    }

    if (!fragment) return;

    for (const { pattern, handler } of this.handlers) {
      const match = fragment.match(pattern);
      if (match) {
        XLogger.log(`[FragmentHandler] Matched pattern ${pattern} on tab ${tabId}`);
        this.lastHandledUrls.set(tabId, url);
        handler(tabId, match);
        return;
      }
    }
  }

  /**
   * Clean up tracking for a closed tab.
   */
  clearTab(tabId: number): void {
    this.lastHandledUrls.delete(tabId);
  }
}
