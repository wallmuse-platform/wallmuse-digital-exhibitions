import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from "@sentry/react";
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import { rootElementId } from "./utils/Utils";
import './i18n';

// Initialize Sentry FIRST
Sentry.init({
  dsn: "", // Set your Sentry DSN here — omitted from public repository
  environment: process.env.NODE_ENV,
  sendDefaultPii: true,
  initialScope: {
    tags: {
      app: "description-app",
      domain: window.location.hostname
    }
  }
});

const el = document.getElementById(rootElementId);
const root = ReactDOM.createRoot(el);

root.render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>
);
