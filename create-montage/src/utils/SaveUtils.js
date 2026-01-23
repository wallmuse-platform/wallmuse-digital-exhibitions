import {
    isArtwork,
    isMontage
} from "../components/artworks/ArtworkUtils";
import { isTitle } from "../components/tools/ToolUtils";
import i18next from '../i18n';

export const calculateTrackEndTime = track => track.length !== 0 ? track[track.length - 1].endTime : 0

export const constructMontageToSave = (name, thumbnail, suitableForChildren, trackArtworks, language, descriptions, rights, categories, droppedMontages) => {
    let montage = {
        name: name,
        thumbnail_url: thumbnail.id.toString(),
        rating: suitableForChildren ? 'G' : 'NC-17',
        duration: (calculateTrackEndTime(trackArtworks[0]) / 1000).toString(),
        seqs: trackArtworks.filter(track => track.length > 0).map((track, index) => mapTrackToSeq(track, index, droppedMontages))
    };
    if (language != null) {
        montage = {...montage, language: language}
    }
    if (descriptions != null) {
        montage = {...montage, descriptions: descriptions}
    }
    if (rights != null) {
        montage = {...montage, copyrights: rights}
    }
    if (categories != null) {
        montage = {...montage, categorys: categories}
    }
    return montage;
}

export const validate = (name, thumbnail, trackArtworks, setErrors) => {
    const errors = []
    if (name.trim().length === 0) {
        errors.push(i18next.t("error.save.name"))
    }
    if (thumbnail == null) {
        errors.push(i18next.t("error.save.thumbnail"))
    }
    if (trackArtworks.length === 0 || (trackArtworks.length === 1 && trackArtworks[0].length === 0)) {
        errors.push(i18next.t("error.save.artworks"))
    } else {
        const endTime = calculateTrackEndTime(trackArtworks[0])
        for (let i = 1; i < calculateNumberOfTracks(trackArtworks); i++) {
            if (calculateTrackEndTime(trackArtworks[i]) !== endTime) {
                errors.push(i18next.t("error.save.duration"))
                break;
            }
        }
    }

    if (errors.length > 0) {
        setErrors(errors)
        return false;
    }
    return true;
}

const calculateNumberOfTracks = trackArtworks => trackArtworks.filter(track => track.length > 0).length;

const mapTrackToSeq = (track, trackIndex, droppedMontages) => {
    const items = [];
    track.forEach(artwork => {
        if (isArtwork(artwork)) {
            items.push(constructTrackArtwork(artwork, false))
        } else if (isMontage(artwork)) {
            const trackOfDroppedMontage = trackIndex - artwork.droppedTrack;
            const seqOfDroppedMontage = droppedMontages[artwork.id][trackOfDroppedMontage]["array_content"]
                .map(item => constructTrackArtwork(item, true));
            items.push(...seqOfDroppedMontage)
        } else if (isTitle(artwork)) {
            items.push(constructTrackTitle(artwork))
        }
    });
    return { array_content: items }
}

const constructTrackArtwork = (artwork, isFromMontage) => {
    const trackArtwork = {
        tag_name: "item",
        artwork_id: isFromMontage ? artwork.artwork_id : artwork.id.toString(),
        offset: '0',
        duration: isFromMontage ? artwork.duration : (artwork.durationInMillis / 1000).toString(),
        repeat: "1"
    }
    console.log(artwork)
    if (artwork.zoomAndPan) {
        trackArtwork["effect_type"] = "panzoom"
        trackArtwork["effect_data"] = JSON.stringify(artwork.zoomAndPan);
    }
    console.log(trackArtwork)
    return trackArtwork;
}

const constructTrackTitle = artwork => {
    const title = artwork.titleElement;
    return {
        tag_name: "title",
        next_count: title.nextCount,
        previous_count: title.previousCount,
        valign: title.valign,
        halign: title.halign,
        display_title: title.displayTitle,
        display_author: title.displayAuthor,
        display_datation: title.displayDatation,
        display_description: title.displayDescription,
        display_credits: title.displayCredits,
        duration: artwork.duration.toString(),
        background_color: title.backgroundColor,
        font: title.font + 'FF',
        color: title.color + 'FF',
        size: title.size
    };
}