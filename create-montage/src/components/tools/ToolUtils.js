import { BinTypes } from "../constants/BinTypes";
import { ToolTypes } from "../constants/ToolTypes";
import { isMontage } from "../artworks/ArtworkUtils";

export const isTitle = item => item.type === BinTypes.TOOL && item.toolType === ToolTypes.TITLE
export const isFunctionTool = item => item.type === BinTypes.TOOL && item.toolType !== ToolTypes.TITLE
export const toolIsZoomAndPan = item => item.type === BinTypes.TOOL && item.toolType === ToolTypes.ZOOM_AND_PAN
export const toolIsSpaceImage = item => item.type === BinTypes.TOOL && item.toolType === ToolTypes.SPACE_IMAGE
export const isMultiTrackMontage = artwork => isMontage(artwork) && parseInt(artwork.tracks) > 1
export const constructDefaultTitleElement = () => {
    return {
        nextCount: 0,
        previousCount: 1,
        displayTitle: true,
        displayAuthor: true,
        displayDatation: false,
        displayDescription: false,
        displayCredits: false,
        font: 'sans-serif',
        size: 'regular',
        halign: "center",
        valign: "center",
        duration: '5',
        backgroundColor: 'FFFFFF',
        color: '000000'
    }
}
export const constructDefaultZoomAndPan = () => {
    return {
        start: {
            from: "top-left",
            scale: 100,
            scaleDirection: "height"
        },
        end: {
            to: "centre",
            scale: 100,
            scaleDirection: "height"
        },
        type: "constant"
    }
}
export const constructDefaultSpaceImageProperties = (trackIndex) => {
    return {
        targetTrack: null,
        source: true,
        destination: true,
        type: 'portrait',
        resolution: 'HD',
        sizeInPixelsX: 6000,
        sizeInPixelsY: 4000,
        offsetTop: 0,
        offsetLeft: 0
    }
}

export const constructDefaultAlphaChannelInsertProperties = () => {
    return {
        source: [],
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0,
        zIndex: 0
    }
}