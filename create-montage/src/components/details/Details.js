import React, { useEffect, useState } from 'react';
import "./Details.css"
import Box from "@mui/material/Box";
import {
    Button,
    ButtonGroup,
    Card,
    CardContent,
    Stack,
    TextField,
    Tooltip,
    Typography, useTheme
} from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import Categories from "../categories/Categories";
import LanguageSelector from "./LanguageSelector";
import SCCheckbox from "./SCCheckbox";
import Descriptions from "./Descriptions";
import Rights from "./Rights";
import { useContext } from 'react';
import { BaseThumbnailContext } from "../../context/ArtworksContext";
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import DeleteIcon from '@mui/icons-material/Delete';
import { rootElement } from "../../utils/Utils";
import { FullscreenExit } from "@mui/icons-material";
import SaveAsIcon from "@mui/icons-material/SaveAs";
import SaveIcon from "@mui/icons-material/Save";
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import Grow from '@mui/material/Grow';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import { OperationTypes } from "../constants/OperationTypes";
import { useTranslation } from 'react-i18next';
import { currentTheme } from "../../theme/ThemeUtils.js";
import { getUserId } from '../../utils/Utils';

export default function Details({ thumbnail, name, setName, setCategories, checkedCategories, language, setLanguage, suitableForChildren, setSuitableForChildren,
                                    descriptions, setDescriptions, rights, setRights, numberOfTracks, clearAll, save, deleteMont,
                                    currentRight, setCurrentRight, currentRightCountry, setCurrentRightCountry,
                                    currentDescription, setCurrentDescription,
                                    currentDescriptionLang, setCurrentDescriptionLang,
                                    currentDescriptionName, setCurrentDescriptionName,
                                    operation, editMontageReady
                                }) {
    const sessionId = getUserId();
    const { t } = useTranslation();
    const theme = useTheme();

    const detailsGridStyles = {
        borderRight: "1px dashed", borderColor: theme.palette.primary.main, padding: "0 12px"
    }

    const [fullScreen, setFullScreen] = useState(false);

    const escapeHandler = () => {
        if (!document.fullscreenElement) {
            setFullScreen(false);
        }
    };

    useEffect(() => {
        document.addEventListener('webkitfullscreenchange', escapeHandler, false);
        document.addEventListener('mozfullscreenchange', escapeHandler, false);
        document.addEventListener('fullscreenchange', escapeHandler, false);
        document.addEventListener('MSFullscreenChange', escapeHandler, false);
        return () => {
            document.removeEventListener('webkitfullscreenchange', escapeHandler, false);
            document.removeEventListener('mozfullscreenchange', escapeHandler, false);
            document.removeEventListener('fullscreenchange', escapeHandler, false);
            document.removeEventListener('MSFullscreenChange', escapeHandler, false);
        };
    }, []);


    console.log('[Detail] sessionId:', sessionId);

    function handleNameChange(event) {
        setName(event.target.value)
    }

    const baseThumbnailURL = useContext(BaseThumbnailContext);

    const handleFullScreenChange = () => {
        if (fullScreen) {
            document.exitFullscreen();
            setFullScreen(false);
        } else {
            rootElement.requestFullscreen();
            setFullScreen(true);
        }
    }

    const [saveOptionsOpen, setSaveOptionsOpen] = React.useState(false);
    const anchorRef = React.useRef(null);

    const handleToggle = () => {
        setSaveOptionsOpen((prevOpen) => !prevOpen);
    };

    const handleSaveOptionsClose = (event) => {
        if (anchorRef.current && anchorRef.current.contains(event.target)) {
            return;
        }

        setSaveOptionsOpen(false);
    };

    return (
        <Box
            sx={{ border: 1, borderLeft: 0, borderColor: theme.palette.primary.main, borderRadius: "0 5px 0 0", minHeight: "100%", maxHeight: '100%', overflow: "auto"}}
        >
            <Grid
                container
                className="details-grid"
                justify="space-between"
                sx={{padding: "1% 0"}}
            >
                <Grid item xs={2} sx={ detailsGridStyles } >
                    {thumbnail == null
                        ?
                        <Card
                            sx={{
                                width: "100%",
                                height: "100%",
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center'
                            }}>
                            <CardContent>
                                <Typography
                                    variant="body2"
                                    color="text.secondary">
                                    { t("details.select-thumb." + currentTheme()) }
                                </Typography>
                            </CardContent>
                        </Card>
                        :
                        <img
                            src={`${baseThumbnailURL}&session=${sessionId}&artwork=${thumbnail.id}`}
                            alt={`Montage thumbnail: ${thumbnail.title}`}
                            title={`Montage thumbnail: ${thumbnail.title}`}
                            style={{ objectFit: "cover", width: "80%", height: "auto", display: "block", margin: "0 auto" }}
                        />
                    }
                </Grid>
                <Grid item xs={3} sx={ detailsGridStyles }>
                    <Stack spacing={1}>
                        <Typography variant="subtitle1">Main details</Typography>
                        <TextField id="standard-basic" placeholder="Montage name" variant="standard" value={ name } onChange={ handleNameChange }/>
                        <LanguageSelector language={language} handleLanguageChange={setLanguage} textLabel="Language" />
                        <Categories setCategories={setCategories} checkedCategories={ checkedCategories } variant="standard"/>
                        <SCCheckbox suitableForChildren={suitableForChildren} setSuitableForChildren={ setSuitableForChildren }/>
                    </Stack>
                </Grid>
                <Grid item xs={3} sx={ detailsGridStyles }>
                    <Descriptions
                        descriptions={ descriptions } setDescriptions={setDescriptions}
                        currentDescription={ currentDescription} setCurrentDescription={ setCurrentDescription }
                        currentDescriptionLang={ currentDescriptionLang } setCurrentDescriptionLang={ setCurrentDescriptionLang }
                        currentDescriptionName={ currentDescriptionName } setCurrentDescriptionName={ setCurrentDescriptionName }
                    />
                </Grid>
                <Grid item xs={2} sx={ detailsGridStyles }>
                    <Rights
                        rights={ rights } setRights={ setRights }
                        currentRight={ currentRight } setCurrentRight={ setCurrentRight }
                        currentRightCountry={ currentRightCountry } setCurrentRightCountry={ setCurrentRightCountry }
                        rightsLabel = {t("rights")} countryLabel = {t("countries")}
                        selectVariant = {'standard'} rightsDirection= {"column"}
                        formControlHeight = {'30px'}
                    />
                </Grid>
                <Grid item xs={2} sx={{ position: "relative", padding: "0 12px" }}>
                    <Stack spacing={1}>
                        {
                            !fullScreen ? (
                                    <Tooltip title="Enter full screen">
                                        <Typography align='right'>
                                            <FullscreenIcon sx={{ fontSize: 30 }} color="primary" align='right' onClick={ handleFullScreenChange } />
                                        </Typography>
                                    </Tooltip>
                                ) : (
                                <Tooltip title="Exit full screen">
                                    <Typography align='right'>
                                        <FullscreenExit sx={{ fontSize: 30 }} color="primary" align='right' onClick={ handleFullScreenChange } />
                                    </Typography>
                                </Tooltip>
                            )
                        }
                        <Typography variant="subtitle1" style={{flex: 1}} align='right'>
                            { t("details.number-of-tracks") + numberOfTracks }
                        </Typography>
                        <Stack direction="row" spacing={2} className="wm-save-btn"
                               sx={{position: "absolute", bottom: "10px", right: "10px"}}
                        >
                            {operation === OperationTypes.CREATE ? (
                                <React.Fragment>
                                    <Button color="secondary" onClick={ () => clearAll() }>{ t("action.clear") }</Button>
                                    <Button variant="contained" onClick={ () => save(true) } sx={{marginLeft: "6px"}}>
                                        { t("action.save") }
                                    </Button>
                                </React.Fragment>) : (
                                <React.Fragment>
                                    <ButtonGroup disabled={!editMontageReady} variant="contained" ref={anchorRef} aria-label="split button">
                                        <Button onClick={ () => save(false) }><SaveIcon />{ t("action.save") }</Button>
                                        <Button
                                            size="small"
                                            aria-controls={saveOptionsOpen ? 'split-button-menu' : undefined}
                                            aria-expanded={saveOptionsOpen ? 'true' : undefined}
                                            aria-label="select merge strategy"
                                            aria-haspopup="menu"
                                            onClick={handleToggle}
                                            className="save-options-button"
                                        >
                                            <ArrowDropDownIcon />
                                        </Button>
                                    </ButtonGroup>
                                    <Popper
                                        sx={{
                                            zIndex: 1,
                                        }}
                                        open={saveOptionsOpen}
                                        anchorEl={anchorRef.current}
                                        role={undefined}
                                        transition
                                        disablePortal
                                    >
                                        {({ TransitionProps, placement }) => (
                                            <Grow
                                                {...TransitionProps}
                                                style={{
                                                    transformOrigin:
                                                        placement === 'bottom' ? 'center top' : 'center bottom',
                                                }}
                                            >
                                                <Paper>
                                                    <ClickAwayListener onClickAway={handleSaveOptionsClose}>
                                                        <MenuList id="split-button-menu" autoFocusItem sx={{ textTransform: "uppercase"}}>
                                                            <MenuItem color="success"
                                                                onClick={ () => save(true) }
                                                            >
                                                                <SaveAsIcon /> { t("action.save-new") }
                                                            </MenuItem>
                                                            <MenuItem onClick={ clearAll } >
                                                                <ClearAllIcon /> { t("action.clear") }
                                                            </MenuItem>
                                                            <MenuItem style={{color: "#ab003c"}} onClick={ deleteMont } >
                                                                <DeleteIcon /> { t("action.delete") }
                                                            </MenuItem>
                                                        </MenuList>
                                                    </ClickAwayListener>
                                                </Paper>
                                            </Grow>
                                        )}
                                    </Popper>
                                </React.Fragment> )
                            }
                       </Stack>
                    </Stack>
                </Grid>

            </Grid>
        </Box>

    )
}