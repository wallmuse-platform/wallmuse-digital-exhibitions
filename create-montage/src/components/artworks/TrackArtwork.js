import { useContext, useRef, useState } from "react"
import { useDrag, useDrop } from 'react-dnd'
import { DragableTypes } from "../constants/DragableTypes";
import {
    ImageListItemBar,
    Tooltip,
    IconButton,
    Paper, Typography
} from "@mui/material";
import * as React from "react";
import ImageListItem from "@mui/material/ImageListItem";
import {
    constructDuration,
    getName,
    isArtwork, isMontage
} from "./ArtworkUtils";
import { EditOutlined } from "@mui/icons-material";
import EditArtworkDialog from "./EditArtworkDialog";
import { isFunctionTool, isTitle } from "../tools/ToolUtils";
import { ToolTypes } from "../constants/ToolTypes";
import Box from "@mui/material/Box";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";
import ExtensionIcon from "@mui/icons-material/Extension";
import { BaseThumbnailContext } from "../../context/ArtworksContext";
import { useTranslation } from "react-i18next";
import { getUserId } from "../../utils/Utils";

const barStyles = {
    "&": {
        opacity: 0.8
    },
    "& > .MuiImageListItemBar-titleWrap": {
        padding: "6px 8px"
    },
    "& > .MuiImageListItemBar-titleWrap > .MuiImageListItemBar-title": {
        fontSize: "0.8rem"
    },
    "& > .MuiImageListItemBar-titleWrap > .MuiImageListItemBar-subtitle": {
        fontSize: "0.7rem",
        fontStyle: "italic",
        color: "#EEE"
    },
    "& > .MuiImageListItemBar-actionIcon > .MuiButtonBase-root": {
        position: "absolute",
        top: "-100px",
        right: "10px",
        color: '#FFF',
        backgroundColor: '#222',
        opacity: "0.7",
        padding: "4px",
    },
    "& > .MuiImageListItemBar-actionIcon > .MuiButtonBase-root > .MuiSvgIcon-root": {
        fontSize: "1rem"
    }
}

const TrackArtwork = function TrackArtwork({ trackId, artwork, index, updateArtwork, updateHoveredByTool, updateFunctionToolProperties }) {
    const sessionId = getUserId();
    const { t } = useTranslation();

    console.log('[TrackArtwork] sessionId:', sessionId);

    const [editDialogOpen, setEditDialogOpen] = React.useState(false);
    const [duration, setDuration] = useState(null)
    const [titleElement, setTitleElement] = useState(artwork.titleElement)

    const handleRemove = () => {
        updateArtwork(index, index, null, true);
        setEditDialogOpen(false);
    };

    const handleOpenEditDialog = () => {
        setEditDialogOpen(true);
    };

    const handleEditDialogSave = () => {
        if (isTitle(artwork)) {
            artwork.titleElement = titleElement;
        }
        updateArtwork(index, index, duration * 1000);
        setEditDialogOpen(false);
    };
    const handleEditDialogClose = () => {
        setEditDialogOpen(false);
    };

    const ref = useRef(null)
    const [{ isDragging }, drag] = useDrag({
        type: DragableTypes.TRACK_ARTWORK,
        item: () => {
            return { trackId, index }
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        })
    }, [updateArtwork, trackId, artwork, index])
    const [{ handlerId }, drop] = useDrop(
        () => ({
            accept: [DragableTypes.TRACK_ARTWORK, DragableTypes.PLAIN_TOOL],
            collect(monitor) {
                return {
                    handlerId: monitor.getHandlerId(),
                }
            },
            hover(item, monitor) {
                if (!ref.current) {
                    return
                }
                const dragIndex = item.index;
                const hoverIndex = index
                // Don't replace items with themselves
                if (dragIndex === hoverIndex) {
                    return
                }
                // Determine rectangle on screen
                const hoverBoundingRect = ref.current?.getBoundingClientRect()
                // Get horizontal middle
                const hoverMiddleX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
                // Determine mouse position
                const clientOffset = monitor.getClientOffset()
                // Get pixels to the left
                const hoverClientX = clientOffset.x - hoverBoundingRect.left;
                // Only perform the move when the mouse has crossed half of the items width
                // When dragging rightwards, only move when the cursor is after 50%
                // When dragging leftwards, only move when the cursor is before 50%
                // Dragging rightwards
                if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX) {
                    return;
                }
                // Dragging leftwards
                if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX) {
                    return;
                }
                if (isFunctionTool(item)) {
                    updateHoveredByTool(artwork, item.toolType)
                    return;
                }
                updateArtwork(dragIndex, hoverIndex)
                item.index = hoverIndex
            },
            drop: () => {
                return artwork;
            }
        }),
        [updateArtwork, artwork, index, trackId]
    );

    const opacity = isDragging ? 0 : 1;
    const border = artwork.hoveredByTool === ToolTypes.ZOOM_AND_PAN ? "5px #2adb68 solid" :
        (artwork.hoveredByTool === ToolTypes.SPACE_IMAGE ? "5px #8f2883 solid" :
            (artwork.hoveredByTool === ToolTypes.ALPHA_CHANNEL_INSERTS ? "5px #1976d2 solid" : "none"));
    const width = artwork.hoveredByTool ? "140px" : "150px";
    const height = artwork.hoveredByTool ? "140px" : "150px";

    drag(drop(ref))
    const thumbnailId = isArtwork(artwork) ? artwork.id : artwork.thumbnail_url;
    const altText = isArtwork(artwork) ? artwork.display_title : artwork.name;

    const renderEditIcon = (artwork) => {
        return (
            <Tooltip title={ t("track.artwork.edit") }>
                <IconButton
                    aria-label={ `${t("track.artwork.edit-properties")} "${getName(artwork)}"` }
                    onClick={ handleOpenEditDialog }
                >
                    <EditOutlined/>
                </IconButton>
            </Tooltip>
        )
    }

    const handleDurationChange = ( duration ) => {
        setDuration(duration)
        if (isTitle(artwork)) {
            const oldDisplayProps = {...titleElement}
            oldDisplayProps.duration = duration;
            setTitleElement(oldDisplayProps);
        }
    };

    const functionToolStyles = {
        cursor: "pointer", fontSize: 20, position: "absolute", top: "10px", backgroundColor: "#FFF"
    }
    const renderFunctionToolIcon = artwork => {
        let left = "10px"
        const icons = []
        if (artwork.zoomAndPan) {
            icons.push(
                <CenterFocusStrongIcon onClick={() => updateFunctionToolProperties(ToolTypes.ZOOM_AND_PAN, artwork)}
                                       key={ 1 }
                                       sx={{ ...functionToolStyles, color: "#2adb68", left }} />
            )
            left="35px"
        }
        if (artwork.spaceImageProperties) {
            icons.push(
                <ExtensionIcon onClick={() => updateFunctionToolProperties(ToolTypes.SPACE_IMAGE, artwork)}
                               key={ 2 }
                               sx={{ ...functionToolStyles, color: "#8f2883", left }} />
            )
        }
        return icons;
    }

    const baseThumbnailURL = useContext(BaseThumbnailContext)
    return (
        <ImageListItem
            ref={ref}
            data-handler-id={handlerId}
            style={{ width, height, opacity, border, flexShrink: "0" }}
        >
            {
                isArtwork(artwork) || isMontage(artwork) ? (
                <Tooltip title={ getName(artwork) }>
                    <Box style={ { width: "100%", height: "100%" } }>
                        {
                            renderFunctionToolIcon(artwork)
                        }
                        <img
                            style={ { objectFit: "cover", width: "100%", height: "100%" } }
                            src={ `${ baseThumbnailURL }&session=${ sessionId }&artwork=${ thumbnailId }` }
                            srcSet={ `${ baseThumbnailURL }&session=${ sessionId }&artwork=${ thumbnailId }` }
                            alt={ altText }
                            loading="lazy"
                            className="wm-artwork"
                        />
                    </Box>
                </Tooltip>
                ) : (
                    <Paper variant="outlined" square
                           style={{textAlign: 'center', height: "100%", cursor: "move" }} >
                        <Typography style={{lineHeight: "120px", height: "100%", textAlign: 'center'}} variant="body2">
                            { t("track.title.title") }
                        </Typography>
                    </Paper>
                )
            }
            <ImageListItemBar
                sx = { barStyles }
                title={ getName(artwork) }
                subtitle={ `Ends: ${constructDuration(artwork.endTime)}` }
                actionIcon={ renderEditIcon(artwork) }
            />
            <EditArtworkDialog
                artwork={ artwork }
                handleDurationChange={ handleDurationChange }
                editDialogOpen={ editDialogOpen }
                handleEditDialogClose={ handleEditDialogClose }
                handleEditDialogSave={ handleEditDialogSave }
                handleRemove={ handleRemove }
                titleElement={ titleElement }
                setTitleElement={ setTitleElement }
            />
        </ImageListItem>
    )
}

export default TrackArtwork;
