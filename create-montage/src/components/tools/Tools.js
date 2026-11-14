import * as React from 'react';
import Box from '@mui/material/Box';
import TitleTool from "./title/TitleTool";
import ZoomAndPanTool from "./zoomAndPan/ZoomAndPanTool";
import AlphaChannelInsertsTool from "./alphaChannelInserts/AlphaChannelInsertsTool";
import { currentTheme } from '../../theme/ThemeUtils';

export default function Tools({ handleFinishToolDragging }) {
    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 200px)', gap: 0.5, p: 0.5, alignContent: 'flex-start' }}>
            <TitleTool />
            <ZoomAndPanTool handleFinishToolDragging={ handleFinishToolDragging } />
            {currentTheme() === 'ooo2' && <AlphaChannelInsertsTool handleFinishToolDragging={ handleFinishToolDragging } />}
        </Box>
    );
}
