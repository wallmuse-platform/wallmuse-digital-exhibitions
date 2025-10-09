import { createContext } from 'react';

const baseThumbnailURL = 'https://manager.wallmuse.com:8443/wallmuse/ws/get_artwork_thumbnail?version=1'

export const BaseThumbnailContext = createContext(baseThumbnailURL);
