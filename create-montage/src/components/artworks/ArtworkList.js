import * as React from 'react';
import Box from '@mui/material/Box';
import { ImageListItemBar, Tooltip } from "@mui/material";
import DraggableArtwork from "./DraggableArtwork";
import { BinTypes } from "../constants/BinTypes";
import { ArtworkTypes } from "../constants/ArtworkTypes";
import InfoOutlinedIcon from '@mui/icons-material/Info';
import { constructDurationForArtwork, getName } from "./ArtworkUtils";

export default function ArtworkList({ artworks, setThumbnail, type }) {
    const handleDoubleClick = (artwork) => {
        if (BinTypes.ARTWORK === type) {
            setThumbnail(artwork);
        }
    }

    const getType = artworkType => type === BinTypes.MONTAGE
        ? "Montage"
        : ( artworkType === ArtworkTypes.IMAGE ? "Image" : "Video" );

    const getActionIcon = montage => {
        if (type === BinTypes.MONTAGE) {
            const tracks = parseInt(montage.tracks) === 1 ? "track" : "tracks";
            return (
                <Tooltip title={ `${montage.tracks} ${tracks}` }>
                    <InfoOutlinedIcon sx={{ color: "white", marginRight: '10px' }} />
                </Tooltip>
            );
        }
    }

    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 200px)', gap: 0.5, p: 0.5, alignContent: 'flex-start' }}>
            {artworks.map((artwork) => (
                <Box
                    key={artwork.id}
                    onDoubleClick={() => handleDoubleClick(artwork)}
                    sx={{ aspectRatio: '1', position: 'relative', overflow: 'hidden' }}
                >
                    <DraggableArtwork
                        artwork={ artwork }
                        type={ type }
                        fullName={ getName(artwork) }
                    />
                    <ImageListItemBar
                        sx={{ opacity: 0.8 }}
                        title={ getName(artwork) }
                        subtitle={ `${constructDurationForArtwork(artwork)}, ${getType(artwork.type)}` }
                        actionIcon={ getActionIcon(artwork) }
                    />
                </Box>
            ))}
        </Box>
    );
}
