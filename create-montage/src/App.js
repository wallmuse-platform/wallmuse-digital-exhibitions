import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { currentTheme, selectTheme } from './theme/ThemeUtils';
import { getUserId, isDemoAccount, isGuestAccount, isBasicDemoAccount, getUserProfile } from "./utils/Utils";
import { UserContext, SessionContext } from './context/UserContext';  // Import the contexts

// Components
import TabButtons from './commands/TabButtons';
import AddContents from './add/AddContents';
import BasicGrid from './components/grid/Grid'; // This is the "Create Montage/Curate" component

import TrialAccountOrNotWideSnackbar from './utils/TrialAccountSnackBar';
import { ThemeProvider } from '@mui/material/styles';

function App() {

  const theme = selectTheme();
  const { t } = useTranslation();
  const [section, setSection] = useState('basicGrid'); // Default section is 'basicGrid'

  const sessionId = getUserId();
  console.log('[CreateMontage App] sessionId', sessionId);
  const wpLoggedIn = document.getElementById('root-create-montage').dataset.wpLoggedIn === 'true'; // Retrieve the WP login status
  // const isPremium = document.getElementById('root-create-montage').dataset.isPremium === 'true'; // Retrieve the WP login status
    // userDetails: {
    //         id: userId,
    //         name: guestIdentifier,
    //         isPremium: false,
    //         isDemo: true,
    //       },

  const isLoggedIn = !!sessionId; // Checks if the user is logged in
  const isDemo = isDemoAccount(sessionId); // Checks if the user is on a demo account
  const [isPremium, setIsPremium] = useState(false); // Premium status, fetched from API for login accounts

  // Fetch premium status on app load (depends on sessionId)
  useEffect(() => {
    const fetchPremiumStatus = async () => {
      if (!sessionId) return;

      // Guest and Demo accounts are never premium - no API call needed
      if (isGuestAccount(sessionId) || isBasicDemoAccount(sessionId)) {
        console.log('[App] Guest/Demo account detected, isPremium = false');
        setIsPremium(false);
        return;
      }

      // Login account - check API for premium status
      const profile = await getUserProfile(sessionId);
      setIsPremium(profile.isPremium);
    };
    fetchPremiumStatus();
  }, [sessionId]);

  const isUserLoggedIn = isLoggedIn && !isDemo; // Refined logic
  console.log('[CreateMontage App] isUserLoggedIn, isDemo, isPremium, wpLoggedIn', isUserLoggedIn, isDemo, isPremium, wpLoggedIn);

  // Conditionally render the component based on the section state
  let ComponentToRender;
  switch (section) {
    case 'addContents':
      ComponentToRender = AddContents; // Renders the AddContents section
      break;
    default: // Default is 'basicGrid', which is the "Create Montage/Curate" section
      ComponentToRender = BasicGrid;
      break;
  }

  return (
    <ThemeProvider theme={theme}>
      {/* Wrap the app with SessionContext to provide sessionId */}
      <SessionContext.Provider value={sessionId}>
        {/* Wrap the app with UserContext.Provider and provide isUserLoggedIn */}
        <UserContext.Provider value={{ isDemo, isPremium }}>
            {/* TODO: place window.innerWidth < 1080 only for CreateMontage */}
          {(isDemo) && <TrialAccountOrNotWideSnackbar isDemo={isDemo} theme={currentTheme()} />}
          {/* Render the TabButtons component */}
          <TabButtons t={t} setSection={setSection} />

          {/* Conditionally render the selected component */}
          <ComponentToRender className="rootMontageElement" />
        </UserContext.Provider>
      </SessionContext.Provider>
    </ThemeProvider>
  );
}

export default App;