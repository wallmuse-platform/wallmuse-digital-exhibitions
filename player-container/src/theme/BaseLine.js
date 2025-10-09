import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from "react-i18next";

const BaseLine = ({ currentTheme, theme, isDemo }) => {


    const { t } = useTranslation();
    const themeName=currentTheme();
    
    console.log('[BaseLine] themeName, t:', themeName, t);

    return (
        <div 
            style={{
                background: theme.palette.background.paper,
                color: theme.palette.text.primary,
                textAlign: 'center'
            }}
        >
            {(isDemo) && <h4 style={{marginBottom: '2px'}}>{t("baseline.line1." + themeName)}</h4>}
            <h5 style={{fontStyle: 'italic'}}>{t("baseline.line2." + themeName)}</h5>
        </div>
    );
};

BaseLine.propTypes = {
    currentTheme: PropTypes.func.isRequired,
    theme: PropTypes.string.isRequired,
    t: PropTypes.func.isRequired
};

export default BaseLine;