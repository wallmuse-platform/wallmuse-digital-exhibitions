import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from "@sentry/react";
import App from './App';
import { rootElementId } from "./utils/Utils";
import './i18n';
import './App.css'; 

// Initialize Sentry FIRST
Sentry.init({
  dsn: "https://15395dd2b9f63595123e97d7bda5ee4d@o4509439815385088.ingest.de.sentry.io/4509439837470800",
  environment: process.env.NODE_ENV,
  sendDefaultPii: true,
  tracesSampleRate: 0.3,
  initialScope: {
    tags: {
      app: "create-montage-app",
      domain: window.location.hostname
    }
  }
});

// Track resource loading errors (JS/CSS files)
window.addEventListener('error', (event) => {
  if (event.target && event.target !== window) {
    const element = event.target;
    const resourceType = element.tagName?.toLowerCase();
    
    if (resourceType === 'script' || resourceType === 'link') {
      const resourceUrl = element.src || element.href;
      const errorMessage = `Failed to load ${resourceType}: ${resourceUrl}`;
      
      console.error('[Resource Loading Error]', errorMessage);
      
      Sentry.captureException(new Error(errorMessage), {
        tags: {
          error_type: 'resource_loading',
          resource_type: resourceType,
          resource_url: resourceUrl
        },
        extra: {
          element_outerHTML: element.outerHTML
        }
      });
    }
  }
}, true); // Use capture phase to catch all errors

// Track app mounting state
let appMounted = false;

// Detect if app fails to mount
setTimeout(() => {
  if (!appMounted) {
    Sentry.captureMessage("Montage app failed to mount within 8 seconds", "error");
  }
}, 8000);

try {
  const el = document.getElementById(rootElementId);
  
  if (!el) {
    const error = new Error(`Root element with ID '${rootElementId}' not found`);
    Sentry.captureException(error);
    throw error;
  }

  const root = ReactDOM.createRoot(el);

  root.render(
    <Sentry.ErrorBoundary 
      fallback={({error}) => (
        <div style={{padding: '20px', textAlign: 'center', fontFamily: 'Arial'}}>
          <h2>Montage App Error</h2>
          <p>Unable to load the montage creator. Please refresh the page.</p>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
          <details style={{marginTop: '20px', textAlign: 'left'}}>
            <summary>Error Details</summary>
            <pre style={{fontSize: '12px'}}>{error.toString()}</pre>
          </details>
        </div>
      )}
      showDialog
    >
      <App />
    </Sentry.ErrorBoundary>
  );

  // Mark as mounted after successful render
  setTimeout(() => {
    appMounted = true;
    Sentry.addBreadcrumb({
      message: 'Montage app mounted successfully',
      level: 'info'
    });
  }, 100);

} catch (error) {
  console.error('[Montage App] Critical initialization error:', error);
  Sentry.captureException(error);
  
  // Show fallback UI if React fails completely
  const fallbackHTML = `
    <div style="padding: 40px; text-align: center; font-family: Arial; background: #f5f5f5; min-height: 100vh;">
      <h1 style="color: #d32f2f;">Montage App Loading Error</h1>
      <p>Unable to start the montage creator. This might be due to:</p>
      <ul style="text-align: left; display: inline-block; margin: 20px 0;">
        <li>Missing JavaScript or CSS files</li>
        <li>Network connectivity issues</li>
        <li>Browser compatibility problems</li>
      </ul>
      <button onclick="window.location.reload()" style="padding: 10px 20px; font-size: 16px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Refresh Page
      </button>
      <br><br>
      <small style="color: #666;">Error: ${error.message}</small>
    </div>
  `;
  
  if (document.getElementById(rootElementId)) {
    document.getElementById(rootElementId).innerHTML = fallbackHTML;
  } else {
    document.body.innerHTML = fallbackHTML;
  }
}