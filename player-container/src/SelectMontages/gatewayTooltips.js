
// gatewayTooltips.js

import React from "react";
import { useTranslation } from "react-i18next";

export function useGatewayTooltip() {
  const { t } = useTranslation();

  function gatewayTooltipAction(action, userProfile, montage, isPremium) {

    // console.log('montage.selectable: montage.id', montage.selectable, montage.id);

    if (!userProfile.isLoggedIn) {
      if (montage.selectable === "N") {
        return <h2>{t("_warning_premium")}</h2>;
      } else {
        return <h2>{t(action)}</h2>;
      }
    } else if (isPremium === 0) {
      if (montage.selectable === "N") {
        return <h2>{t("_warning_premium")}</h2>;
      } else if (userProfile.isMontageEncryptionOnly) {
          return <h2>{t("_pc_app_restricted")}</h2>;
      } else {
        return <h2>{t(action)}</h2>;
      }
    }
    // Default return statement
    return <h2>{t(action)}</h2>;
  }

  // Return the function from the hook
  return { gatewayTooltipAction };
}