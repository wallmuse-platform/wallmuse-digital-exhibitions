import * as React from 'react';
import { Stack } from "@mui/material";
import TitleTool from "./title/TitleTool";
import ZoomAndPanTool from "./zoomAndPan/ZoomAndPanTool";
import AlphaChannelInsertsTool from "./alphaChannelInserts/AlphaChannelInsertsTool";

export default function Tools({ handleFinishToolDragging }) {

    return (
        <Stack
            sx={{ overflowY: "visible"}}
            cols={1}
        >
            <TitleTool />
            <ZoomAndPanTool handleFinishToolDragging={ handleFinishToolDragging } />
            {/*<SpaceImageTool handleFinishToolDragging={ handleFinishToolDragging } />*/}
            <AlphaChannelInsertsTool handleFinishToolDragging={ handleFinishToolDragging } />
        </Stack>
    );
}
