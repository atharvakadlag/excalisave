import JSZip from "jszip";
import { XLogger } from "../../../lib/logger";

export async function parseDataJSON(zip: JSZip) {
  try {
    const dataJSON = await zip.file("data.json")?.async("text");

    if (!dataJSON) {
      throw new Error("No data.json file found in zip");
    }

    return JSON.parse(dataJSON);
  } catch (error) {
    XLogger.error("Error parsing data.json", error);

    return undefined;
  }
}
