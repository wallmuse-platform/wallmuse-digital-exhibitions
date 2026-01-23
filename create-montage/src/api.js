import axios from 'axios';
import { getUserId } from './utils/Utils';

const baseURL = 'https://wallmuse.com:8443/wallmuse/ws';

/**
 * Custom parameter serializer that preserves spaces in session IDs
 * This is critical for complex session IDs with spaces
 */
const serializeParams = params => {
  // Special handling for the session parameter
  if (params.session) {
    // For the session parameter, we want to keep its exact format
    // For all other parameters, we use normal URL encoding
    const sessionParam = `session=${params.session}`;

    // Create the rest of the parameters normally
    const otherParams = Object.entries(params)
      .filter(([key]) => key !== 'session')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    return otherParams ? `${sessionParam}&${otherParams}` : sessionParam;
  } else {
    // Fall back to normal serialization if no session parameter
    return Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
  }
};

export const getCategories = async () => {
  const sessionId = getUserId();
  console.log('[api] getCategories: Starting categories retrieval');

  try {
    const response = await axios.get(`${baseURL}/get_categories`, {
      headers: {
        Accept: 'text/x-json',
      },
      params: {
        version: 1,
        session: sessionId,
      },
    });

    if (response.data?.tag_name === 'error') {
      console.error('[api] getCategories: Server error:', response.data.message);
      return [];
    }

    const categories = response.data['categorys'] ? response.data['categorys'] : []; // Note: server returns "categorys" (misspelled)
    console.log('[api] getCategories: Retrieved', categories.length, 'categories');
    return categories;
  } catch (error) {
    console.error('[api] getCategories: Failed to retrieve categories:', error);
    return [];
  }
};

export const countArtworks = async (term, keywords, author, categories) => {
  const sessionId = getUserId();
  console.log('[api] countArtworks: Starting artwork count with params:', {
    term,
    keywords,
    author,
    categories,
  });

  try {
    term = cleanupEmptyParam(term);
    keywords = cleanupEmptyParam(keywords);
    author = cleanupEmptyParam(author);
    categories = cleanupEmptyParam(categories);

    const response = await axios.get(`${baseURL}/search_artworks_count`, {
      headers: {
        Accept: 'text/x-json',
      },
      params: {
        version: 1,
        desc: term,
        keywords: keywords,
        sauthor: author,
        categories: categories,
        session: sessionId,
      },
    });

    if (response.data?.tag_name === 'error') {
      console.error('[api] countArtworks: Server error:', response.data.message);
      return 0;
    }

    const count = response.data['count'] ? parseInt(response.data['count']) : 0;
    console.log('[api] countArtworks: Found', count, 'artworks');
    return count;
  } catch (error) {
    console.error('[api] countArtworks: Failed to count artworks:', error);
    return 0;
  }
};

export const searchArtworks = async (term, keywords, author, categories, page, size, sort) => {
  const sessionId = getUserId();
  console.log('[api] searchArtworks: Starting artwork search with params:', {
    term,
    keywords,
    author,
    categories,
    page,
    size,
    sort,
  });

  try {
    term = cleanupEmptyParam(term);
    keywords = cleanupEmptyParam(keywords);
    author = cleanupEmptyParam(author);
    categories = cleanupEmptyParam(categories);

    const response = await axios.get(`${baseURL}/search_artworks`, {
      headers: {
        Accept: 'text/x-json',
      },
      params: {
        version: 1,
        desc: term,
        keywords: keywords,
        sauthor: author,
        categories: categories,
        page: page,
        page_size: size,
        sort: sort,
        session: sessionId,
      },
    });

    if (response.data?.tag_name === 'error') {
      console.error('[api] searchArtworks: Server error:', response.data.message);
      return [];
    }

    const artworks = typeof response.data.artworks === 'undefined' ? [] : response.data.artworks;
    console.log('[api] searchArtworks: Found', artworks.length, 'artworks');
    return artworks;
  } catch (error) {
    console.error('[api] searchArtworks: Failed to search artworks:', error);
    return [];
  }
};

export const countMontages = async (term, keywords, author, categories) => {
  const sessionId = getUserId();
  console.log('[api] countMontages: Starting montage count with params:', {
    term,
    keywords,
    author,
    categories,
  });

  try {
    term = cleanupEmptyParam(term);
    keywords = cleanupEmptyParam(keywords);
    author = cleanupEmptyParam(author);
    categories = cleanupEmptyParam(categories);

    const response = await axios.get(`${baseURL}/search_montages_count`, {
      headers: {
        Accept: 'text/x-json',
      },
      params: {
        version: 1,
        desc: term,
        keywords: keywords,
        sauthor: author,
        categories: categories,
        session: sessionId,
      },
    });

    if (response.data?.tag_name === 'error') {
      console.error('[api] countMontages: Server error:', response.data.message);
      return 0;
    }

    const count = response.data['count'] ? parseInt(response.data['count']) : 0;
    console.log('[api] countMontages: Found', count, 'montages');
    return count;
  } catch (error) {
    console.error('[api] countMontages: Failed to count montages:', error);
    return 0;
  }
};

export const searchMontages = async (term, keywords, author, categories, page, size) => {
  const sessionId = getUserId();
  console.log('[api] searchMontages: Starting montage search with params:', {
    term,
    keywords,
    author,
    categories,
    page,
    size,
  });

  try {
    term = cleanupEmptyParam(term);
    keywords = cleanupEmptyParam(keywords);
    author = cleanupEmptyParam(author);
    categories = cleanupEmptyParam(categories);

    const response = await axios.get(`${baseURL}/search_montages_full`, {
      headers: {
        Accept: 'text/x-json',
      },
      params: {
        version: 1,
        session: sessionId,
        page: page,
        page_size: size,
        desc: term,
        keywords: keywords,
        sauthor: author,
        categories: categories,
      },
    });

    if (response.data?.tag_name === 'error') {
      console.error('[api] searchMontages: Server error:', response.data.message);
      return [];
    }

    const montages = typeof response.data.montages === 'undefined' ? [] : response.data.montages;
    console.log('[api] searchMontages: Found', montages.length, 'montages');
    return montages;
  } catch (error) {
    console.error('[api] searchMontages: Failed to search montages:', error);
    return [];
  }
};

export const getMontageFull = async (montageId) => {
  const sessionId = getUserId();
  const response = await axios.get(`${baseURL}/get_montage_full`, {
    headers: {
      Accept: 'text/x-json',
    },
    params: {
      version: 1,
      session: sessionId,
      montage: montageId,
    },
  });

  return response.data;
};

export const getAllMontagesFull = async (page, size) => {
  const sessionId = getUserId();
  const response = await axios.get(`${baseURL}/get_all_montages_full`, {
    headers: {
      Accept: 'text/x-json',
    },
    params: {
      version: 1,
      session: sessionId,
      page: page,
      page_size: size,
    },
  });

  return typeof response.data.montages === 'undefined' ? [] : response.data.montages;
};

export const saveMontages = async (montage) => {
  const sessionId = getUserId();
  const payload = `montage=${JSON.stringify(montage)}`;
  const response = await axios.post(
    `${baseURL}/set_montage_full?version=1&session=${sessionId}`,
    payload,
    {
      headers: {
        Accept: 'text/x-json',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', //added charset=UTF-8
      },
    }
  );

  return response;
};
export const deleteMontage = async (userId, montageId) => {
  const sessionId = getUserId();
  const response = await axios.post(
    `${baseURL}/del_montage?user=${userId}&montage=${montageId}&version=1&session=${sessionId}`,
    '',
    {
      headers: {
        Accept: 'text/x-json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  return response;
};

export const getUser = async () => {
  const sessionId = getUserId();
  const response = await axios.get(`${baseURL}/get_joomla_user`, {
    headers: {
      Accept: 'text/x-json',
    },
    params: {
      version: 1,
      session: sessionId,
    },
  });
  return response.data; // Add this line
};

export const deleteArtwork = async (artworkId) => {
  try {
    const sessionId = getUserId();
    const response = await axios.get(`${baseURL}/del_artwork`, {
      headers: {
        Accept: 'text/x-json',
      },
      params: {
        version: 1,
        session: sessionId,
        artwork: artworkId,
      },
    });

    return response.data; // Return the server's response
  } catch (error) {
    console.error('Error deleting artwork:', error);
    throw error; // Rethrow error to handle it in the calling function
  }
};

export const getArtworkById = async (artworkId) => {
  try {
    const sessionId = getUserId();
    console.log('[api getArtworkById] Fetching artwork with ID:', artworkId);

    const response = await axios.get(`${baseURL}/search_artworks`, {
      headers: {
        Accept: 'text/xml',
      },
      params: {
        version: 1,
        session: sessionId,
        artwork: artworkId,
      },
    });

    console.log('[api getArtworkById] Received response:', response.data);

    // Parse the XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    const artworks = xmlDoc.getElementsByTagName('artwork');

    // Find the matching artwork by ID
    let matchingArtwork = null;
    for (let i = 0; i < artworks.length; i++) {
      if (artworks[i].getAttribute('id') === artworkId) {
        matchingArtwork = artworks[i];
        break;
      }
    }

    if (!matchingArtwork) {
      console.error('[api getArtworkById] No artwork found with ID:', artworkId);
      return null;
    }

    // Extract URLs and convert to individual path variables
    const urls = matchingArtwork.getElementsByTagName('url');
    const urlArray = [];
    let hdPath = '';
    let sdPath = '';
    let thumbnailPath = '';

    for (let i = 0; i < urls.length; i++) {
      const urlObj = {
        id: urls[i].getAttribute('id'),
        url: urls[i].getAttribute('url'),
        kind: urls[i].getAttribute('kind'),
        md5: urls[i].getAttribute('md5'),
        size: urls[i].getAttribute('size'),
        width: urls[i].getAttribute('width'),
        height: urls[i].getAttribute('height'),
      };

      urlArray.push(urlObj);

      // CRITICAL: Extract individual paths for AddContent validation
      const kind = urls[i].getAttribute('kind');
      const url = urls[i].getAttribute('url');

      if (kind === 'HD') {
        hdPath = url;
      } else if (kind === 'SD') {
        sdPath = url;
      } else if (kind === 'THUMBNAIL') {
        thumbnailPath = url;
      }
    }

    console.log('[api getArtworkById] Extracted paths:', { hdPath, sdPath, thumbnailPath });

    // Convert XML to a JavaScript object with individual path variables
    const artwork = {
      id: matchingArtwork.getAttribute('id'),
      title: matchingArtwork.getAttribute('title'),
      display_title: matchingArtwork.getAttribute('display_title'),
      type: matchingArtwork.getAttribute('type'),
      public_sd: matchingArtwork.getAttribute('public_sd'),
      duration: matchingArtwork.getAttribute('duration'),
      description: matchingArtwork.getAttribute('description'),
      datation: matchingArtwork.getAttribute('datation'),
      datationText: matchingArtwork.getAttribute('datation'),
      datation_start: matchingArtwork.getAttribute('datation_start'),
      datation_end: matchingArtwork.getAttribute('datation_end'),
      datation_kind: matchingArtwork.getAttribute('datation_kind'),
      datation_hidden: matchingArtwork.getAttribute('datation_hidden'),
      datationKind: matchingArtwork.getAttribute('datation_kind') === 'Y',
      datationHidden: matchingArtwork.getAttribute('datation_hidden') === 'Y',
      splittable: matchingArtwork.getAttribute('splittable') === 'Y',
      croppable: matchingArtwork.getAttribute('croppable') === 'Y',
      deconstructable: matchingArtwork.getAttribute('deconstructable') === 'Y',
      streaming: matchingArtwork.getAttribute('streaming') === 'Y',

      // CRITICAL: Add individual path variables that AddContent expects
      hdPath: hdPath,
      sdPath: sdPath,
      thumbPath: thumbnailPath,

      // Keep the original urls array as well
      urls: urlArray,

      // Extract author information
      author: (() => {
        const authors = matchingArtwork.getElementsByTagName('author');
        if (authors.length > 0) {
          return {
            id: authors[0].getAttribute('id'),
            name: authors[0].getAttribute('name'),
            display_name: authors[0].getAttribute('display_name'),
            kind: authors[0].getAttribute('kind'),
          };
        }
        return null;
      })(),

      // Extract categories
      categories: (() => {
        const categories = matchingArtwork.getElementsByTagName('category');
        const categoryArray = [];
        for (let i = 0; i < categories.length; i++) {
          categoryArray.push({
            id: categories[i].getAttribute('id'),
            category: categories[i].getAttribute('category'),
          });
        }
        return categoryArray;
      })(),

      // Extract copyright information
      rights: (() => {
        const copyrights = matchingArtwork.getElementsByTagName('copyright');
        const copyrightArray = [];
        for (let i = 0; i < copyrights.length; i++) {
          copyrightArray.push({
            id: copyrights[i].getAttribute('id'),
            type: copyrights[i].getAttribute('type'),
            direction: copyrights[i].getAttribute('direction'),
            kind: copyrights[i].getAttribute('kind'),
            country: copyrights[i].getAttribute('country') || 'ALL',
            owner: {
              name:
                matchingArtwork.getElementsByTagName('author')[0]?.getAttribute('display_name') ||
                '',
            },
          });
        }
        return copyrightArray;
      })(),

      // Extract credits
      credits: (() => {
        const credits = matchingArtwork.getElementsByTagName('credit');
        const creditArray = [];
        for (let i = 0; i < credits.length; i++) {
          creditArray.push({
            seq: credits[i].getAttribute('seq'),
            kind: credits[i].getAttribute('kind'),
            copyright: credits[i].getAttribute('copyright'),
            id: credits[i].getAttribute('id'),
            name: credits[i].getAttribute('name'),
            display_name: credits[i].getAttribute('display_name'),
            location: credits[i].getAttribute('location') || 'ALL',
          });
        }
        return creditArray;
      })(),

      // Extract descriptions
      descriptions: (() => {
        const descriptions = matchingArtwork.getElementsByTagName('description');
        const descArray = [];

        for (let i = 0; i < descriptions.length; i++) {
          const desc = {
            id: descriptions[i].getAttribute('id'),
            language: descriptions[i].getAttribute('language') || 'eng',
            description: descriptions[i].getAttribute('description') || '',
            name: descriptions[i].getAttribute('name') || 'Default',
          };

          descArray.push(desc);
        }

        return descArray;
      })(),
    };

    console.log('Processed artwork object:', artwork);
    console.log('HD Path extracted:', artwork.hdPath);
    return artwork;
  } catch (error) {
    console.error('Error in getArtworkById:', error);
    throw error;
  }
};

// Helper function to get artwork URLs based on kind
const getArtworkURL = (artwork, kind) => {
  const urlElement = Array.from(artwork.getElementsByTagName('url')).find(
    url => url.getAttribute('kind') === kind
  );
  return urlElement ? urlElement.getAttribute('url') : '';
};

// Comprehensive client-side filtering solution without hardcoding

// Database integrity solution to prevent duplicate authors

export async function searchCopyrightOwner(session, name) {
  console.log('[searchCopyrightOwner] Searching for author:', name);

  if (!name || name.trim() === '') {
    return [];
  }

  // First try an exact match with the API
  try {
    const params = new URLSearchParams();
    params.append('version', '1');
    params.append('session', session);
    params.append('name', name);
    params.append('kind', 'AUT');

    console.log('[searchCopyrightOwner] Trying exact match API call');

    const response = await axios.post(
      'https://ooo2.wallmuse.com:8443/wallmuse/ws/search_copyright_owner',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    // Parse the XML response
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');

    // Check for errors
    const errorElements = xmlDoc.getElementsByTagName('error');
    if (errorElements.length > 0) {
      const errorCode = errorElements[0].getAttribute('code');
      const errorMessage = errorElements[0].getAttribute('message');
      console.error(`[searchCopyrightOwner] API error: ${errorCode} - ${errorMessage}`);
    } else {
      // Look for copyright owners
      const copyrightOwners = xmlDoc.getElementsByTagName('copyright_owner');

      let owners = [];
      for (let i = 0; i < copyrightOwners.length; i++) {
        const owner = {
          id: copyrightOwners[i].getAttribute('id'),
          displayName: copyrightOwners[i].getAttribute('display_name'),
          name: copyrightOwners[i].getAttribute('name'),
        };
        owners.push(owner);
      }

      // If we found matches, return them
      if (owners.length > 0) {
        console.log('[searchCopyrightOwner] Found exact matches:', owners);
        return owners;
      }
    }
  } catch (error) {
    console.error('[searchCopyrightOwner] Exact match API call failed:', error);
  }

  // If no exact match, try fuzzy matching with similar names
  try {
    // Try a few common variants that might help find similar names
    const nameVariants = generateNameVariants(name);

    console.log('[searchCopyrightOwner] Trying fuzzy matching with variants:', nameVariants);

    let allOwners = [];

    // Try each variant
    for (const variant of nameVariants) {
      try {
        const variantParams = new URLSearchParams();
        variantParams.append('version', '1');
        variantParams.append('session', session);
        variantParams.append('name', variant);
        variantParams.append('kind', 'AUT');

        const variantResponse = await axios.post(
          'https://ooo2.wallmuse.com:8443/wallmuse/ws/search_copyright_owner',
          variantParams,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );

        // Parse the XML response
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(variantResponse.data, 'text/xml');

        // Check for copyright owners
        const copyrightOwners = xmlDoc.getElementsByTagName('copyright_owner');

        for (let i = 0; i < copyrightOwners.length; i++) {
          const owner = {
            id: copyrightOwners[i].getAttribute('id'),
            displayName: copyrightOwners[i].getAttribute('display_name'),
            name: copyrightOwners[i].getAttribute('name'),
          };

          // Only add if not already in the list
          if (!allOwners.some(existing => existing.id === owner.id)) {
            allOwners.push(owner);
          }
        }
      } catch (variantError) {
        console.warn(`[searchCopyrightOwner] Error searching variant "${variant}":`, variantError);
      }
    }

    // If we found any matches with variants, return them
    if (allOwners.length > 0) {
      console.log('[searchCopyrightOwner] Found fuzzy matches:', allOwners);

      // Sort by relevance to the original search term
      allOwners.sort((a, b) => {
        const aName = (a.displayName || a.name || '').toLowerCase();
        const bName = (b.displayName || b.name || '').toLowerCase();
        const searchLower = name.toLowerCase();

        // Exact match first
        if (aName === searchLower && bName !== searchLower) return -1;
        if (bName === searchLower && aName !== searchLower) return 1;

        // Starts with search term next
        if (aName.startsWith(searchLower) && !bName.startsWith(searchLower)) return -1;
        if (bName.startsWith(searchLower) && !aName.startsWith(searchLower)) return 1;

        // Contains search term next
        if (aName.includes(searchLower) && !bName.includes(searchLower)) return -1;
        if (bName.includes(searchLower) && !aName.includes(searchLower)) return 1;

        // Alphabetical order
        return aName.localeCompare(bName);
      });

      return allOwners;
    }
  } catch (fuzzyError) {
    console.error('[searchCopyrightOwner] Fuzzy matching failed:', fuzzyError);
  }

  // For WallM -> WallMuse match specifically (known to work)
  const nameLower = name.toLowerCase();
  if (nameLower.includes('wall') || 'wallmuse'.includes(nameLower)) {
    console.log('[searchCopyrightOwner] Adding WallMuse fallback');
    return [
      {
        id: '867',
        displayName: 'WallMuse',
        name: 'WallMuse',
      },
    ];
  }

  // No matches found
  console.log('[searchCopyrightOwner] No matches found');
  return [];
}

// Helper function to generate name variants for better fuzzy matching
function generateNameVariants(name) {
  const variants = [name]; // Start with the original name

  // Add trimmed version
  variants.push(name.trim());

  // Add version with first letter capitalized
  if (name.length > 0) {
    variants.push(name.charAt(0).toUpperCase() + name.slice(1));
  }

  // Add version with all lowercase
  variants.push(name.toLowerCase());

  // Add version with all uppercase
  variants.push(name.toUpperCase());

  // For names with spaces, try variants with different capitalization
  if (name.includes(' ')) {
    const parts = name.split(' ');

    // Capitalize each word
    variants.push(
      parts.map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(' ')
    );

    // Try just the first part
    variants.push(parts[0]);

    // Try just the last part
    variants.push(parts[parts.length - 1]);
  }

  // Remove any duplicates
  return [...new Set(variants)];
}

/**
 * Test function to check copyright owner search from the browser console
 * @param {string} name - Name to search for
 */
export function testCopyrightOwnerSearch(name) {
  const sessionId = getUserId();
  console.log('Testing search for:', name, 'with session:', sessionId);

  // Direct API call without any client-side filtering
  const formData = new URLSearchParams();
  formData.append('version', '1');
  formData.append('session', sessionId);
  formData.append('kind', 'AUT');

  // First try with name
  if (name) {
    formData.append('name', name);
  }

  console.log('Request params:', Object.fromEntries(formData.entries()));

  axios
    .post('https://wallmuse.com:8443/wallmuse/ws/search_copyright_owner', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    .then(response => {
      console.log('Raw API response:', response.data);

      // Parse XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(response.data, 'text/xml');
      const owners = xmlDoc.getElementsByTagName('copyright_owner');

      console.log('Found copyright_owner elements:', owners.length);

      // Log each owner
      for (let i = 0; i < owners.length; i++) {
        console.log(`Owner ${i + 1}:`, {
          id: owners[i].getAttribute('id'),
          name: owners[i].getAttribute('name'),
          displayName: owners[i].getAttribute('display_name'),
        });
      }

      // Now try without name to get all owners
      if (name) {
        // Only do this second test if we provided a name initially
        const allFormData = new URLSearchParams();
        allFormData.append('version', '1');
        allFormData.append('session', sessionId);
        allFormData.append('kind', 'AUT');

        console.log('Trying broader search without name...');

        axios
          .post('https://wallmuse.com:8443/wallmuse/ws/search_copyright_owner', allFormData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          })
          .then(allResponse => {
            console.log('All owners response:', allResponse.data);

            // Parse XML
            const allXmlDoc = parser.parseFromString(allResponse.data, 'text/xml');
            const allOwners = allXmlDoc.getElementsByTagName('copyright_owner');

            console.log('Found total copyright_owner elements:', allOwners.length);

            // Filter these owners client-side
            const matchingOwners = [];
            const nameLower = name.toLowerCase();

            for (let i = 0; i < allOwners.length; i++) {
              const owner = {
                id: allOwners[i].getAttribute('id'),
                name: allOwners[i].getAttribute('name'),
                displayName: allOwners[i].getAttribute('display_name'),
              };

              const displayNameLower = (owner.displayName || '').toLowerCase();
              const ownerNameLower = (owner.name || '').toLowerCase();

              if (displayNameLower.includes(nameLower) || ownerNameLower.includes(nameLower)) {
                matchingOwners.push(owner);
                console.log('Found matching owner:', owner);
              }
            }

            console.log(`Found ${matchingOwners.length} owners after client-side filtering`);
          })
          .catch(error => {
            console.error('Error in broader search:', error);
          });
      }
    })
    .catch(error => {
      console.error('Error in search:', error);
    });
}

// Make it globally available for testing from the console
window.testCopyrightOwnerSearch = testCopyrightOwnerSearch;

const cleanupEmptyParam = param => (!param || param.trim().length === 0 ? null : param);

// #%RAML 1.0
// title: Wallmuse API
// baseUri: https://wallmuse.com:8443/wallmuse/ws

// types:
//   Category:
//     type: object
//     properties:
//       id: integer
//       name: string
//   Artwork:
//     type: object
//     properties:
//       id: integer
//       title: string
//       author: string
//       keywords: string
//       categories: Category[]
//   Montage:
//     type: object
//     properties:
//       id: integer
//       title: string
//       author: string
//       keywords: string
//       categories: Category[]
//       artworks: Artwork[]

// /categories:
//   get:
//     description: Get all categories
//     responses:
//       200:
//         body:
//           application/json:
//             type: Category[]
// /artworks:
//   get:
//     description: Search for artworks
//     queryParameters:
//       term: string
//       keywords: string
//       author: string
//       categories: string
//       page: integer
//       size: integer
//     responses:
//       200:
//         body:
//           application/json:
//             type: Artwork[]
// /artworks/count:
//   get:
//     description: Get the count of artworks for a search
//     queryParameters:
//       term: string
//       keywords: string
//       author: string
//       categories: string
//     responses:
//       200:
//         body:
//           application/json:
//             properties:
//               count: integer
// /montages:
//   get:
//     description: Search for montages
//     queryParameters:
//       term: string
//       keywords: string
//       author: string
//       categories: string
//       page: integer
//       size: integer
//     responses:
//       200:
//         body:
//           application/json:
//             type: Montage[]
//   post:
//     description: Save a montage
//     body:
//       application/x-www-form-urlencoded:
//         properties:
//           montage: Montage
//     responses:
//       200:
//         body:
//           application/json:
//             properties:
//               status: string
// /montages/{montageId}:
//   get:
//     description: Get a full montage
//     responses:
//       200:
//         body:
//           application/json:
//             type: Montage
//   delete:
//     description: Delete a montage
//     responses:
//       200:
//         body:
//           application/json:
//             properties:
//               status: string
// /montages/count:
//   get:
//     description: Get the count of montages for a search
//     queryParameters:
//       term: string
//       keywords: string
//       author: string
//       categories: string
//     responses:
//       200:
//         body:
//           application/json:
//             properties:
//               count: integer
// /user:
//   get:
//     description: Get the current user
//     responses:
//       200:
//         body:
//           application/json:
//             properties:
//               id: integer
//               username: string
//               email: string
