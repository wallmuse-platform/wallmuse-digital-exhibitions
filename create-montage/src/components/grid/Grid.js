import React, {useEffect, useState} from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Unstable_Grid2';
import SearchArea from "../searchArea/SearchArea";
import {
    countArtworks,
    countMontages, deleteMontage,
    getAllMontagesFull,
    getMontageFull, getUser,
    saveMontages,
    searchArtworks,
    searchMontages
} from "../../api";
import ArtworkList from "../artworks/ArtworkList";
import Details from "../details/Details";
import { Alert, CircularProgress, Snackbar } from "@mui/material";
import "./Grid.css"
import Tracks from "../tracks/Tracks";
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { BinTypes } from "../constants/BinTypes";
import * as PropTypes from "prop-types";
import { ErrorDialog } from "./ErrorDialog";
import { SaveDialog } from "./SaveDialog";
import { ClearDialog } from "./ClearDialog";
import { constructMontageToSave, calculateTrackEndTime, validate } from "../../utils/SaveUtils"
import Tools from "../tools/Tools";
import ZoomAndPanDialog from "../tools/zoomAndPan/ZoomAndPanDialog";
import {
    constructDefaultAlphaChannelInsertProperties,
    constructDefaultSpaceImageProperties,
    constructDefaultZoomAndPan
} from "../tools/ToolUtils";
import { ToolTypes } from "../constants/ToolTypes";
import SpaceImageDialog from "../tools/spaceImage/SpaceImageDialog";
import { artworkIsImage, calculateImageOrientationAndResolution } from "../artworks/ArtworkUtils";
import { OperationTypes } from "../constants/OperationTypes";
import { decomposeDroppedMontage } from "../artworks/MontageUtils";
import { DeleteDialog } from "./DeleteDialog";
import { Literals } from "../constants/Literals";
import AlphaChannelInsertsDialog from "../tools/alphaChannelInserts/AlphaChannelInsertsDialog";
import { selectTheme, currentTheme } from "../../theme/ThemeUtils";
import { useTranslation } from 'react-i18next';

ErrorDialog.propTypes = {
    errors: PropTypes.arrayOf(PropTypes.any),
    onClose: PropTypes.func,
    callbackfn: PropTypes.func
};

export default function BasicGrid() {

    const { t } = useTranslation();

    const topGridStyles = {
        minHeight: "31vh",
    }

    const bottomGridStyles = {
        height: "67vh",
        maxHeight: "67vh",
        overflow: "auto",
    }

    const [currentUser, setCurrentUser] = useState([]);
    const [artworks, setArtworks] = useState([]);
    const [montages, setMontages] = useState([]);
    const [selectedChip, setSelectedChip] = useState("1")
    const [searchTerm, setSearchTerm] = useState("");
    const [searchCategories, setSearchCategories] = useState([]);
    const [operation, setOperation] = useState(OperationTypes.CREATE);
    const [newOperation, setNewOperation] = useState(null);
    const [element, setElement] = useState(BinTypes.ARTWORK);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [countElement, setCountElement] = useState(0);
    const [loading, setLoading] = useState(true);
    const [confirmClear, setConfirmClear] = useState(false);
    const [deleteSuccess, setDeleteSuccess] = useState(false);
    const [deleteError, setDeleteError] = useState(null);
    const [deleteInProgress, setDeleteInProgress] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [saveInProgress, setSaveInProgress] = useState(false);

    const [currentlyEditingMontage, setCurrentlyEditingMontage] = useState(null);
    const [thumbnail, setThumbnail] = useState(null);
    const [name, setName] = useState("");
    const [categories, setCategories] = useState(null);
    const [language, setLanguage] = useState(null);
    const [suitableForChildren, setSuitableForChildren] = useState(true);
    const [descriptions, setDescriptions] = useState(null)
    const [rights, setRights] = useState(null)
    const [trackArtworks, setTrackArtworks] = useState([[]])
    const [droppedMontages, setDroppedMontages] = useState(null)

    const [currentRight, setCurrentRight] = useState(-11);
    const [currentRightCountry, setCurrentRightCountry] = useState(Literals.ALL);
    const [currentDescription, setCurrentDescription] = useState(null);
    const [currentDescriptionLang, setCurrentDescriptionLang] = useState(null);
    const [currentDescriptionName, setCurrentDescriptionName] = useState(null);

    const [zoomAndPanImage, setZoomAndPanImage] = useState(null)
    const [spacedImage, setSpacedImage] = useState(null)
    const [alphaChannelInsertImage, setAlphaChannelInsertImage] = useState(null)

    const [errors, setErrors] = React.useState([]);
    const [saveNew, setSaveNew] = React.useState(false);
    const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

    const handleOperationChange = (event, newOperation) => {
        if (newOperation !== null && newOperation !== operation) {
            if (isPristine()) {
                doClearAll(true, newOperation)
            } else {
                setNewOperation(newOperation);
                setConfirmClear(true);
            }
        }
    };

    const handleSearchTermChange = searchTerm => {
        setSearchTerm(searchTerm);
        setPage(0)
    }
    const handleSearchCategoriesChange = searchCategories => {
        setSearchCategories(searchCategories);
        setPage(0)
    }
    const handleElementChange = (event, newElement) => {
        if (newElement != null) {
            setElement(newElement);
        }
    };

    const calculateNumberOfTracks = () => trackArtworks.filter(track => track.length > 0).length;

    useEffect(() => {
        console.log('[Grid] currentUser state changed to:', currentUser);
        console.log('[Grid] currentUser.id:', currentUser?.id);
    }, [currentUser]);


    useEffect(() => {
        let desc = selectedChip === "1" ? searchTerm : null;
        let keywords = selectedChip === "2" ? searchTerm : null;
        let author = selectedChip === "3" ? searchTerm : null;
        const cats = searchCategories.map(c => c.id).join(',');
        setLoading(true)

        if (element === BinTypes.ARTWORK) {
            (async () => {
                const count = await countArtworks(desc, keywords, author, cats);
                setCountElement(count)
            })();

            (async () => {
                const result = await searchArtworks(desc, keywords, author, cats, page, rowsPerPage);
                setLoading(false)
                result.forEach(artwork => artwork.tagName = BinTypes.ARTWORK)
                setArtworks(result);
            })();

        } else if (element === BinTypes.MONTAGE) {
            if (operation === OperationTypes.MODIFY) {
                (async () => {
                    const result = await getAllMontagesFull(0, 500);
                    setLoading(false)
                    result.forEach(artwork => artwork.tagName = BinTypes.MONTAGE)
                    setCountElement(result.length)
                    setMontages(result);
                })();
            } else {
                (async () => {
                    const count = await countMontages(desc, keywords, author, cats);
                    setCountElement(count)
                })();

                (async () => {
                    const result = await searchMontages(desc, keywords, author, cats, page, rowsPerPage);
                    setLoading(false)
                    result.forEach(artwork => artwork.tagName = BinTypes.MONTAGE)
                    setMontages(result);
                })();
            }
        } else {
            setLoading(false)
        }
    }, [element, searchTerm, page, rowsPerPage, searchCategories, selectedChip, operation]);

    const isPristine = () => (trackArtworks.length === 0 || (trackArtworks.length === 1 && trackArtworks[0].length === 0)) &&
        !name && !thumbnail && !categories && !language && !descriptions && !rights;
    const clearAll = () => {
        setConfirmClear(true);
    }

    const doClearAll = (confirmed, forcedNewOperation) => {
        setConfirmClear(false);
        if (!confirmed) {
            return
        }
        setThumbnail(null);
        setName("");
        setCategories(null);
        setLanguage(null);
        setSuitableForChildren(true);
        setDescriptions(null);
        setRights(null);
        setCurrentDescription(null);
        setCurrentDescriptionLang(null);
        setCurrentDescriptionName(null);
        setCurrentRight(-11);
        setCurrentRightCountry(Literals.ALL);
        setTrackArtworks([[]]);
        setCurrentlyEditingMontage(null);
        let newElement = BinTypes.ARTWORK;
        setElement(BinTypes.ARTWORK)
        const newOp = newOperation || forcedNewOperation
        if (newOp) {
            if (newOp === OperationTypes.MODIFY) {
                newElement = BinTypes.MONTAGE;
            }
            setOperation(newOp);
            setNewOperation(null);
        } else {
            setOperation(OperationTypes.CREATE);
        }
        setElement(newElement)
    }

    const deleteMont = () => {
        setDeleteDialogOpen(true)
    }
    const doDelete = async () => {
        setDeleteInProgress(true);
        setDeleteSuccess(false);
        setDeleteError(null);

        deleteMontage(currentUser.id, currentlyEditingMontage.id)
            .then(function (response) {
                setDeleteInProgress(false)
                setDeleteDialogOpen(false)
                if (response.status >= 400) {
                    setDeleteError(`${ t("error") }: ${ response.statusText }`)
                } else {
                    const result = response.data;
                    if (result.code && result.message) {
                        setDeleteError(`${ t("error") }: ${ result.code }: ${ result.message }`)
                    } else {
                        setDeleteSuccess(true)
                        doClearAll(true)
                    }
                }
            })
            .catch(function (error) {
                setDeleteInProgress(false)
                setDeleteDialogOpen(false)
                setDeleteError(`${ t("error") }: ${ error.message }. ${ t("error.generic") }`)
            });
    }


    const save = (saveNew) => {
        if (validate(name, thumbnail, trackArtworks, setErrors) && errors.length === 0) {
            setSaveDialogOpen(true)
            setSaveNew(saveNew)
        }
    }

    const cancelSave = () => setSaveDialogOpen(false)
    const cancelDelete = () => setDeleteDialogOpen(false)
    const confirmSave = async () => {
        setSaveInProgress(true);
        setSaveSuccess(false);
        setSaveError(null);

        const montage = constructMontageToSave(name, thumbnail, suitableForChildren, trackArtworks, language, descriptions, rights, categories, droppedMontages);

        if (operation === OperationTypes.MODIFY && currentlyEditingMontage && !saveNew) {
            montage.id = currentlyEditingMontage.id;
        }
        saveMontages(montage)
            .then(function (response) {
                setSaveInProgress(false)
                setSaveDialogOpen(false)
                if (response.status >= 400) {
                    setSaveError(`${ t("error") }: ${ response.statusText }`)
                } else {
                    const result = response.data;
                    if (result.code && result.message) {
                        setSaveError(`${ t("error") }: ${ result.code }: ${ result.message }`)
                    } else {
                        setSaveSuccess(true)
                        doClearAll(true)
                    }
                }
            })
            .catch(function (error) {
                setSaveInProgress(false)
                setSaveDialogOpen(false)
                setSaveError(`${ t("error") }: ${ error.message }. ${ t("error.generic") }`)
            });
    }

    const addDroppedMontage = async montageId => {
        const montageFull = await getMontageFull(montageId);
        if (montageFull && montageFull["seqs"]) {
            setDroppedMontages(previousMontages => {
                const newMontages = { ...previousMontages }
                newMontages[montageId] = montageFull["seqs"]
                return newMontages
            })
        }
    }

    const handleFinishFunctionToolDragging = (artwork, toolType) => {
        if (!artwork) {
            return;
        }
        setTrackArtworks(previousTrackArtworks => {
            const newTrackArtworks = [...previousTrackArtworks];
            newTrackArtworks.forEach((track) => track.forEach(a => {
                a.hoveredByTool = null;
                if (a.trackId === artwork.trackId) {
                    updateFunctionToolProperties(toolType, artwork);
                }
            }))
            return newTrackArtworks;
        });
    }

    const updateFunctionToolProperties = (toolType, artwork) => {
        switch (toolType) {
            case ToolTypes.ZOOM_AND_PAN:
                if (!artworkIsImage(artwork)) {
                    return;
                }
                let zoomAndPan = artwork.zoomAndPan;
                if (!zoomAndPan) {
                    zoomAndPan = constructDefaultZoomAndPan();
                }
                setZoomAndPanImage({ ...artwork, zoomAndPan });
                break;
            case ToolTypes.SPACE_IMAGE:
                if (!artworkIsImage(artwork)) {
                    return;
                }
                let spaceImageProperties = artwork.spaceImageProperties;
                if (!spaceImageProperties) {
                    spaceImageProperties = constructDefaultSpaceImageProperties(artwork.droppedTrack);
                    calculateImageOrientationAndResolution(artwork)
                }
                setSpacedImage({ ...artwork, spaceImageProperties });
                break;
            case ToolTypes.ALPHA_CHANNEL_INSERTS:
                let alphaChannelInsertsProperties = artwork.alphaChannelInsertsProperties;
                if (!alphaChannelInsertsProperties) {
                    alphaChannelInsertsProperties = constructDefaultAlphaChannelInsertProperties();
                }
                setAlphaChannelInsertImage({ ...artwork, alphaChannelInsertsProperties });
                break;
            default:
                break;
        }
    }

    const updateImageZoomAndPan = artwork => {
        setTrackArtworks(previousTrackArtworks => {
            const newTrackArtworks = [...previousTrackArtworks];
            newTrackArtworks.forEach(track => track.forEach(a => {
                if (a.trackId === artwork.trackId) {
                    a.zoomAndPan = artwork.zoomAndPan;
                }
            }))
            return newTrackArtworks;
        });
    }
    const updateSpaceImageProperties = artwork => {
        setTrackArtworks(previousTrackArtworks => {
            const newTrackArtworks = [...previousTrackArtworks];
            newTrackArtworks.forEach(track => track.forEach(a => {
                if (a.trackId === artwork.trackId) {
                    a.spaceImageProperties = artwork.spaceImageProperties;
                }
            }))
            return newTrackArtworks;
        });
    }
    const updateAlphaChannelInsertsProperties = artwork => {
        setTrackArtworks(previousTrackArtworks => {
            const newTrackArtworks = [...previousTrackArtworks];
            newTrackArtworks.forEach(track => track.forEach(a => {
                if (a.trackId === artwork.trackId) {
                    a.alphaChannelInsertsProperties = artwork.alphaChannelInsertsProperties;
                }
            }))
            return newTrackArtworks;
        });
    }

    const editMontageReady = () => operation === OperationTypes.MODIFY && currentlyEditingMontage !== null;
    const handleEditMontageDrop = async mont => {
        const montage = await getMontageFull(mont.id);
        setCurrentlyEditingMontage(montage);
        const droppedMontage = decomposeDroppedMontage(montage);
        setThumbnail(droppedMontage.thumbnail)
        setName(droppedMontage.name)
        setCategories(droppedMontage.categories)
        setSuitableForChildren(droppedMontage.suitableForChildren)
        setLanguage(droppedMontage.language)
        setDescriptions(droppedMontage.descriptions);
        setRights(droppedMontage.rights)
        setTrackArtworks(droppedMontage.artworks)
    }

    const handleCloseAsyncOpFeedback = () => {
        setSaveError(null);
        setSaveSuccess(false);
        setDeleteError(null);
        setDeleteSuccess(false);
    }
    const asyncFeedbackReceivedMsg = () => {
        return saveError ? saveError : (saveSuccess ? t("success.save." + themeName) : (deleteError ? deleteError : t("success.delete." + themeName)));
    }
    const theme = selectTheme();
    const themeName = currentTheme();

    return (

        <Grid
            className="create-montage-grid"
            container
            columnSpacing={0}
            sx={{
                maxHeight: '97vh',
                minHeight: '97vh',
                minWidth: '1080px',
                overflowX: 'auto'
              }}
        >
            { zoomAndPanImage ? <ZoomAndPanDialog image={ zoomAndPanImage } setImage={ setZoomAndPanImage } updateImageZoomAndPan={ updateImageZoomAndPan } /> : null }
            { spacedImage ? <SpaceImageDialog image={ spacedImage } setImage={ setSpacedImage } updateSpaceImageProperties={ updateSpaceImageProperties } tracks={ trackArtworks } /> : null }
            { alphaChannelInsertImage ? <AlphaChannelInsertsDialog artwork={ alphaChannelInsertImage } setImage={ setAlphaChannelInsertImage } updateAlphaChannelInsertsProperties={ updateAlphaChannelInsertsProperties } tracks={ trackArtworks } /> : null }
            { errors.length > 0 ? <ErrorDialog errors={ errors } onClose={ () => setErrors([]) }/> : null}
            { confirmClear ? <ClearDialog clear={ doClearAll } /> : null}
            { saveDialogOpen ?
                <SaveDialog saveDialogOpen={ saveDialogOpen }
                            confirmSave={ confirmSave }
                            cancelSave={ cancelSave }
                            name={ name }
                            numberOfTracks={ calculateNumberOfTracks() }
                            duration={ calculateTrackEndTime(trackArtworks[0]) }
                            suitableForChildren={ suitableForChildren }
                            saveInProgress = { saveInProgress }
                            themeName = { themeName }
                /> : null }
            { deleteDialogOpen ?
                <DeleteDialog   deleteDialogOpen={ deleteDialogOpen }
                                confirmDelete={ doDelete }
                                cancelDelete={ cancelDelete }
                                name={ name }
                                deleteInProgress = { deleteInProgress }
                /> : null }
            {
                (saveError || deleteError || saveSuccess || deleteSuccess) ? (
                    <Snackbar
                        open={ true }
                        autoHideDuration={ 6000 }
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        onClose={ handleCloseAsyncOpFeedback }>
                        <Alert
                            severity={ saveError || deleteError ? "error" : "success" }
                            onClose={ handleCloseAsyncOpFeedback }
                        >
                            { asyncFeedbackReceivedMsg() }
                        </Alert>
                    </Snackbar>
                ) : null
            }

            <Grid xs={3} sm={3} md={3} lg={2.5} sx={ topGridStyles } justifyContent="center">
                <SearchArea
                    operation={operation}
                    handleOperationChange={ handleOperationChange }
                    element={element}
                    handleElementChange={handleElementChange}
                    elementsCount={countElement}
                    page={page}
                    setPage={setPage}
                    rowsPerPage={rowsPerPage}
                    setRowsPerPage={setRowsPerPage}
                    term={searchTerm}
                    handleSearchTermChange={ handleSearchTermChange }
                    searchCategories={searchCategories}
                    handleSearchCategoriesChange={ handleSearchCategoriesChange }
                    selectedChip={selectedChip}
                    setSelectedChip={setSelectedChip}
                    currentlyEditingMontage={ currentlyEditingMontage }
                />
            </Grid>
            <Grid xs={9} sm={9} md={9} lg={9.5} sx={ topGridStyles } >
                <Details
                    thumbnail={thumbnail}
                    name={name}
                    setName={setName}
                    setThumbnail={setThumbnail}
                    setCategories={setCategories}
                    checkedCategories={ categories }
                    language={language}
                    setLanguage={setLanguage}
                    suitableForChildren={suitableForChildren}
                    setSuitableForChildren={setSuitableForChildren}
                    descriptions={descriptions}
                    setDescriptions={setDescriptions}
                    rights={rights}
                    setRights={setRights}
                    currentRight={currentRight}
                    setCurrentRight={setCurrentRight}
                    currentRightCountry={currentRightCountry}
                    setCurrentRightCountry={setCurrentRightCountry}
                    currentDescription={currentDescription}
                    setCurrentDescription={setCurrentDescription}
                    currentDescriptionLang={currentDescriptionLang}
                    setCurrentDescriptionLang={setCurrentDescriptionLang}
                    currentDescriptionName={ currentDescriptionName }
                    setCurrentDescriptionName={ setCurrentDescriptionName }
                    numberOfTracks={ calculateNumberOfTracks() }
                    clearAll={ clearAll }
                    deleteMont={ deleteMont }
                    save={ save }
                    operation = { operation }
                    editMontageReady={ editMontageReady() }
                />
            </Grid>
            <DndProvider backend={HTML5Backend}>
                <Grid xs={3} sm={3} md={3} lg={2.5}
                      sx={{
                          ...bottomGridStyles,
                          borderTop: 0, borderLeft: 1, borderRight: 1, borderBottom: 1,
                          borderColor: theme.palette.primary.main,
                          borderRadius: "0 0 0 5px",
                          maxWidth: "400px"
                      }}
                      justifyContent="center">
                    <Box>
                        {
                            loading
                                ? <CircularProgress className="wm-progress"/>
                                :
                                (element === BinTypes.TOOL
                                    ? <Tools handleFinishToolDragging={ handleFinishFunctionToolDragging } />
                                    : <ArtworkList
                                    artworks={element === BinTypes.ARTWORK ? artworks : montages}
                                    setThumbnail={setThumbnail}
                                    type={element}
                                />)
                        }
                    </Box>
                </Grid>
                <Grid xs={9} sm={9} md={9} lg={9.5}
                      sx={{
                          ...bottomGridStyles,
                          borderTop: 0, borderRight: 1, borderBottom: 1,
                          borderColor: theme.palette.primary.main,
                          borderRadius: "0 0 5px 0",
                      }}
                >
                    <Tracks
                        artworks={ trackArtworks }
                        setTrackArtworks={ setTrackArtworks }
                        addDroppedMontage={ addDroppedMontage }
                        updateFunctionToolProperties={ updateFunctionToolProperties }
                        operation={ operation }
                        currentlyEditingMontage={ currentlyEditingMontage }
                        handleEditMontageDrop={ handleEditMontageDrop }
                    />
                </Grid>
            </DndProvider>
        </Grid>
    );
}