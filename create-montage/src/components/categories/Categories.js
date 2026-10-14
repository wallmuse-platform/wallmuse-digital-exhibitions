import React, { useState, useEffect } from 'react';
import { getCategories, addCategory } from '../../api';
import { Autocomplete, Checkbox, CircularProgress, TextField } from "@mui/material";
import { createFilterOptions } from '@mui/material/Autocomplete';
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import { useTranslation } from 'react-i18next';
import { isPlugin } from '../../utils/Utils';

const filter = createFilterOptions({ stringify: option => option.name || '' });

export default function Categories({ setCategories, variant, checkedCategories, height }) {
    const { t } = useTranslation();
    const pluginMode = isPlugin();

    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState([]);
    const [creating, setCreating] = useState(false);
    const loading = open && options.length === 0 && !pluginMode;
    const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
    const checkedIcon = <CheckBoxIcon fontSize="small" />;

    useEffect(() => {
        let active = true;
        (async () => {
            const result = await getCategories();
            if (active) setOptions(result);
        })();
        return () => { active = false; };
    }, []);

    const updateCategories = newValue => {
        setCategories(newValue.filter(c => !c.inputValue).map((c, index) => ({
            id: c.id,
            title: c.name,
            ordering: index
        })));
    };

    const handleChange = async (event, newValue) => {
        const createOption = newValue.find(c => c.inputValue);
        if (createOption && pluginMode) {
            setCreating(true);
            try {
                const created = await addCategory(createOption.inputValue);
                const updated = [...newValue.filter(c => !c.inputValue), created];
                setOptions(prev => [...prev, created]);
                updateCategories(updated);
            } catch (e) {
                console.error('[Categories] Failed to create category:', e);
            } finally {
                setCreating(false);
            }
        } else {
            updateCategories(newValue);
        }
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
            loading={loading || creating}
            options={options}
            getOptionLabel={option => option.inputValue ? `+ ${t('category.create')} "${option.inputValue}"` : (option.name || '')}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            filterOptions={(options, params) => {
                const filtered = filter(options, params);
                if (pluginMode && params.inputValue.trim() !== '') {
                    filtered.push({ inputValue: params.inputValue.trim(), name: `+ ${t('category.create')} "${params.inputValue.trim()}"` });
                }
                return filtered;
            }}
            classes={{ option: "wm-ac-option" }}
            limitTags={1}
            value={checkedCategories || []}
            renderTags={() => false}
            disableCloseOnSelect={true}
            onChange={handleChange}
            renderOption={(props, option, { selected }) => (
                <li {...props}>
                    <Checkbox
                        icon={icon}
                        checkedIcon={checkedIcon}
                        style={{ marginRight: 8 }}
                        checked={checkedCategories ? checkedCategories.map(c => c.id).indexOf(option.id) >= 0 : false}
                    />
                    {option.inputValue ? option.name : option.name.toLowerCase()}
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
                                {(loading || creating) ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps.endAdornment}
                            </React.Fragment>
                        ),
                    }}
                />
            )}
        />
    );
}