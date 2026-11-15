// ConfigureModalContext.js — whether the Configure modal is open.
//
// WHY THIS EXISTS: this state used to live as local useState inside TabButtons.js. But
// TabButtons is rendered deep inside DontStartBefore (App.js), which unmounts/remounts its
// entire subtree whenever gating state (e.g. `environments`) changes — which happens on
// routine actions like toggling a screen or removing an environment in Configure. Local
// state inside TabButtons is destroyed on that remount, silently closing Configure mid-action
// even though nothing the user did was meant to close it.
//
// The previous workaround was a bare `window._configureWasOpen` global: callers that knew
// they were about to trigger a remount-causing state update (e.g. Configure.js's
// handleRemoveEnvironment) would set `window._configureWasOpen = true` right before doing so,
// and TabButtons would check it in a dependency-less useEffect (running after every render)
// to reopen itself post-remount. That only worked for call sites that remembered to set the
// flag, and had to be extended by hand for every new action that could trigger a remount
// (e.g. toggling a screen's enabled state) — easy to forget, and the fix only ever treated
// the symptom.
//
// This context lives in App.js, ABOVE <DontStartBefore>, so it is never unmounted by
// anything DontStartBefore or its descendants (PlayerIntegration, TabButtons, Configure) do.
// The modal's open/closed state simply can't be lost to a remount any more, for any action,
// present or future — no per-call-site flag needed. See App.js for where the Provider wraps
// the tree, and TabButtons.js for where local useState was replaced with this context.
import React, { createContext, useContext, useMemo, useState } from "react";

const ConfigureModalContext = createContext();

export const useConfigureModal = () => {
  const context = useContext(ConfigureModalContext);
  if (!context) {
    throw new Error(
      "[ConfigureModalContext] useConfigureModal must be used within a ConfigureModalProvider",
    );
  }
  return context;
};

export const ConfigureModalProvider = ({ children }) => {
  const [isConfigureOpen, setIsConfigureOpen] = useState(false);

  const contextValue = useMemo(
    () => ({ isConfigureOpen, setIsConfigureOpen }),
    [isConfigureOpen],
  );

  return (
    <ConfigureModalContext.Provider value={contextValue}>
      {children}
    </ConfigureModalContext.Provider>
  );
};
