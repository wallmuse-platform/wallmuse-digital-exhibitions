// ContentsSearchArea.js

import React from 'react';
import Box from '@mui/material/Box';
import {
    Chip,
    Stack,
    TablePagination,
    useTheme
} from "@mui/material";
import Search from "./ContentsSearch"; 
import './ContentsSearchArea.css'
import { useTranslation } from 'react-i18next';
import { selectTheme } from '../../theme/ThemeUtils';

export default function ContentsSearchArea({
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
    sortingOption,        // <-- Make sure this prop is accepted
    setSortingOption      // <-- and this one as well
}) {

    const { t } = useTranslation();
    const theme = selectTheme();

    const listOfChips = [
        { id: "1", label: t("tools.title") },
        { id: "2", label: t("Keywords_") },
        { id: "3", label: t("tools.title.display.author") }
    ];

    const handleSelectedChipChanged = (id) => {
        if (id !== selectedChip) {
            setSelectedChip(id);
        }
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Handle sorting option change
    const handleSortingOptionChange = (event, newSortingOption) => {
        if (newSortingOption !== null) {
            setSortingOption(newSortingOption);
        }
    };

    return (
        <Box sx={{ minHeight: "100%", maxHeight: '100%', overflow: "auto", maxWidth: "400px" }}>
            <Box className="contents-search-box">
                <Stack direction="row" spacing={2} className="chips" justifyContent="center" sx={{ mb: 1 }}>
                    <Chip
                        label="Alphabetical"
                        clickable
                        onClick={() => setSortingOption("alphabetical")}
                        variant={sortingOption === "alphabetical" ? "filled" : "outlined"}
                        className="wm-chip"
                    />
                    <Chip
                        label="Newest"
                        clickable
                        onClick={() => setSortingOption("newest")}
                        variant={sortingOption === "newest" ? "filled" : "outlined"}
                        className="wm-chip"
                    />
                </Stack>

                <Stack direction="row" spacing={1} className="chips" justifyContent="center" sx={{ mb: 1 }}>
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
                <Search sx={{ mb: 1 }}
                    term={term}
                    handleSearchTermChange={handleSearchTermChange}
                    searchCategories={searchCategories}
                    handleSearchCategoriesChange={handleSearchCategoriesChange}
                />
                <TablePagination   
                    component="div"
                    count={elementsCount}
                    page={page}
                    onPageChange={(e, p) => setPage(p)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Show: "
                    className="wm-pagination-contents"
                />
            </Box>
        </Box>
    );
}