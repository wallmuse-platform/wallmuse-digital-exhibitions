import * as React from 'react';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import { ImageListItemBar, Tooltip } from "@mui/material";
import DraggableArtwork from "./DraggableArtwork";
import { BinTypes } from "../constants/BinTypes";
import { ArtworkTypes } from "../constants/ArtworkTypes";
import InfoOutlinedIcon from '@mui/icons-material/Info';
import { constructDurationForArtwork, getName } from "./ArtworkUtils";
import { useContext } from "react";
import { BaseThumbnailContext } from "../../context/ArtworksContext";

export default function ArtworkList({ artworks, setThumbnail, type }) {
    const baseThumbnailURL = useContext(BaseThumbnailContext)
    const handleDoubleClick = (artwork) => {
        if (BinTypes.ARTWORK === type) {
            setThumbnail(artwork);
        }
    }

    const getType = artworkType => type === BinTypes.MONTAGE
        ? "Montage"
        : ( artworkType === ArtworkTypes.IMAGE ? "Image" : "Video" );

    const getActionIcon = montage => {
        const tracks = parseInt(montage.tracks) === 1 ? "track" : "tracks";
        if (type === BinTypes.MONTAGE) {
            return (
                <Tooltip title = { `${montage.tracks} ${tracks}` }>
                    <InfoOutlinedIcon sx={{ color: "white", marginRight: '10px' }} />
                </Tooltip>
            )
        }
    }

    return (
        <ImageList
            sx={{ overflowY: "visible"}}
            cols={1}
            rowHeight={250}
        >
            {artworks.map((artwork) => (
                    <ImageListItem
                        key={artwork.id}
                        onDoubleClick={() => handleDoubleClick(artwork)}
                        sx={{ margin: 1 }}
                    >
                        <DraggableArtwork
                            baseThumbnailURL={ baseThumbnailURL }
                            artwork={ artwork }
                            type={ type }
                            fullName = { getName(artwork) }
                        />
                        <ImageListItemBar
                            sx = {{ opacity: 0.8 }}
                            title={ getName(artwork) }
                            subtitle={ `${constructDurationForArtwork(artwork)}, ${getType(artwork.type)}` }
                            actionIcon={ getActionIcon( artwork ) }
                        />
                    </ImageListItem>
            ))}
        </ImageList>
    );
}
