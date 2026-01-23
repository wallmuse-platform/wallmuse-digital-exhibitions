import React from 'react';
import Box from '@mui/material/Box';
import {
    Chip,
    Stack,
    TablePagination,
    ToggleButton,
    ToggleButtonGroup, useTheme
} from "@mui/material";
import './SearchArea.css'
import Search from "./Search";
import {BinTypes} from "../constants/BinTypes";
import { OperationTypes } from "../constants/OperationTypes";
import { useTranslation } from 'react-i18next';
import { currentTheme } from "../../theme/ThemeUtils.js";


export default function SearchArea({
                                       operation,
                                       handleOperationChange,
                                       element,
                                       handleElementChange,
                                       elementsCount,
                                       page,
                                       setPage,
                                       rowsPerPage,
                                       setRowsPerPage,
                                       term,
                                       handleSearchTermChange,
                                       searchCategories,
                                       handleSearchCategoriesChange,
                                       selectedChip,
                                       setSelectedChip,
                                       currentlyEditingMontage
                                   }) {


    const { t } = useTranslation();

    const listOfChips = [
        { id: "1", label: t("tools.title") },
        { id: "2", label: t("Keywords_") },
        { id: "3", label: t("tools.title.display.author") }
    ]

    function handleSelectedChipChanged(id) {
        if (id !== selectedChip) {
            setSelectedChip(id);
        }
    }

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const theme = useTheme();

    // console.log('BinTypes.ARTWORK:', BinTypes.ARTWORK);
    // console.log('BinTypes.MONTAGE:', BinTypes.MONTAGE);
    // console.log('currentTheme():', currentTheme());

    return (
        <Box
            sx={{ border: 1, borderColor: theme.palette.primary.main, borderRadius: "5px 0 0 0",
                minHeight: "100%", maxHeight: '100%', overflow: "auto", maxWidth: "400px"}}
        >
                <Box
                    className="search-box"
                >
                    <ToggleButtonGroup
                        color="primary"
                        value={operation}
                        exclusive
                        onChange={handleOperationChange}
                        aria-label="Platform"
                    >
                        <ToggleButton value={ OperationTypes.CREATE }>{ t("bin.search.create") }</ToggleButton>
                        <ToggleButton value={ OperationTypes.MODIFY }>{ t("bin.search.update") }</ToggleButton>
                    </ToggleButtonGroup>
                    <Stack direction="row" spacing={1} className="chips">
                        {listOfChips.map((c) => (
                            <Chip
                                key={c.id}
                                onClick={() => handleSelectedChipChanged(c.id)}
                                variant={selectedChip === c.id ? "filled" : "outlined"}
                                size="small"
                                label={c.label}
                                className="wm-chip"
                            />
                        ))}
                    </Stack>
                    <Search
                        term={ term }
                        handleSearchTermChange={ handleSearchTermChange }
                        searchCategories={ searchCategories }
                        handleSearchCategoriesChange={ handleSearchCategoriesChange }
                    />
                    <ToggleButtonGroup
                        color="primary"
                        value={element}
                        exclusive
                        disabled={ element === BinTypes.MONTAGE && operation === OperationTypes.MODIFY && currentlyEditingMontage === null }
                        onChange={handleElementChange}
                        aria-label="Platform"
                        size="small"
                        className="wm-select-element"
                    >
                        <ToggleButton value={BinTypes.ARTWORK}>{ t("bin.search.artworks."+ currentTheme()) }</ToggleButton>
                        <ToggleButton value={BinTypes.MONTAGE}>{ t("bin.search.montages."+ currentTheme()) }</ToggleButton>
                        <ToggleButton value={BinTypes.TOOL}>{ t("bin.search.tools") }</ToggleButton>
                    </ToggleButtonGroup>
                    <TablePagination
                        component="div"
                        count={elementsCount}
                        page={page}
                        onPageChange={ (e, p) => setPage(p) }
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        labelRowsPerPage="Show: "
                        className="wm-pagination"
                    />
                </Box>
        </Box>
    )
}