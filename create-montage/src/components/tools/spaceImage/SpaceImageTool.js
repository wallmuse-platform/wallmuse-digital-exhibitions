import { Tool, ToolContent } from "../Tool";
import * as React from "react";
import { useDrag } from "react-dnd";
import { DragableTypes } from "../../constants/DragableTypes";
import { BinTypes } from "../../constants/BinTypes";
import { ToolTypes } from "../../constants/ToolTypes";
import ViewColumnIcon from '@mui/icons-material/ViewColumn';

export default function SpaceImageTool({ handleFinishToolDragging }) {

    const tool = {
        id: ToolTypes.SPACE_IMAGE,
        duration: "5",
        type: BinTypes.TOOL,
        toolType: ToolTypes.SPACE_IMAGE,
        displayName: "Space Image"
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
                icon={<ViewColumnIcon />}
                title="Space Image"
                subtitle="experimental"
                infoText="Split high-resolution images across multiple tracks for multi-screen displays"
                iconColor="#8f2883"
            />
        </Tool>
    )
}