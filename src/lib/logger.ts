import Logger from "js-logger";

Logger.useDefaults();
Logger.setLevel(
  process.env.NODE_ENV === "production" ? Logger.ERROR : Logger.DEBUG
);

export const XLogger = Logger;
