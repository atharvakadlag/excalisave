export const RandomUtils = {
  generateRandomId(): string {
    const randomId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      (char) => {
        const t = (16 * Math.random()) | 0;
        return (char == "x" ? t : (3 & t) | 8).toString(16);
      }
    );

    return randomId;
  },
};
