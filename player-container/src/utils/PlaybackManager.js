// PlaybackManager.js

import { sendCommandToHouse } from "./api.js";

// Exportable forcePlay function
let isPlayCommandInProgress = false; // Flag to track if play command is already in progress

export const forcePlay = async (house) => {
  if (!house || typeof house !== "string") {
    console.error(
      `[forcePlay] Invalid house ID (${house}). Cannot send play command.`,
    );
    return;
  }

  if (isPlayCommandInProgress) {
    console.warn(
      "[forcePlay] Play command is already in progress. Ignoring request.",
    );
    return;
  }

  isPlayCommandInProgress = true;
  try {
    console.log(`[forcePlay] Sending play command to house: ${house}`);
    const response = await sendCommandToHouse(
      '<vlc><cmd action="play"/></vlc>',
      house,
    );
    if (response.success) {
      console.log(
        "[forcePlay] Play command sent successfully:",
        response.response,
      );
    } else {
      console.error("[forcePlay] Play command failed:", response.error);
    }
  } catch (error) {
    console.error("[forcePlay] Error while sending play command:", error);
  } finally {
    isPlayCommandInProgress = false;
  }
};

// Exportable forceStop function
let isStopCommandInProgress = false; // Flag to prevent multiple stop commands simultaneously

export const forceStop = async (house) => {
  if (!house || typeof house !== "string") {
    console.error("[forceStop] Invalid house ID. Cannot send stop command.");
    return;
  }

  if (isStopCommandInProgress) {
    console.warn(
      "[forceStop] Stop command is already in progress. Ignoring request.",
    );
    return;
  }

  isStopCommandInProgress = true; // Set the flag to indicate stop is in progress
  try {
    console.log(`[forceStop] Sending stop command to house: ${house}`);
    const response = await sendCommandToHouse(
      '<vlc><cmd action="stop"/></vlc>',
      house,
    );

    if (response.success) {
      console.log(
        "[forceStop] Stop command sent successfully:",
        response.response,
      );
    } else {
      console.error("[forceStop] Stop command failed:", response.error);
    }
  } catch (error) {
    console.error("[forceStop] Error while sending stop command:", error);
  } finally {
    isStopCommandInProgress = false; // Reset the flag once the command completes
  }
};
