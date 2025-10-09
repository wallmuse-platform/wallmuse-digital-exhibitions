// index.js (main app)
import React from "react";
import { createRoot } from 'react-dom/client';
import * as Sentry from "@sentry/react";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import './i18n';

// Initialize Sentry with performance monitoring
Sentry.init({
  dsn: "https://15395dd2b9f63595123e97d7bda5ee4d@o4509439815385088.ingest.de.sentry.io/4509439837470800",
  environment: process.env.NODE_ENV,
  sendDefaultPii: true,
  tracesSampleRate: 0.3, // 30% sampling for performance
  initialScope: {
    tags: {
      app: "explore-app",
      domain: window.location.hostname
    }
  }
});

// Track app loading state
let appMounted = false;
let wallmuseInitFound = false;

// Loading timeout detection
setTimeout(() => {
  if (!appMounted) {
    Sentry.captureMessage("React app failed to mount within 10 seconds", "error");
  }
  if (!wallmuseInitFound && !window.WallmuseInit) {
    Sentry.captureMessage("WallmuseInit not found after 10 seconds", "warning");
  }
}, 10000);

// Verify WallmuseInit exists
if (!window.WallmuseInit) {
  console.warn('[Index.js Player InitMechanism] WallmuseInit not found! Creating fallback');
  Sentry.addBreadcrumb({
    message: 'WallmuseInit not found, creating fallback',
    level: 'warning'
  });
  
  // Create fallback implementation if missing
  window.WallmuseInit = {
    _playerReady: false,
    _webplayerReady: false,
    queue: [],
    playerReady: function() {
      return Promise.resolve();
    },
    ready: function(component) {
      console.log(`[WallmuseInit Fallback] ${component} ready`);
      if (component === 'player') this._playerReady = true;
      if (component === 'webplayer') this._webplayerReady = true;
    },
    processQueue: function() {},
    onBothReady: function(fn) {
      setTimeout(fn, 0);
    }
  };
} else {
  console.log('[Index.js Player InitMechanism] WallmuseInit found and available');
  wallmuseInitFound = true;
  Sentry.addBreadcrumb({
    message: 'WallmuseInit found successfully',
    level: 'info'
  });
}

const initializeReactApp = () => {
  try {
    const container = document.getElementById('root');
    if (!container) {
      const error = new Error("Root container not found in DOM");
      Sentry.captureException(error);
      throw error;
    }

    const root = createRoot(container);

    root.render(
      <React.StrictMode>
        <Sentry.ErrorBoundary 
          fallback={({error}) => (
            <div style={{padding: '20px', textAlign: 'center'}}>
              <h2>Something went wrong</h2>
              <p>Please refresh the page or try again later.</p>
              <button onClick={() => window.location.reload()}>
                Refresh Page
              </button>
            </div>
          )}
          showDialog
        >
          <App onAppReady={() => {
            // Signal that player is ready after App is mounted and ready
            console.log('[Index.js Player InitMechanism] App mounted, signaling player ready');
            appMounted = true;
            
            Sentry.addBreadcrumb({
              message: 'React App mounted successfully',
              level: 'info'
            });
            
            if (window.WallmuseInit) {
              window.WallmuseInit.ready('player');
            }
          }} />
        </Sentry.ErrorBoundary>
      </React.StrictMode>
    );

    Sentry.addBreadcrumb({
      message: 'React app render initiated',
      level: 'info'
    });

  } catch (error) {
    console.error('[Index.js] Failed to initialize React app:', error);
    Sentry.captureException(error);
  }
};

// Start initialization with error handling
try {
  initializeReactApp();
} catch (error) {
  console.error('[Index.js] Critical initialization error:', error);
  Sentry.captureException(error);
  
  // Show fallback UI if React fails completely
  document.body.innerHTML = `
    <div style="padding: 40px; text-align: center; font-family: Arial;">
      <h1>Loading Error</h1>
      <p>Unable to start the application. Please refresh the page.</p>
      <button onclick="window.location.reload()">Refresh Page</button>
    </div>
  `;
}

// Add timeout safety with proper checks and error reporting
setTimeout(() => {
  if (window.WallmuseInit) {
    if (!window.WallmuseInit._playerReady) {
      console.log('[Index.js Player InitMechanism] Forcing player ready state after timeout');
      Sentry.addBreadcrumb({
        message: 'Player ready state forced after timeout',
        level: 'warning'
      });
      window.WallmuseInit.ready('player');
    }
  } else {
    const error = new Error('WallmuseInit still not found after timeout');
    console.error('[Index.js Player InitMechanism]', error.message);
    Sentry.captureException(error);
  }
}, 5000); // 5 second timeout

// Enhanced reportWebVitals with Sentry integration
reportWebVitals((metric) => {
  // Report poor performance metrics to Sentry
  if (metric.name === 'LCP' && metric.value > 4000) { // Poor LCP > 4s
    Sentry.captureMessage(`Poor LCP performance: ${metric.value}ms`, 'warning');
  }
  if (metric.name === 'FID' && metric.value > 300) { // Poor FID > 300ms
    Sentry.captureMessage(`Poor FID performance: ${metric.value}ms`, 'warning');
  }
});