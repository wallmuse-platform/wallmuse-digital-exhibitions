import { getArtworkDurationInMillis } from "./ArtworkUtils";
import { constructDefaultTitleElement } from "../tools/ToolUtils";
import { ToolTypes } from "../constants/ToolTypes";
import { BinTypes } from "../constants/BinTypes";

export const decomposeDroppedMontage = montage => {
    const droppedMontage = {};

    droppedMontage.thumbnail = { id: montage.thumbnail_url }
    droppedMontage.suitableForChildren = montage.rating === 'G'
    droppedMontage.name = montage.name;
    droppedMontage.language = montage.language || null
    droppedMontage.categories = null;
    if (montage.categorys) {
        droppedMontage.categories = [];
        montage.categorys.forEach((cat, index) => {
            droppedMontage.categories.push({id: cat.id, name: cat.name, ordering: index})
        })
    }
    droppedMontage.descriptions = null;
    if (montage.descriptions) {
        droppedMontage.descriptions = []
        montage.descriptions.forEach((desc) => {
            droppedMontage.descriptions.push({id: desc.id, name: desc.name, language: desc.language, description: desc.description})
        })
    }
    droppedMontage.rights = null;
    if (montage.copyrights) {
        droppedMontage.rights = []
        montage.copyrights.forEach((right) => {
            droppedMontage.rights.push({id: right.id, type: right.type, direction: right.direction, country: right.country})
        })
    }
    droppedMontage.artworks = []
    let trackNumber = 0;
    montage.seqs.forEach(seq => {
        const seqArtworks = [];
        let trackIndex = 0;
        seq.array_content.forEach(item => {
            seqArtworks.push(constructTrackItem(item, trackNumber, trackIndex))
            trackIndex++
        })
        droppedMontage.artworks.push(seqArtworks);
        trackNumber++;
    })

    return droppedMontage;
}

function constructTrackItem(item, trackNumber, trackIndex) {
    const trackArtwork = {...item}
    trackArtwork.droppedTrack = trackNumber;
    trackArtwork.durationInMillis = getArtworkDurationInMillis(item);
    if (item.tag_name === "title") {
        constructTrackTitle(trackArtwork, item, trackNumber, trackIndex)
    } else {
        constructTrackArtwork(trackArtwork, item, trackNumber, trackIndex);
    }

    return trackArtwork;
}

function yesNoToBool(val) {
    return val === "yes" || val === true;
}

function constructTrackTitle(trackTitle, item, trackNumber, trackIndex) {
    trackTitle.titleElement = constructDefaultTitleElement();
    trackTitle.trackId = Date.now().toString() + ToolTypes.TITLE + trackIndex + trackNumber;
    trackTitle.type = BinTypes.TOOL;
    trackTitle.toolType = ToolTypes.TITLE;
    // Set properties on titleElement, not trackTitle
    trackTitle.titleElement.nextCount = parseInt(item.next_count);
    trackTitle.titleElement.previousCount = parseInt(item.previous_count);
    // Convert "yes"/"no" strings from API to booleans for checkboxes
    trackTitle.titleElement.displayTitle = yesNoToBool(item.display_title);
    trackTitle.titleElement.displayAuthor = yesNoToBool(item.display_author);
    trackTitle.titleElement.displayDatation = yesNoToBool(item.display_datation);
    trackTitle.titleElement.displayDescription = yesNoToBool(item.display_description);
    trackTitle.titleElement.displayCredits = yesNoToBool(item.display_credits);
    trackTitle.titleElement.backgroundColor = item.background_color;
    // Restore properties that were missing
    if (item.font) trackTitle.titleElement.font = item.font;
    if (item.size) trackTitle.titleElement.size = item.size;
    if (item.halign) trackTitle.titleElement.halign = item.halign;
    if (item.valign) trackTitle.titleElement.valign = item.valign;
    // Strip 'FF' alpha suffix that was appended during save
    if (item.color) trackTitle.titleElement.color = item.color.replace(/FF$/, '');
    console.log("[MontageUtils] constructTrackTitle - loaded titleElement:", trackTitle.titleElement);
}
function constructTrackArtwork(trackArtwork, item, trackNumber, trackIndex) {
    trackArtwork.id = item.artwork_id.toString();
    trackArtwork.display_title = item.title;
    trackArtwork.trackId = Date.now().toString() + item.artwork_id.toString() + trackIndex + trackNumber;
    trackArtwork.tagName = BinTypes.ARTWORK;
    if (trackArtwork.effect_type && trackArtwork.effect_data && trackArtwork.effect_type === ToolTypes.ZOOM_AND_PAN) {
        trackArtwork.zoomAndPan = JSON.parse(trackArtwork.effect_data)
    }
}