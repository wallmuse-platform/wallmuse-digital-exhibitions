import React from 'react'
import { useDrag } from 'react-dnd'
import {DragableTypes} from "../constants/DragableTypes";
import {BinTypes} from "../constants/BinTypes";
import {Tooltip} from "@mui/material";
import { useContext } from 'react';
import { BaseThumbnailContext } from "../../context/ArtworksContext";
import { getUserId } from '../../utils/Utils';

/**
 * Your Component
 */
export default function DraggableArtwork({ artwork, type, fullName }) {
    const sessionId = getUserId();
    console.log('[Draggable Artwork] sessionId:', sessionId);
    const baseThumbnailURL = useContext(BaseThumbnailContext);

    const [{ opacity }, dragRef] = useDrag(
        () => ({
            type: DragableTypes.ARTWORK,
            item: { artwork },
            collect: (monitor) => ({
                opacity: monitor.isDragging() ? 0.5 : 1,
                width: monitor.isDragging() ? 50 : 100,
                height: monitor.isDragging() ? 50 : 100,
            })
        }),
        []
    )
    const thumbnailId = type === BinTypes.ARTWORK ? artwork.id : artwork.thumbnail_url;
    return (
        <Tooltip title={ fullName }>
            <img
                ref={dragRef} style={{ opacity, objectFit: "cover", width: "100%", height: "100%" }}
                src={`${baseThumbnailURL}&session=${sessionId}&artwork=${thumbnailId}`}
                srcSet={`${baseThumbnailURL}&session=${sessionId}&artwork=${thumbnailId}`}
                alt={artwork.display_title}
                loading="lazy"
                className="wm-artwork"
            />
        </Tooltip>
    )
}
