import { BinTypes } from "../constants/BinTypes";
import { ArtworkTypes } from "../constants/ArtworkTypes";
import { OrientationTypes, ResolutionTypes } from "../constants/ArtworkProperties";

const DEFAULT_DURATION = 30;

export const getName = artwork => {
    // const uhdUrl = artwork.urls && artwork.urls.find(u => u.kind === "UHD")
    // if (uhdUrl && (uhdUrl.width >= 1920 * 2 || uhdUrl.height >= 1920 * 2)) {
    //     console.log(artwork)
    // }
    // const hdUrl = artwork.urls && artwork.urls.find(u => u.kind === "HD")
    // if (hdUrl && (hdUrl.width >= 1920 * 2 || hdUrl.height >= 1920 * 2)) {
    //     console.log(artwork)
    // }
    return isArtwork(artwork) ? artwork.display_title : (isMontage(artwork) ? artwork.name : "Title");
}

export const getArtworkDuration = artwork => {
    return typeof artwork.duration === 'undefined' ? DEFAULT_DURATION : parseFloat(artwork.duration);
}
export const getArtworkDurationInMillis = artwork => {
    return getArtworkDuration(artwork) * 1000;
}
export const constructDuration = durationInMillis => {
    const millisInDay = 86400000 // 24 * 60 * 60 * 1000;
    const days = Math.floor(durationInMillis / millisInDay);
    const remainderMillis = durationInMillis - (days * millisInDay)
    const totalHours = days * 24 + parseInt(new Date(remainderMillis).toISOString().slice(11, 13))
    return zeroPrefixedHours(totalHours) + ":" + new Date(remainderMillis).toISOString().slice(14, 23);
}

export const constructDurationForArtwork = artwork => {
    let durationInMillis = artwork.durationInMillis;
    if (typeof durationInMillis === 'undefined') {
        durationInMillis = getArtworkDurationInMillis(artwork);
    }
    return constructDuration(durationInMillis);
}

export const zeroPrefixedHours = hours => {
    return hours < 10 ? `0${hours}` : hours.toString();
}

export const isArtwork = artwork => artwork.tagName === BinTypes.ARTWORK;
export const artworkIsImage = artwork => artwork.type === ArtworkTypes.IMAGE;
export const artworkIsVideo = artwork => artwork.type === ArtworkTypes.VIDEO;

export const isMontage = artwork => artwork.tagName === BinTypes.MONTAGE;

export const calculateImageOrientationAndResolution = artwork => {
    if (artworkIsImage(artwork)) {
        calculateResolution(artwork);
        if (!artwork.maxResWidth || !artwork.maxResHeight) {
            console.warn("Width or height information for the artwork with this ID is missing:", artwork.id)
            return
        }
        if (artwork.maxResWidth >= artwork.maxResHeight) {
            artwork.orientation = OrientationTypes.LANDSCAPE;
        } else {
            artwork.orientation = OrientationTypes.PORTRAIT;
        }
        return;
    }
    console.error("Cannot calculate orientation of artwork that is not an image:", artwork.id);
}

const calculateResolution = artwork => {
    const urls = artwork.urls;
    if (!urls) {
        artwork.resolution = ResolutionTypes.SD
        return ResolutionTypes.SD;
    }
    const uhdUrl = urls.find(url => url.kind === ResolutionTypes.UHD);
    const hdUrl = urls.find(url => url.kind === ResolutionTypes.HD);
    const sdUrl = urls.find(url => url.kind === ResolutionTypes.SD);
    if (uhdUrl) {
        artwork.maxResWidth = uhdUrl.width;
        artwork.maxResHeight = uhdUrl.height;
        artwork.resolution = ResolutionTypes.UHD;
        console.log(0, artwork)
        return ResolutionTypes.UHD;
    }
    if (hdUrl) {
        artwork.maxResWidth = hdUrl.width;
        artwork.maxResHeight = hdUrl.height;
        artwork.resolution = ResolutionTypes.HD;
        console.log(1, artwork)
        return ResolutionTypes.HD;
    }
    if (sdUrl) {
        artwork.maxResWidth = sdUrl.width;
        artwork.maxResHeight = sdUrl.height;
        artwork.resolution = ResolutionTypes.SD;
        console.log(2, artwork)
    }
    return ResolutionTypes.SD;
}
