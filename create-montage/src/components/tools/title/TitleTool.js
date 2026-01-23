import { Tool, ToolContent } from "../Tool";
import * as React from "react";
import { useDrag } from "react-dnd";
import { DragableTypes } from "../../constants/DragableTypes";
import { BinTypes } from "../../constants/BinTypes";
import { ToolTypes } from "../../constants/ToolTypes";
import TitleIcon from '@mui/icons-material/Title';
import { useTranslation } from 'react-i18next';


export default function TitleTool() {

    const { t } = useTranslation();

    const artwork = {
        id: ToolTypes.TITLE,
        duration: "5",
        type: BinTypes.TOOL,
        toolType: ToolTypes.TITLE,
        displayName: t("tools.title")
    }
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

    return (
        <Tool
            ref={dragRef}
            variant="outlined"
            square
            style={{ opacity }}
        >
            <ToolContent
                icon={<TitleIcon />}
                title={t("tools.title.bin.label")}
                infoText={t("tools.title.bin.tooltip")}
                iconColor="#1976d2"
            />
        </Tool>
    )
}