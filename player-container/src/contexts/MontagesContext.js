import { createContext } from "react";

export const BASE_THUMBNAIL_URL =
  "https://manager.wallmuse.com:8443/wallmuse/ws/get_artwork_thumbnail?version=1";

export const BaseThumbnailContext = createContext(BASE_THUMBNAIL_URL);
