import { Tool, ToolContent } from "../Tool";
import * as React from "react";
import { useDrag } from "react-dnd";
import { DragableTypes } from "../../constants/DragableTypes";
import { BinTypes } from "../../constants/BinTypes";
import { ToolTypes } from "../../constants/ToolTypes";
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import { useTranslation } from 'react-i18next';

export default function ZoomAndPanTool({ handleFinishToolDragging }) {

    const { t } = useTranslation();

    const tool = {
        id: ToolTypes.ZOOM_AND_PAN,
        duration: "5",
        type: BinTypes.TOOL,
        toolType: ToolTypes.ZOOM_AND_PAN,
        displayName: t("tools.zoom-and-pan")
    }
    const [{ opacity }, dragRef] = useDrag(
        () => ({
            type: DragableTypes.PLAIN_TOOL,
            item: tool,
            collect: (monitor) => ({
                opacity: monitor.isDragging() ? 0.5 : 1,
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
                icon={<CenterFocusStrongIcon />}
                title={t("tools.zoom-and-pan")}
                subtitle="experimental"
                infoText={t("tools.zoom-and-pan.desc")}
                iconColor="#2adb68"
            />
        </Tool>
    )
}