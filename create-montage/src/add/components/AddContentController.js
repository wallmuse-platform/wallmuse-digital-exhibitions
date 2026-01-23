// AddContentController.js

import axios from 'axios';
import qs from 'qs';  // Import qs for proper URL encoding
import { getUserId } from '../../utils/Utils';
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
export async function handleUpload(contentData, contentId, selectedFiles, onProgress = null, t) {
    console.log("[handleUpload] contentData before saving artwork:", contentData);

    try {
        let artworkId = contentId;

                // ✅ NEW CHECK: Detect metadata-only updates
        const hasExistingMedia = contentData.hdPath && !contentData.hdPath.startsWith('blob:');
        const hasNewFiles = selectedFiles && (selectedFiles.hdFile || selectedFiles.sdFile || selectedFiles.thumbnailFile);

        if (contentId && hasExistingMedia && !hasNewFiles) {
            // ✅ METADATA-ONLY UPDATE: Skip all file processing
            console.log("[handleUpload] Metadata-only update - using existing media, skipping file processing");
            
            contentData.artworkId = artworkId;
            const updatedArtworkId = await saveInitialArtwork(contentData);
            
            if (!updatedArtworkId) {
                throw new Error("Failed to update existing content.");
            }
            
            return true; // Success without file processing
        }

        if (!artworkId) {
            // For NEW artworks: Upload HD file FIRST to get S3 URL
            if (selectedFiles.hdFile) {
                console.log("[handleUpload] Uploading HD file first for new artwork...");

                // Create a temporary artwork to get an ID for upload
                const tempArtworkId = await saveInitialArtwork(contentData);

                // Upload HD file to get S3 URL
                const hdUrl = await uploadAdditionalFiles(
                    selectedFiles.hdFile,
                    'HD',
                    tempArtworkId,
                    onProgress ? (progressData) => onProgress({ ...progressData, currentFile: 'HD' }) : null,
                    t
                );

                // Add the HD URL to contentData
                contentData.hdPath = hdUrl;
                contentData.artworkId = tempArtworkId;

                // Update artwork with the HD URL
                await saveInitialArtwork(contentData);

                artworkId = tempArtworkId;
            } else {
                // No HD file - just create artwork with metadata only
                console.log("[handleUpload] No HD file, creating artwork with metadata only...");
                artworkId = await saveInitialArtwork(contentData);

                if (!artworkId) {
                    throw new Error("Failed to create new content.");
                }
            }
        } else {
            // For EXISTING artworks: Update metadata first
            console.log("[api handleUpload] Updating existing artwork with ID:", artworkId);

            // Set the artworkId in contentData for the update
            contentData.artworkId = artworkId;

            // Call saveInitialArtwork which will update the existing artwork
            const updatedArtworkId = await saveInitialArtwork(contentData);
            console.log("[api handleUpload] Artwork updated:", updatedArtworkId);

            if (!updatedArtworkId) {
                throw new Error("Failed to update existing content.");
            }
        }

        // Step 2: Upload additional media files
        const uploadPromises = [];

        if (contentId) {
            // MODIFICATION of existing artwork
            console.log("[handleUpload] Modifying existing artwork...");

            // ✅ ADD THIS DEBUG:
            console.log("[DEBUG] File selection status:", {
                hasHdFile: !!selectedFiles.hdFile,
                hasSdFile: !!selectedFiles.sdFile,
                hasThumbnailFile: !!selectedFiles.thumbnailFile
            });

            if (selectedFiles.hdFile) {
                // HD changed - upload it
                console.log("[handleUpload] Uploading new HD file for existing artwork...");
                uploadPromises.push(uploadAdditionalFiles(selectedFiles.hdFile, 'HD', artworkId, onProgress, t));

                // Only upload SD/thumbnail if user explicitly provided NEW files
                if (selectedFiles.sdFile && selectedFiles.sdFile instanceof File) {
                    console.log("[handleUpload] HD changed + new SD provided");
                    uploadPromises.push(uploadAdditionalFiles(selectedFiles.sdFile, 'SD', artworkId, onProgress, t));
                }
                if (selectedFiles.thumbnailFile && selectedFiles.thumbnailFile instanceof File) {
                    console.log("[handleUpload] HD changed + new thumbnail provided");
                    uploadPromises.push(uploadAdditionalFiles(selectedFiles.thumbnailFile, 'THUMBNAIL', artworkId, onProgress, t));
                }
            } else {
                // HD not changed - upload any changed SD/thumbnail
                if (selectedFiles.sdFile && selectedFiles.sdFile instanceof File) {
                    console.log("[handleUpload] Uploading new SD file...");
                    uploadPromises.push(uploadAdditionalFiles(selectedFiles.sdFile, 'SD', artworkId, onProgress, t));
                }
                if (selectedFiles.thumbnailFile && selectedFiles.thumbnailFile instanceof File) {
                    console.log("[handleUpload] Uploading new thumbnail file...");
                    uploadPromises.push(uploadAdditionalFiles(selectedFiles.thumbnailFile, 'THUMBNAIL', artworkId, onProgress, t));
                }
            }
        } else {
            // NEW artwork creation - HD already uploaded above
            console.log("[handleUpload] New artwork created, checking for additional files...");

            // Only upload SD/thumbnail if user explicitly provided them
            // (HD was already uploaded in the new artwork creation block above)
            if (selectedFiles.sdFile && selectedFiles.sdFile instanceof File) {
                console.log("[handleUpload] New artwork + custom SD provided");
                uploadPromises.push(uploadAdditionalFiles(selectedFiles.sdFile, 'SD', artworkId, onProgress, t));
            }
            if (selectedFiles.thumbnailFile && selectedFiles.thumbnailFile instanceof File) {
                console.log("[handleUpload] New artwork + custom thumbnail provided");
                uploadPromises.push(uploadAdditionalFiles(selectedFiles.thumbnailFile, 'THUMBNAIL', artworkId, onProgress, t));
            }
            // If no SD/thumbnail provided, server auto-generates them from HD ✅
        }

        if (uploadPromises.length > 0) {
            console.log(`[handleUpload] Starting ${uploadPromises.length} additional file uploads...`);
            const uploadResponses = await Promise.all(uploadPromises);
            console.log("[handleUpload] Additional file uploads completed:", uploadResponses);
        } else {
            console.log("[handleUpload] No additional files to upload");
        }

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
    const sessionId = getUserId();

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

        const utf8mb3Safe = (str) => {
        if (!str) return '';
        return str
            // Convert smart quotes to regular quotes
            .replace(/[""]/g, '"')
            .replace(/['']/g, "'")
            // Convert em/en dashes to regular hyphens
            .replace(/[—–]/g, '-')
            // Keep accented characters (these should work in utf8mb3)
            // é, è, à, ü, ö, etc. are fine
        ;
    };

    // Better XML escaping function
    const escapeXML = (str) => {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;')
            // Latin Extended (covers most European languages)
            .replace(/[\u0080-\u024F]/g, (char) => '&#' + char.charCodeAt(0) + ';')
            // Cyrillic (Russian, Ukrainian, Bulgarian, etc.)
            .replace(/[\u0400-\u04FF]/g, (char) => '&#' + char.charCodeAt(0) + ';')
            // Arabic
            .replace(/[\u0600-\u06FF]/g, (char) => '&#' + char.charCodeAt(0) + ';')
            // Chinese, Japanese, Korean (CJK)
            .replace(/[\u4E00-\u9FFF]/g, (char) => '&#' + char.charCodeAt(0) + ';')
            // Any other Unicode characters not caught above
            .replace(/[\u0100-\uFFFF]/g, (char) => {
                // Skip if already processed by above ranges
                const code = char.charCodeAt(0);
                if ((code >= 0x0080 && code <= 0x024F) ||
                    (code >= 0x0400 && code <= 0x04FF) ||
                    (code >= 0x0600 && code <= 0x06FF) ||
                    (code >= 0x4E00 && code <= 0x9FFF)) {
                    return char; // Already processed
                }
                return '&#' + code + ';';
            });
    };



    // CRITICAL: Check for NULL copyright owner names in database
    // Before using any copyright owner ID, verify it has a valid name:
    function validateCopyrightOwner(ownerId) {
        // This should be checked on the backend, but frontend can validate too
        if (!ownerId || ownerId === "-1") return false;

        // The backend should verify the copyright owner exists AND has a non-null name
        // If the copyright owner has NULL name, use owner name instead of owner_id
        return true; // Backend will handle the actual validation
    }

    // 1/ Create XML string manually instead of using document.implementation
    let artworkXML = '<artwork';

    if (contentData.artworkId) {
        artworkXML += ` id="${contentData.artworkId}"`;
    }

    // ADD COPYRIGHT_OWNER_ID to artwork element (for artwork table)

    artworkXML += ` name="${escapeXML(contentData.title)}"`;
    artworkXML += ` public_sd="Y"`;
    artworkXML += ` streaming="${contentData.streaming ? 'Y' : 'N'}"`;
    artworkXML += ` splittable="${contentData.splittable ? 'Y' : 'N'}"`;
    artworkXML += ` croppable="${contentData.croppable ? 'Y' : 'N'}"`;
    artworkXML += ` deconstructable="${contentData.deconstructable ? 'Y' : 'N'}"`;
    artworkXML += ` keywords="${escapeXML(contentData.keywords ? contentData.keywords.join(',') : '')}"`;
    artworkXML += ` datation_start="${contentData.datationStart || ''}"`;
    artworkXML += ` datation_end="${contentData.datationEnd || ''}"`;
    artworkXML += ` datation_hidden="${contentData.datationHidden ? 'Y' : 'N'}"`;
    artworkXML += ` datation_kind="${contentData.datationKind ? 'Y' : 'N'}"`;

    artworkXML += ` author_name="${contentData.artworkAuthor || 'Unknown Author'}"`;

    // ADD: Copyright owner for artwork table
    if (Array.isArray(contentData.rights) && contentData.rights.length > 0) {
        const primaryRight = contentData.rights[0]; // Use first right as primary copyright owner
        if (primaryRight && primaryRight.owner) {
            if (contentData.artworkId) {
                // MODIFICATION: Use existing copyright owner ID if it exists and is valid
                const copyrightOwnerId = primaryRight.owner.id;
                if (copyrightOwnerId && copyrightOwnerId !== "-1") {
                    // Verify the copyright owner exists and has a name
                    artworkXML += ` copyright_owner_id="${copyrightOwnerId}"`;
                }
                // If no valid ID, let backend create new copyright owner from name
            }
            // For new artworks, don't specify copyright_owner_id - let backend create it
        }
    }

    artworkXML += '>';

    // 2. ADD AUTHOR element (existing logic)
    if (contentData.ownerInfo) {
        // Use the ID from ownerInfo, not defaulting to -1
        const authorId = contentData.ownerInfo.id || "-1";
        const authorName = escapeXML(contentData.artworkAuthor || contentData.ownerInfo.name || 'Unknown Author');
        const displayName = escapeXML(contentData.ownerInfo.displayName || authorName);

        console.log("[saveInitialArtwork] Adding author with ID:", authorId);
        artworkXML += `<author id="${authorId}" name="${authorName}" display_name="${displayName}" kind="AUT"/>`;
        console.log("[saveInitialArtwork] Author info being used:", {
            authorId: contentData.ownerInfo?.id,
            authorName: contentData.artworkAuthor,
            ownerInfo: contentData.ownerInfo
        });
    }

    // 3. ADD COPYRIGHT elements (for artwork_copyright table)
    if (Array.isArray(contentData.rights)) {
        contentData.rights.forEach(right => {
            if (right && right.type) {
                const ownerId = right.owner.id;
                const ownerName = right.owner.name;

                console.log("[saveInitialArtwork] Adding right to XML with owner:", { ownerId, ownerName });

                // Always use owner_id (like your original working code)
                artworkXML += `<copyright owner_id="${ownerId}" type="${right.type}" country="${right.country}" direction="A" kind="HD"/>`;
            }
        });
    }

    // 4. Add categories
    if (Array.isArray(contentData.categories)) {
        contentData.categories.forEach(categoryId => {
            artworkXML += `<category id="${categoryId}"/>`;
        });
    }

    // 5. Add descriptions
    if (Array.isArray(contentData.amediadesc) && Array.isArray(contentData.alanguage)) {
        const count = Math.min(contentData.amediadesc.length, contentData.alanguage.length);
        for (let i = 0; i < count; i++) {
            const description = contentData.amediadesc[i];
            const language = contentData.alanguage[i];
            if (description && language) {
                // ✅ Only escape XML-breaking characters, not encoding
                const xmlSafeDesc = description
                    .replace(/&/g, '&amp;')     // Must be first
                    .replace(/</g, '&lt;')      // Escape < for XML
                    .replace(/>/g, '&gt;')      // Escape > for XML  
                    .replace(/"/g, '&quot;');   // Escape quotes for attributes

                artworkXML += `<description language="${language}" description="${xmlSafeDesc}"/>`;
            }
        }
    }

    // 6. Always include URLs when they exist (not blob URLs)

    if (contentData.hdPath && !contentData.hdPath.startsWith('blob:')) {
        artworkXML += `<url url="${escapeXML(contentData.hdPath)}" kind="HD"/>`;
    }
    if (contentData.sdPath && !contentData.sdPath.startsWith('blob:')) {
        artworkXML += `<url url="${escapeXML(contentData.sdPath)}" kind="SD"/>`;
    }
    if (contentData.thumbPath && !contentData.thumbPath.startsWith('blob:')) {
        artworkXML += `<url url="${escapeXML(contentData.thumbPath)}" kind="THUMBNAIL"/>`;
    }

    // 7. Add credits with owner_id for all types
    if (Array.isArray(contentData.credits)) {
        let creditSeq = 1;

        contentData.credits.forEach(credit => {
            // Fix: Check for either 'type' OR 'kind'
            if (credit.name && (credit.type || credit.kind)) {
                const creditName = escapeXML(credit.name);

                // Fix: Handle both 'owner_id' and 'id' properties
                const ownerId = credit.owner_id || credit.id || contentData.ownerInfo?.id || "-1";

                // Fix: Use either 'type' or 'kind'
                const creditType = credit.type || credit.kind;

                console.log("[saveInitialArtwork] Adding credit with owner:", {
                    creditName,
                    type: creditType,
                    ownerId
                });

                if (creditType === 'AUT') {
                    artworkXML += `<credit seq="${creditSeq}" name="${creditName}" display_name="${creditName}" copyright="${creditName}" owner_id="${ownerId}" kind="AUT"/>`;
                } else {
                    artworkXML += `<credit seq="${creditSeq}" name="${creditName}" display_name="${creditName}" owner_id="${ownerId}" kind="${creditType}"/>`;
                }

                creditSeq++;
            }
        });
    }

    // 8. Close the artwork tag
    artworkXML += '</artwork>';

    console.log("[saveInitialArtwork] sessionId, Complete XML string:", sessionId, artworkXML);

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

        if (response.error) {
            throw new Error(`Server error: ${response.error.message || 'Unknown server error'}`);
        }

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
export async function uploadAdditionalFiles(file, kind, artworkId, onProgress = null, t) {
    const sessionId = getUserId();

    const formData = new FormData();
    formData.append('version', '1');
    formData.append('session', sessionId);
    formData.append('artwork', artworkId);
    formData.append('kind', kind);
    formData.append('file', file);

    try {
        const response = await axios.post(`${baseURL}/upload_file`, formData, {
            headers: {
                 'Content-Type': 'multipart/form-data; charset=UTF-8',
            },
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);

                if (onProgress) {
                    if (percentCompleted < 100) {
                        onProgress({
                            phase: 'uploading',
                            progress: percentCompleted,
                            message: `${t("upload.uploading")} ${kind}... ${percentCompleted}%`
                        });
                    } else {
                        onProgress({
                            phase: 'processing',
                            progress: 100,
                            message: `${t("upload.processing")} ${kind}... ${t("may.take.several.minutes")}`
                        });
                    }
                }
            }
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
            // Send completion progress BEFORE checking URL
            if (onProgress) {
                onProgress({
                    phase: 'completed',
                    progress: 100,
                    message: `${kind} upload completed!`
                });
            }

            // Check if URL was found and return
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

        if (onProgress) {
            onProgress({
                phase: 'error',
                progress: 0,
                message: `Error uploading ${kind}: ${error.message}`
            });
        }
        throw error;
    }
}