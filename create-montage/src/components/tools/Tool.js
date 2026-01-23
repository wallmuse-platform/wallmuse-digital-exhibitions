import { Paper, Box, Typography, IconButton, styled } from "@mui/material";
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

// Styled Paper component for the tool card
export const Tool = styled(Paper)(({ theme }) => ({
    ...theme.typography.body2,
    textAlign: 'center',
    color: theme.palette.text.secondary,
    width: 200,
    height: 200,
    margin: "10px auto",
    cursor: "move",
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: theme.spacing(2),
    boxSizing: 'border-box',
    border: `1px solid ${theme.palette.divider}`,
}));

// Tool content wrapper with icon, title, and subtitle
export function ToolContent({ icon, title, subtitle, infoText, iconColor = "#1976d2" }) {
    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            gap: 1
        }}>
            {/* Icon container */}
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: '0 0 auto',
                '& svg': {
                    fontSize: 64,
                    color: iconColor
                }
            }}>
                {icon}
            </Box>

            {/* Text container */}
            <Box sx={{ textAlign: 'center' }}>
                <Typography
                    variant="body1"
                    component="div"
                    sx={{
                        fontWeight: 500,
                        lineHeight: 1.3,
                        color: 'text.primary'
                    }}
                >
                    {title}
                </Typography>
                {subtitle && (
                    <Typography
                        variant="caption"
                        component="div"
                        sx={{
                            fontStyle: 'italic',
                            color: 'text.secondary',
                            mt: 0.5
                        }}
                    >
                        {subtitle}
                    </Typography>
                )}
            </Box>

            {/* Info button */}
            {infoText && (
                <IconButton
                    size="small"
                    sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        opacity: 0.6,
                        '&:hover': {
                            opacity: 1
                        }
                    }}
                    title={infoText}
                >
                    <InfoOutlinedIcon fontSize="small" />
                </IconButton>
            )}
        </Box>
    );
}