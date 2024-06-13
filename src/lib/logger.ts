import Logger from "js-logger";

Logger.useDefaults();
Logger.setLevel(
  process.env.NODE_ENV === "production" ? Logger.WARN : Logger.DEBUG
);

export const XLogger = Logger;
