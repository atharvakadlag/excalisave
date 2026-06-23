/**
 * Waits for an element matching the selector to appear in the DOM.
 * Uses MutationObserver for efficient detection - stops observing immediately once found.
 */
export function waitForElement(
  selector: string,
  timeout = 10000
): Promise<Element> {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout>;

    const observer = new MutationObserver((_, obs) => {
      const element = document.querySelector(selector);
      if (element) {
        clearTimeout(timeoutId);
        obs.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}
