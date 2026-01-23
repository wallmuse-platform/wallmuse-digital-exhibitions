import React, { useState, useEffect } from 'react';
import { getCategories } from '../../api';
import { Autocomplete, Checkbox, CircularProgress, TextField } from "@mui/material";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import { useTranslation } from 'react-i18next';

export default function Categories({ setCategories, variant, checkedCategories, height }) {
    const { t } = useTranslation();

    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState([]);
    const loading = open && options.length === 0;
    const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
    const checkedIcon = <CheckBoxIcon fontSize="small" />;

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

    const updateCategories = newValue => {
        setCategories(newValue.map((c, index) => ({
            id: c.id,
            title: c.name,
            ordering: index
        })));
    };

    return (
        <Autocomplete
            className="search-category wm-autocomplete"
            size="small"
            multiple
            id="search-category"
            open={open}
            onOpen={() => setOpen(true)}
            onClose={() => setOpen(false)}
            loading={loading}
            options={options}
            getOptionLabel={option => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            classes={{ option: "wm-ac-option" }}
            limitTags={1}
            value={checkedCategories || []}
            renderTags={() => false}
            disableCloseOnSelect={true}
            onChange={(event, newValue) => { updateCategories(newValue); }}
            renderOption={(props, option, { selected }) => (
                <li {...props}>
                    <Checkbox
                        icon={icon}
                        checkedIcon={checkedIcon}
                        style={{ marginRight: 8 }}
                        checked={checkedCategories ? checkedCategories.map(c => c.id).indexOf(option.id) >= 0 : false}
                    />
                    {option.name.toLowerCase()}
                </li>
            )}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={t("bin.search.categories")}
                    placeholder=""
                    variant={variant || "outlined"}
                    sx={{
                        height: height || 'auto',
                        '& .MuiAutocomplete-input': {
                            opacity: 1,
                            minWidth: '30px'
                        },
                        '& .MuiInputLabel-root': {
                            opacity: 1
                        }
                    }}
                    InputLabelProps={{
                        shrink: true,
                    }}
                    InputProps={{
                        ...params.InputProps,
                        style: {
                            height: '100%', // Ensure the input field takes the full height of its container
                            display: 'flex',

                        },
                        endAdornment: (
                            <React.Fragment>
                                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps.endAdornment}
                            </React.Fragment>
                        ),
                    }}
                />
            )}
        />
    );
}