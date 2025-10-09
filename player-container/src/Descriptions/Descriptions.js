// Descriptions.js

//TODO: Contextualisation

// React and its Hooks
import React, { useState, useEffect } from 'react';

// Third-Party Libraries
import QRCode from 'qrcode.react';

// API Utilities
import { detailsUser } from "../utils/api.js";

// Theme Utilities
import { selectTheme } from "../theme/ThemeUtils";
import { useTranslation } from 'react-i18next';

// Specific css
import './Descriptions.css';
import { wmm_url } from '../utils/Utils.js';

function Descriptions() {
  const [screens, setScreens] = useState([]);
  const [showOnlyOn, setShowOnlyOn] = useState(true); // New toggle state
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const theme = selectTheme();
  const { t } = useTranslation();
  // const wmm_url = "https://wallmuse.com"; //temp naming until webservice acknowledges different domains

  useEffect(() => {
    console.log('[Descriptions] useEffect start');
    let isMounted = true;

    detailsUser()
      .then(data => {
        console.log('[Descriptions] API response:', data);
        if (isMounted) {
          setScreens(data.screens || []);
          setLoading(false);
        }
      })
      .catch(error => {
        console.error('Error:', error);
        if (isMounted) {
          setError(t('descriptions.noscreen'));
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [t]);

  if (loading) {
    return <p>{t('descriptions.loading')}</p>;
  }

  if (error) {
    return <p style={{ color: theme.palette.error.main }}>{error}</p>;
  }

  // Filter screens based on the toggle state
  const filteredScreens = showOnlyOn
  ? screens.filter(screen => screen && screen.on === '1') // Check if screen exists before accessing on property
  : screens.filter(screen => screen); // Filter out any undefined or null screens

  return (
    <div>
            {/* Toggle Slider */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px', marginTop: '10px' }}>
        <label style={{ marginRight: '10px', fontWeight: 'bold' }}>{t('descriptions.showOnlyOn')}</label>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={showOnlyOn}
            onChange={() => setShowOnlyOn(prev => !prev)}
          />
          <span
            className="slider"
            style={{
              backgroundColor: showOnlyOn
                ? theme.palette.primary.main // Use theme's primary color
                : '#ccc', // Default gray for off state
            }}
          ></span>
        </label>
      </div>

      {/* Display Screens */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around' }}>
        {filteredScreens.map((screen, index) => (
          screen ? (
            <div key={index} style={{ margin: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <p style={{ color: theme.palette.primary.main }}>{`${screen.name}`}</p>
              <QRCode value={`${wmm_url}/info/?screen=${screen.id}`} />
              <p>{`${wmm_url}/info/?screen=${screen.id}`}</p>
            </div>
          ) : null
        ))}
      </div>
    </div>
  );
}

export default Descriptions;