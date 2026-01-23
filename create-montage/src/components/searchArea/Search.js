import React, { useState, useEffect } from 'react';
import "./Search.css"
import {
    Stack,
    TextField
} from "@mui/material";
import Box from "@mui/material/Box";
import { getCategories } from '../../api'
import Categories from "../categories/Categories";
import { useTranslation } from 'react-i18next';

export default function Search ({ handleSearchTermChange, searchCategories, handleSearchCategoriesChange }) {

    const { t } = useTranslation();

    const [query, setQuery] = useState("");
    const [options, setOptions] = useState([]);
    const loading = options.length === 0;

    useEffect(() => {
        let active = true;

        if (!loading) {
            return undefined;
        }

        (async () => {
            const result = await getCategories();

            if (active) {
                setOptions(result);
            }
        })();

        return () => {
            active = false;
        };
    }, [loading]);

    useEffect(() => {
        const timeOutId = setTimeout(() => handleSearchTermChange(query), 500);
        return () => clearTimeout(timeOutId);
    }, [query]);


    return (
        <Box
            component="form"
            sx={{
                '& .MuiTextField-root': { m: 1 },
            }}
            noValidate
            autoComplete="off"
        >
            <Stack direction="row" spacing={1} className="search-form">
                <TextField
                    id="standard-search"
                    label={ t("bin.search.label") }
                    type="search"
                    className="search-term"
                    size="small"
                    value={ query }
                    onChange={event => setQuery(event.target.value)}
                />

                <Categories
                    checkedCategories={ searchCategories }
                    setCategories={ handleSearchCategoriesChange } />
            </Stack>
        </Box>
    )

}