// Descriptions.js

//TODO: Contextualisation

// React and its Hooks
import React, { useState, useEffect, useContext } from "react";

// Third-Party Libraries
import QRCode from "qrcode.react";

// API Utilities
import { detailsUser, searchArtworks } from "../utils/api.js";

// Theme Utilities
import { selectTheme } from "../theme/ThemeUtils";
import { useTranslation } from "react-i18next";

// Specific css
import "./Descriptions.css";
import { wmm_url } from "../utils/Utils.js";

// Thumbnail base URL (same pattern used in MontageSelection)
import { BaseThumbnailContext } from "../contexts/MontagesContext.js";
import { getUserId } from "../utils/Utils.js";

// Page size for searchArtworks — kept modest to avoid slow initial load.
// A "Load more" button is shown when the result count hits this limit.
const ARTWORK_PAGE_SIZE = 50;

function Descriptions() {
  // ─── Mode: "screens" | "artworks" ────────────────────────────────────────
  const [mode, setMode] = useState("screens");

  // ─── Screen mode state ───────────────────────────────────────────────────
  const [screens, setScreens] = useState([]);
  const [showOnlyOn, setShowOnlyOn] = useState(true);

  // ─── Artwork mode state ──────────────────────────────────────────────────
  const [artworks, setArtworks] = useState([]);
  const [artworkPage, setArtworkPage] = useState(0);
  const [artworkHasMore, setArtworkHasMore] = useState(false);
  const [artworkLoading, setArtworkLoading] = useState(false);

  // ─── Shared state ────────────────────────────────────────────────────────
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const theme = selectTheme();
  const { t } = useTranslation();
  const baseThumbnailURL = useContext(BaseThumbnailContext);
  const userId = getUserId();

  // ─── Fetch screens (always needed — active screen drives artwork QR URLs) ─
  useEffect(() => {
    console.log("[Descriptions] useEffect start");
    let isMounted = true;

    detailsUser()
      .then((data) => {
        console.log("[Descriptions] API response:", data);
        if (isMounted) {
          setScreens(data.screens || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("[Descriptions] Error fetching screens:", err);
        if (isMounted) {
          setError(t("descriptions.noscreen"));
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [t]);

  // ─── Fetch artworks when switching to artwork mode (first page only) ──────
  useEffect(() => {
    if (mode !== "artworks") return;
    if (artworks.length > 0) return; // already loaded
    fetchArtworks(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function fetchArtworks(page) {
    setArtworkLoading(true);
    console.log("[Descriptions] fetchArtworks page:", page);
    const results = await searchArtworks(null, null, null, null, page, ARTWORK_PAGE_SIZE, null);
    setArtworks((prev) => (page === 0 ? results : [...prev, ...results]));
    setArtworkPage(page);
    // Show "Load more" if a full page came back — there may be additional pages.
    setArtworkHasMore(results.length === ARTWORK_PAGE_SIZE);
    setArtworkLoading(false);
  }

  // ─── Active screen for artwork QR URLs ───────────────────────────────────
  // Use the first screen with on === "1"; fall back to screens[0].
  // Edge case: if the user deleted their only active screen and screens[0] is
  // a stale/deleted entry, QR codes will point to an invalid screen ID.
  // Handle per-artwork screen selection in a future iteration if needed.
  const activeScreen = screens.find((s) => s?.on === "1") || screens[0];

  // ─── Derived: filtered screens for screen mode ───────────────────────────
  const filteredScreens = showOnlyOn
    ? screens.filter((s) => s?.on === "1")
    : screens.filter(Boolean);

  // ─── Shared styles ────────────────────────────────────────────────────────
  const tabStyle = (active) => ({
    flex: 1,
    padding: "8px 0",
    cursor: "pointer",
    fontWeight: active ? "bold" : "normal",
    background: active ? theme.palette.primary.main : theme.palette.background.paper,
    color: active ? theme.palette.background.paper : theme.palette.text.primary,
    border: `1px solid ${theme.palette.primary.main}`,
    borderRadius: "4px",
    transition: "background 0.2s",
  });

  if (loading) {
    return <p>{t("descriptions.loading")}</p>;
  }

  if (error) {
    return <p style={{ color: theme.palette.error.main }}>{error}</p>;
  }

  return (
    <div>
      {/* ── Mode tab bar ─────────────────────────────────────────────────── */}
      {/* marginTop gives clearance from the modal's X close button */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          margin: "36px 20px 20px",
        }}
      >
        <button
          style={tabStyle(mode === "screens")}
          onClick={() => setMode("screens")}
        >
          {t("descriptions.screenQRCodes")}
        </button>
        <button
          style={tabStyle(mode === "artworks")}
          onClick={() => setMode("artworks")}
        >
          {t("descriptions.artworkQRCodes")}
        </button>
      </div>

      {/* ── Screen mode ──────────────────────────────────────────────────── */}
      {mode === "screens" && (
        <>
          {/* Only Active Displays toggle */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <label style={{ marginRight: "10px", fontWeight: "bold" }}>
              {t("descriptions.showOnlyOn")}
            </label>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={showOnlyOn}
                onChange={() => setShowOnlyOn((prev) => !prev)}
              />
              <span
                className="slider"
                style={{
                  backgroundColor: showOnlyOn
                    ? theme.palette.primary.main
                    : "#ccc",
                }}
              />
            </label>
          </div>

          {/* Screen QR grid */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-around",
            }}
          >
            {filteredScreens.map((screen, index) => (
              <div
                key={index}
                style={{
                  margin: "10px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <p style={{ color: theme.palette.primary.main }}>{screen.name}</p>
                <QRCode value={`${wmm_url}/info/?screen=${screen.id}`} />
                <p style={{ fontSize: "11px", wordBreak: "break-all", maxWidth: "200px", textAlign: "center" }}>
                  {`${wmm_url}/info/?screen=${screen.id}`}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Artwork mode ─────────────────────────────────────────────────── */}
      {mode === "artworks" && (
        <>
          {/* TODO: My Artworks / All Artworks toggle — deferred.
              Requires a backend endpoint to distinguish uploader vs viewer access rights.
              Currently search_artworks scoped by session returns all artworks the user
              can access, which is the correct set for artwork QR code generation. */}

          {!activeScreen && (
            <p style={{ color: theme.palette.error.main, textAlign: "center", margin: "20px" }}>
              {t("descriptions.noscreen")}
            </p>
          )}

          {artworkLoading && artworks.length === 0 && (
            <p style={{ textAlign: "center", margin: "20px" }}>
              {t("descriptions.loading")}
            </p>
          )}

          {activeScreen && artworks.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "80px" }} />
                <col />
                <col style={{ width: "140px" }} />
              </colgroup>
              <tbody>
                {artworks.map((artwork, index) => {
                  const thumbnailUrl = artwork.urls?.find((u) => u.kind === "THUMBNAIL")?.url;
                  const authors = artwork.authors?.map((a) => a.display_name).join(", ");
                  const qrValue = `${wmm_url}/info/?screen=${activeScreen.id}&artwork_id=${artwork.id}`;
                  // Separator sits at the TOP of each artwork block (skipped for the first item)
                  // so the URL address is visually grouped with the artwork above it, not below.
                  const rowSeparator = index > 0 ? `1px solid ${theme.palette.divider}` : "none";

                  return (
                    <React.Fragment key={artwork.id}>
                      <tr>
                        {/* Col 1 — Thumbnail */}
                        <td style={{ padding: "8px", verticalAlign: "middle", textAlign: "center", borderTop: rowSeparator, borderBottom: "none" }}>
                          {thumbnailUrl ? (
                            <img
                              src={thumbnailUrl}
                              alt={artwork.title}
                              style={{ width: "70px", height: "70px", objectFit: "cover", borderRadius: "4px" }}
                            />
                          ) : (
                            // Fallback to get_artwork_thumbnail WS pattern used by MontageSelection
                            // if the THUMBNAIL url is absent from search_artworks response
                            <img
                              src={`${baseThumbnailURL}&session:${userId}&artwork=${artwork.id}`}
                              alt={artwork.title}
                              style={{ width: "70px", height: "70px", objectFit: "cover", borderRadius: "4px" }}
                            />
                          )}
                        </td>

                        {/* Col 2 — Metadata */}
                        <td style={{ padding: "8px", verticalAlign: "middle", borderTop: rowSeparator, borderBottom: "none" }}>
                          <div style={{ fontWeight: "bold", color: theme.palette.text.primary, marginBottom: "2px" }}>
                            {artwork.title}
                          </div>
                          {authors && (
                            <div style={{ fontSize: "13px", color: theme.palette.text.secondary }}>
                              {authors}
                            </div>
                          )}
                          {artwork.datation && (
                            <div style={{ fontSize: "12px", color: theme.palette.text.secondary, fontStyle: "italic" }}>
                              {artwork.datation}
                            </div>
                          )}
                        </td>

                        {/* Col 3 — QR code only, no URL here */}
                        <td style={{ padding: "8px", verticalAlign: "middle", textAlign: "center", borderTop: rowSeparator, borderBottom: "none" }}>
                          <QRCode value={qrValue} size={110} />
                        </td>
                      </tr>

                      {/* Full-width URL row, centered beneath the artwork row */}
                      <tr>
                        <td
                          colSpan={3}
                          style={{
                            padding: "2px 8px 10px",
                            textAlign: "center",
                            fontSize: "10px",
                            color: theme.palette.text.secondary,
                            wordBreak: "break-all",
                            borderTop: "none",
                            borderBottom: "none",
                          }}
                        >
                          {qrValue}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Load more */}
          {artworkHasMore && (
            <div style={{ textAlign: "center", margin: "16px 0" }}>
              <button
                onClick={() => fetchArtworks(artworkPage + 1)}
                disabled={artworkLoading}
                style={{
                  padding: "8px 24px",
                  background: theme.palette.primary.main,
                  color: theme.palette.background.paper,
                  border: "none",
                  borderRadius: "4px",
                  cursor: artworkLoading ? "not-allowed" : "pointer",
                  opacity: artworkLoading ? 0.6 : 1,
                }}
              >
                {artworkLoading ? t("descriptions.loading") : t("descriptions.loadMore")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Descriptions;
