// sortMontages.js (textual organigram is at the end)

// export function sortMontages(montages, orderBy, displayBy, splittable, deconstructable, qualityBy, resolution, orientationBy, orientation, commercialBy, commercial) {
export function sortMontages(montages, orderBy, displayBy, qualityBy, orientationBy, commercialBy) {
    console.log ("[sortMontages] montages", montages) 
    let sortedMontages = [...montages]; // Declare sortedMontages here

    // Sort by 'orderBy'
    // console.log('Before orderBy filter:', sortedMontages.length); // Log the number of montages before the filter
    if (orderBy === 'Most Recent') {
        sortedMontages.sort((a, b) => b.mdate.localeCompare(a.mdate));
        // console.log('First few items after date sort:', sortedMontages.slice(0, 5));
    } else if (orderBy === 'Alphabetical') {
        sortedMontages.sort((a, b) => a.name.localeCompare(b.name));
        // console.log('First few items after alphabetical sort:', sortedMontages.slice(0, 5));
    } 
    // console.log('After orderBy filter:', sortedMontages.length); // Log the number of montages after the filter

    // Filter by 'displayBy'
    // console.log('Before displayBy filter:', sortedMontages.length); // Log the number of montages before the filter
    if (displayBy === 'All Display Types') {
        // Do not apply any filter
    } else if (displayBy === "Standard") {
        const filteredMontages = montages.filter(montage => 
        ((montage.splittable === 'N' || montage.splittable === '') && (montage.deconstructable === 'N' || montage.deconstructable === '')) 
        );
        sortedMontages = filteredMontages;
    } else if (displayBy === "Video Wall") {
        // console.log('Initial montages count:', montages.length);
        const filteredMontages = montages.filter(montage => 
        (montage.splittable === 'Y' && (montage.deconstructable === 'N' || montage.deconstructable === ''))
        );
        // console.log('Filtered montages count:', filteredMontages.length);
        // console.log('First few filtered montages:', filteredMontages.slice(0, 5));
        sortedMontages = filteredMontages;
    }
    else if (displayBy === "Destructured") {
        const filteredMontages = montages.filter(montage => 
        (montage.splittable === 'Y' && montage.deconstructable === 'Y')
        );
        sortedMontages = filteredMontages;
    }
    // console.log('After displayBy filter:', sortedMontages.length); // Log the number of montages after the filter

    // Filter by 'qualityBy (resolution)'
    // console.log('Before qualityBy filter:', sortedMontages.length); // Log the number of montages before the filter
    if (qualityBy === 'HD') {
        sortedMontages = sortedMontages.filter(montage => montage.resolution === 'HD' || montage.resolution === '');
    } else if (qualityBy === '4K') {
        sortedMontages = sortedMontages.filter(montage => montage.resolution === '4K');
    }
    // console.log('After qualityBy filter:', sortedMontages.length); // Log the number of montages after the filter

    // Filter by 'orientationBy'
    // console.log('Before orientationBy filter:', sortedMontages.length); // Log the number of montages before the filter
    if (orientationBy === 'All Orientations') {
        // Do not apply any filter
    } else if (orientationBy === 'Landscape') {
        sortedMontages = sortedMontages.filter(montage => montage.orientation === 'L' || montage.resolution === '');
    } else if (orientationBy === 'Portrait') {
        sortedMontages = sortedMontages.filter(montage => montage.orientation === 'P');
    }
    // console.log('After orientationBy filter:', sortedMontages.length); // Log the number of montages after the filter

    // Filter by 'rights' (selectable = Y when most CCs except one of them, probably CC BY-NC-ND)
    // console.log('Before rights filter:', sortedMontages.length); // Log the number of montages before the filter
    if (commercialBy === 'All Access Types') {
        // Do not apply any filter
    } else if (commercialBy === 'Free') {
        sortedMontages = sortedMontages.filter(montage => montage.selectable === 'Y');
    } else if (commercialBy === 'Premium') {
        sortedMontages = sortedMontages.filter(montage => montage.selectable === 'N');
    }
    // console.log('After rights filter:', sortedMontages.length); // Log the number of montages after the filter

    return sortedMontages;
}

// |-- Declare sortedMontages
// |-- Sort by 'orderBy'
// |   |-- If 'Most Recent'
// |   |   |-- Sort by date
// |   |-- If 'Alphabetical'
// |       |-- Sort alphabetically
// |-- Filter by 'displayBy'
// |   |-- If 'All Display Types'
// |   |   |-- No filter
// |   |-- If 'Standard'
// |   |   |-- Filter by 'splittable' and 'deconstructable'
// |   |-- If 'Video Wall'
// |   |   |-- Filter by 'splittable' and 'deconstructable'
// |   |-- If 'Destructured'
// |       |-- Filter by 'splittable' and 'deconstructable'
// |-- Filter by 'qualityBy (resolution)'
// |   |-- If 'HD'
// |   |   |-- Filter by resolution
// |   |-- If '4K'
// |       |-- Filter by resolution
// |-- Filter by 'orientationBy'
// |   |-- If 'All Orientations'
// |   |   |-- No filter
// |   |-- If 'Landscape'
// |   |   |-- Filter by orientation
// |       |-- Filter by orientation
// |-- Filter by 'rights'
//     |-- If 'All Rights'
//     |   |-- No filter
//     |-- If 'Creative Commons'
//     |   |-- Filter by 'selectable'
//     |-- If 'Commercial'
//         |-- Filter by 'selectable'
// |-- Return sortedMontages