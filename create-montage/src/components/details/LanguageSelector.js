import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import { allLanguages } from "./LanguageUtils";

export default function LanguageSelector({ language, handleLanguageChange, textLabel }) {



    const NO_LANGUAGE = "none";
    const handleChange = (event) => {
        if (event.target.value !== NO_LANGUAGE) {
            const langCode = event.target.value;
            const langName = allLanguages.filter(lang => lang.code === langCode)[0].name
            handleLanguageChange(langCode, langName);
        }
    };

    return (
            <FormControl>
                <Select
                    labelId="lang-select-label"
                    id="lang-simple-select"
                    value={ language || NO_LANGUAGE }
                    label={ textLabel }
                    onChange={ handleChange }
                    size="small"
                    variant="standard"
                    sx={{fontSize: "0.875rem"}}
                >
                    <MenuItem value={ NO_LANGUAGE }>{ textLabel }</MenuItem>
                    {
                        allLanguages.map(
                            lang => <MenuItem key={ lang.code } value={ lang.code }>{ lang.name }</MenuItem>
                        )
                    }
                </Select>
            </FormControl>
        );
}