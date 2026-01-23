// AddContentController.js

import axios from 'axios';
import qs from 'qs';  // Import qs for proper URL encoding
import { sessionId } from '../../App';
import { ArtworkTypes } from '../../components/constants/ArtworkTypes';

const baseURL = "https://wallmuse.com:8443/wallmuse/ws";

// 1.2. Utility function to convert datation text to start and end dates in the format YYYY0101
export function convertDatationText(datationText) {
    let datationStart = '';
    let datationEnd = '';

    if (datationText) {
        const years = datationText.split('-');

        if (years.length === 2) {
            // Handle year range, e.g., "1990-2000"
            datationStart = `${years[0]}0101`;
            datationEnd = `${years[1]}0101`;
        } else if (years.length === 1 && years[0]) {
            // Handle single year, e.g., "1990"
            datationStart = `${years[0]}0101`;
            datationEnd = `${years[0]}0101`;
        }
    }

    return { datationStart, datationEnd };
}

// 3. Function to handle the file upload process
export async function handleUpload(contentData, contentId, selectedFiles) {
    console.log("[handleUpload] contentData before saving artwork:", contentData);

    try {
        let artworkId = contentId;

        // Step 1: If no contentId, save artwork metadata to get an artworkId
        if (!artworkId) {
            console.log("[api handleUpload] No contentId found. Saving new artwork data...");
            artworkId = await saveInitialArtwork(contentData, selectedFiles);
            console.log("[api handleUpload] New artworkId created:", artworkId);

            if (!artworkId) {
                throw new Error("Failed to create new content.");
            }
        }
        console.log("[saveInitialArtwork] Processing credits:", contentData.credits);


        // Step 2: Upload media files (HD, SD, Thumbnail)
        const uploadPromises = [];

        if (selectedFiles.hdFile) {
            console.log("[handleUpload] Uploading HD file...");
            uploadPromises.push(uploadAdditionalFiles(selectedFiles.hdFile, 'HD', artworkId));
        }

        if (selectedFiles.sdFile) {
            console.log("[handleUpload] Uploading SD file...");
            uploadPromises.push(uploadAdditionalFiles(selectedFiles.sdFile, 'SD', artworkId));
        }

        if (selectedFiles.thumbnailFile) {
            console.log("[handleUpload] Uploading Thumbnail file...");
            uploadPromises.push(uploadAdditionalFiles(selectedFiles.thumbnailFile, 'THUMBNAIL', artworkId));
        }

        const uploadResponses = await Promise.all(uploadPromises);
        console.log("[handleUpload] File upload completed:", uploadResponses);

        // Return true for success
        return true;
    } catch (error) {
        console.error("[handleUpload] Error during file upload operation:", error);
        // Re-throw the error so it can be caught by the caller
        throw error;
    }
}

export const isValidDatation = (datationText) => {
    return /^[0-9]{4}(-[0-9]{4})?$/.test(datationText);
};

// Validation function to check required fields and warn about incomplete optional sections
export const validateContentData = (contentData) => {
    const errors = [];

    // Check required fields
    if (!contentData.title || contentData.title.trim() === '') {
        errors.push('Title is required');
    }

    if (!contentData.artworkAuthor || contentData.artworkAuthor.trim() === '') {
        errors.push('Author is required');
    }

    if (!contentData.datationStart || !contentData.datationEnd) {
        errors.push('Datation is required');
    }

    if (!Array.isArray(contentData.categories) || contentData.categories.length === 0) {
        errors.push('At least one category is required');
    }

    if (!Array.isArray(contentData.rights) || contentData.rights.length === 0) {
        errors.push('Copyright information is required');
    }

    // Warnings for optional fields with partial data
    const warnings = [];

    // Check descriptions
    if (Array.isArray(contentData.descriptions) && contentData.descriptions.length > 0) {
        const incompleteDescriptions = contentData.descriptions.some(desc =>
            !desc.language || !desc.description || desc.description.trim() === '');
        if (incompleteDescriptions) {
            warnings.push('Some descriptions are incomplete');
        }
    }

    // Check credits
    if (Array.isArray(contentData.credits) && contentData.credits.length > 0) {
        const incompleteCredits = contentData.credits.some(credit =>
            !credit.name || !credit.type);
        if (incompleteCredits) {
            warnings.push('Some credits are incomplete');
        }
    }

    return { errors, warnings, isValid: errors.length === 0 };
};

// Create the XML structure using DOMParser
export async function saveInitialArtwork(contentData) {
    // Process rights data ONCE at the beginning
    if (Array.isArray(contentData.rights)) {
        contentData.rights = contentData.rights.map(right => {
            // Get owner info from either the specific right or the global ownerInfo
            const ownerId = contentData.ownerInfo?.id || right.owner?.id || "-1";
            const ownerName = contentData.ownerInfo?.name || right.owner?.name || contentData.artworkAuthor || "Unknown Author";

            console.log("[saveInitialArtwork] Processing right with owner:", { ownerId, ownerName });

            return {
                ...right,
                country: right.country || 'ALL',
                owner: {
                    id: ownerId,
                    name: ownerName
                }
            };
        });
    }

    // Create XML string manually instead of using document.implementation
    let artworkXML = '<artwork';

    if (contentData.artworkId) {
        artworkXML += ` id="${contentData.artworkId}"`;
    }

    // IMPORTANT: Add all artwork attributes BEFORE closing the opening tag
    artworkXML += ` name="${contentData.title}"`;
    artworkXML += ` public_sd="Y"`;
    artworkXML += ` streaming="${contentData.streaming ? 'Y' : 'N'}"`;
    artworkXML += ` splittable="${contentData.splittable ? 'Y' : 'N'}"`;
    artworkXML += ` croppable="${contentData.croppable ? 'Y' : 'N'}"`;
    artworkXML += ` deconstructable="${contentData.deconstructable ? 'Y' : 'N'}"`;
    artworkXML += ` keywords="${contentData.keywords ? contentData.keywords.join(',') : ''}"`;
    artworkXML += ` datation_start="${contentData.datationStart || ''}"`;
    artworkXML += ` datation_end="${contentData.datationEnd || ''}"`;
    artworkXML += ` datation_hidden="${contentData.datationHidden ? 'Y' : 'N'}"`;
    artworkXML += ` datation_kind="${contentData.datationKind ? 'Y' : 'N'}"`;
    artworkXML += ` author_name="${contentData.artworkAuthor || 'Unknown Author'}"`;

    // CRITICAL: Close the opening tag BEFORE adding any child elements
    artworkXML += '>';

    // Add author element (new code)
    if (contentData.ownerInfo) {
        // Use the ID from ownerInfo, not defaulting to -1
       const authorId = contentData.ownerInfo.id || "-1";
       const authorName = contentData.artworkAuthor || contentData.ownerInfo.name || 'Unknown Author';
       const displayName = contentData.ownerInfo.displayName || authorName;
       
       console.log("[saveInitialArtwork] Adding author with ID:", authorId);
       artworkXML += `<author id="${authorId}" name="${authorName}" display_name="${displayName}" kind="AUT"/>`;
        console.log("[saveInitialArtwork] Author info being used:", {
            authorId: contentData.ownerInfo?.id,
            authorName: contentData.artworkAuthor,
            ownerInfo: contentData.ownerInfo
        });
    }

    // Add categories
    if (Array.isArray(contentData.categories)) {
        contentData.categories.forEach(categoryId => {
            artworkXML += `<category id="${categoryId}"/>`;
        });
    }

    // Add descriptions
    if (Array.isArray(contentData.amediadesc) && Array.isArray(contentData.alanguage)) {
        const count = Math.min(contentData.amediadesc.length, contentData.alanguage.length);
        for (let i = 0; i < count; i++) {
            const description = contentData.amediadesc[i];
            const language = contentData.alanguage[i];

            if (description && language) {
                // Escape special characters
                const escapedDesc = description
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&apos;');

                artworkXML += `<description language="${language}" description="${escapedDesc}"/>`;
            }
        }
    }

    // Add rights/copyright - AFTER closing the artwork opening tag
    if (Array.isArray(contentData.rights)) {
        contentData.rights.forEach(right => {
            if (right && right.type) {
                // These values are guaranteed to exist because of the processing above
                const ownerId = right.owner.id;
                const ownerName = right.owner.name;

                console.log("[saveInitialArtwork] Adding right to XML with owner:", { ownerId, ownerName });

                // Include both owner_id and owner attributes in XML
                artworkXML += `<copyright owner_id="${ownerId}" type="${right.type}" country="${right.country}" direction="A" kind="HD"/>`;
            }
        });
    }

    // Add URLs
    if (contentData.hdPath) {
        artworkXML += `<url url="${contentData.hdPath}" kind="HD"/>`;
    }
    if (contentData.sdPath) {
        artworkXML += `<url url="${contentData.sdPath}" kind="SD"/>`;
    }
    if (contentData.thumbPath) {
        artworkXML += `<url url="${contentData.thumbPath}" kind="THUMBNAIL"/>`;
    }

    // Add credits with owner_id for AUT type
    if (Array.isArray(contentData.credits)) {
        let creditSeq = 1; // Counter for sequence
        
        contentData.credits.forEach(credit => {
            if (credit.name && credit.type) {
                // Special handling for AUT type credits
                if (credit.type === 'AUT') {
                    const ownerId = credit.owner_id || contentData.ownerInfo?.id || "-1";
                    
                    // Format specifically for AUT credits
                    // artworkXML += `<credit seq="${creditSeq}" kind="AUT" copyright="${credit.name}" id="${ownerId}" name="${credit.name}" display_name="${credit.name}"/>`;
                    artworkXML += `<credit seq="${creditSeq}" name="${credit.name}" display_name="${credit.name}" copyright="${credit.name}" id="${ownerId}" kind="AUT"/>`;
                    // artworkXML += `<credit seq="${creditSeq}" kind="AUT" copyright="${credit.name}" id="${ownerId}" name="${credit.name}" display_name="${credit.name}"/>`;


                } else {
                    // Format for non-AUT credits
                    // artworkXML += `<credit seq="${creditSeq}" kind="${credit.type}" name="${credit.name}" display_name="${credit.name}"/>`;
                    artworkXML += `<credit seq="${creditSeq}" name="${credit.name}" display_name="${credit.name}" kind="${credit.type}"/>`;
                    

                }
                
                creditSeq++;
            }
        });
    }

    // Close the artwork tag
    artworkXML += '</artwork>';

    console.log("[saveInitialArtwork] Complete XML string:", artworkXML);

    // Prepare the POST data
    const formData = qs.stringify({
        version: '1',
        session: sessionId,
        artwork: artworkXML
    });

    // Send the request
    try {
        const response = await axios.post(`${baseURL}/set_artwork_full`, formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        });

        console.log('[api set_artwork_full]', response.data);

        // Parse the response using browser DOMParser
        const parser = new DOMParser();
        const xmlDocResponse = parser.parseFromString(response.data, 'text/xml');
        const artworkId = xmlDocResponse.getElementsByTagName('artwork')[0]?.getAttribute('id');

        if (!artworkId) {
            throw new Error('No artworkId found in the response');
        }

        return artworkId;
    } catch (error) {
        console.error('[saveInitialArtwork] Error:', error);
        throw error;
    }
}

// Upload additional files (SD, Thumbnail) using the artworkId from the HD upload
export async function uploadAdditionalFiles(file, kind, artworkId) {
    const formData = new FormData();
    formData.append('version', '1');
    formData.append('session', sessionId);
    formData.append('artwork', artworkId);
    formData.append('kind', kind);
    formData.append('file', file);

    try {
        const response = await axios.post(`${baseURL}/upload_file`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        if (response.status === 200) {
            const responseData = response.data;

            // Parse the XML response
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(responseData, 'application/xml');

            // Extract the URLs from the XML
            const urlElements = xmlDoc.getElementsByTagName('url');

            // Loop through URLs to find the correct one by `kind`
            let uploadedUrl = null;
            for (let i = 0; i < urlElements.length; i++) {
                if (urlElements[i].getAttribute('kind') === kind) {
                    uploadedUrl = urlElements[i].getAttribute('url');
                    break;
                }
            }

            if (uploadedUrl) {
                console.log(`[uploadAdditionalFiles] ${kind} file uploaded successfully:`, uploadedUrl);
                return uploadedUrl;
            } else {
                throw new Error(`No ${kind} URL found in the response.`);
            }
        } else {
            throw new Error(`Failed to upload ${kind} file.`);
        }
    } catch (error) {
        console.error(`[uploadAdditionalFiles] Error uploading ${kind} file:`, error);
        throw error;
    }
}
