import { Tool, ToolContent } from "../Tool";
import * as React from "react";
import { useDrag } from "react-dnd";
import { DragableTypes } from "../../constants/DragableTypes";
import { BinTypes } from "../../constants/BinTypes";
import { ToolTypes } from "../../constants/ToolTypes";
import PictureInPictureAltIcon from '@mui/icons-material/PictureInPictureAlt';

export default function AlphaChannelInsertsTool({ handleFinishToolDragging }) {

    const tool = {
        id: ToolTypes.ALPHA_CHANNEL_INSERTS,
        duration: "5",
        type: BinTypes.TOOL,
        toolType: ToolTypes.ALPHA_CHANNEL_INSERTS,
        displayName: "Alpha Channel Inserts"
    }
    const [{ opacity }, dragRef] = useDrag(
        () => ({
            type: DragableTypes.PLAIN_TOOL,
            item: tool,
            collect: (monitor) => ({
                opacity: monitor.isDragging() ? 0.5 : 1
            }),
            end: (item, monitor) => handleFinishToolDragging(monitor.getDropResult(), tool.toolType),
        }),
        []
    )

    return (
        <Tool
            ref={dragRef}
            variant="outlined"
            square
            style={{ opacity }}
        >
            <ToolContent
                icon={<PictureInPictureAltIcon />}
                title="Alpha Channel Inserts"
                subtitle="experimental"
                infoText="Place an image with specific coordinates behind/in front of a video. Source: image, Target: video of same length. Automated process notifies when placement successful."
                iconColor="#1976d2"
            />
        </Tool>
    )
}