# Companion Planet development

This repository was initialized from an empty GitHub repository. The user authorized committing and pushing this project to ChewyChloe/companion-planet main. Do not reset or replace the checkout.

## Scope and structure

The user's current request authorizes implementation, tests and local builds. The attachment's expanded desktop requirements guide this version; it does not authorize publishing, messaging, private-file access, or cross-application automation.

- React 19 + TypeScript + Vite; Three.js via R3F. One scene and character implementation serves planet/pet modes.
- `src/domain.ts` is pure deadline timer and state policy. `src/behavior.ts` is a pure priority/cooldown/destination planner; frame interpolation and meshes live in `src/Scene.tsx`.
- `src/store.ts` owns timer/preferences; only these persist. Keep conversations in RAM. Persist pause/start/preferences immediately, throttle ticking writes.
- `shared/dialogue.js` contains browser-safe validation/mock/safety responses. Never import server transport dependencies into browser code.
- `server/dialogue.js` implements a replaceable OpenAI-compatible provider, proxy-aware fetch, timeout and validation. `server/index.js` exposes bounded loopback endpoints.
- `electron/main.cjs` starts an embedded production server on stable port 3002 and one frameless window; switching modes preserves renderer state. `preload.cjs` exposes only mode/hide/quit events. Keep contextIsolation/sandbox enabled and nodeIntegration disabled.

## Invariants

- AI never changes timer or notification settings. UI confirmation is required.
- No unsolicited focus messages. At most one completion reminder, suppressed by quiet mode or disabled notifications.
- User text is rendered as React text, never raw HTML. Validate model output, request limits and origins/hosts. Never expose API keys via VITE variables, logs, UI or saved setup scripts.
- No camera/microphone/screen monitoring. No tool execution by the AI.
- Animate with refs in `useFrame`; do not update React every frame. Use bounded destinations and damped transitions. Keep desktop and planet behavior shared.
- The production server CSP permits only same-origin scripts. New remote model URLs need an explicit reviewed change; default assets should live in `public`.
- Preserve TLS, artifact checksums, package signatures and frozen lockfile installs.

## Commands

Use the existing isolated `/workspace/companion-planet` checkout. Do not create a Git worktree unless explicitly requested.

- `npm ci`; `npm run dev` (5173 + 3001).
- `npm run check`: types, lint, 19+ unit/integration tests, production build and dependency compatibility.
- `npm run test:e2e`: real Chromium at 1366×768 and 390×844; `CHROMIUM_PATH` overrides `/usr/bin/chromium`.
- `npm run build` then `npm run test:electron`: real Electron, requires a display. Cloud currently has Xvfb extracted at `/workspace/.companion-tools/usr/bin/Xvfb`; start `:99` as needed, set DISPLAY=:99 and writable XDG cache/config locations.
- `npm run desktop`: build + desktop application.
- `npm run package:win`: NSIS installer (Linux requires Wine).
- `npm run package:win:portable`: unsigned Windows x64 ZIP.

Never run two Web E2E suites concurrently: they share a dev server and output paths. Keep report/build/artifact directories ignored by Vite and ESLint so report writes cannot reload the application. Finish source changes before final suites. Test time travel changes Date only, preserving real requestAnimationFrame and Playwright actionability. Electron tests have separate output/configuration and do not launch a second dev server.

For cloud install, use writable npm/electron caches under `/tmp`, Electron's documented proxy activation and inherited CA/proxy variables. Do not change HOME or disable sandbox/security settings globally.

## Known verification limits

No supplied GLB was available. The current creature is now an original Blender-generated skinned GLB with editable .blend and generator; see assets/art/README.md. Replacement GLBs must implement the named semantic controls; arbitrary rig clips are not supported. Live LLM calls require backend credentials and an allowed provider domain; no paid provider was verified. Windows native transparency, drag, tray and installer execution require a real Windows machine. Linux Xvfb verifies configured transparency/always-on-top and lifecycle, not Windows compositing. No click-through is enabled. The keyphrase safety fallback is limited and not a clinical assessment. Hardware FPS cannot be inferred from software rendering.

See README.md and DEVELOPMENT_REPORT.md for current evidence, delivery and Windows acceptance steps.

## Mobile web additions

- `npm run build && npm start` serves the production frontend and API on 0.0.0.0:8080 (or PORT). `server/web.js` is the website entrypoint; Electron still uses loopback `startServer` defaults and port 3002.
- `server/access.js` enumerates current local interface origins for LAN use and parses explicit `WEB_ORIGINS` for deployed HTTPS domains. Never replace the allowlist with wildcard origins or trust arbitrary forwarded Host/Origin. Vite changes the upstream Host to loopback; only known local web origins are accepted by the dev API.
- `npm run test:mobile` has its own production server, three touch-enabled orientations/sizes and output directory. It tests actual touch events, not only desktop mouse interactions in a small viewport. Run build first.
- Mobile chat uses visualViewport height/offset and 16px inputs; keep safe area and small-screen scrolling usable. Real iOS/Android keyboard/WebGL behavior still needs device validation.
- The user has viewed the initial Render deployment. Hosting is user-managed; obtain its actual URL/status before claiming live verification. No hosting credentials are present; do not create paid services without authorization.

## Earlier paper direction (historical; superseded by the latest reference below)

Use one responsive design for desktop, tablet and phone. Cream paper background, olive ink, square controls and restrained hard-edge paper shadows. No emoji controls, gradients, glass/backdrop blur, broad dark surfaces, or SaaS dashboard styling. Icons are original inline SVG (`src/Icon.tsx`). Typography is Huninn with Noto Sans TC / sans-serif fallbacks; headings must inherit the same family. Google Fonts stylesheet loads nonblocking, while the licensed local Huninn WOFF2 ensures typography survives blocked external fonts. Preserve `font-display: swap`, license and font provenance in public/fonts. The CSP exception is only Google stylesheet/font domains; no remote scripts.

`npx playwright test --config=playwright.design.config.ts` checks responsive design and font failures. `node scripts/review-design.mjs` captures multiple desktop/tablet/phone sizes for inspection (requires dev server). No-rounded-panel/gradient/emoji checks apply to app controls, not the naturally rounded 3D creature or planet. Renderer uses opaque soft-skin approximation, key/fill/rim lighting and one cached directional shadow map (512 px, refreshed at 5 Hz); character/controller logic remains shared between modes. `src/art` owns sculpt/terrain/furniture/animation; see ART_AUDIT.md and VISUAL_QA.md.

## Latest lakeside layout reference (2026-11-24)

The user explicitly requested the newly attached full-screen lavender/peach lakeside reference. Replace the old three-column paper landing page with a full-viewport interactive 3D island near the lower left on desktop, centered lower on phones; keep broad open sky. Timer plus pause/quiet controls sit upper left; settings/audio upper right. Duration/reset are in the timer popover; chat and pet mode remain accessible. This latest reference supersedes the earlier prohibition on gradients, translucent panels and rounded HUD controls. Preserve Huninn with local fallback, original SVG icons (no emoji), timer/AI policies and native pet transparency.

Scene uses the same sculpted character, shoreline bank, meadow, distant capped hills and a low-resolution throttled planar water reflection. Do not replace the interactive scene with a background image. `tests/design.spec.ts` now checks full viewport composition and corner controls, not the old square paper panels. Current layout evidence belongs in artifacts/layout and LAYOUT_QA.md; earlier ART_AUDIT / VISUAL_QA documents describe the prior art iteration.

## Resident interactions

Nine residents share the sculpt rig and animation controller. `src/companions.ts` owns appearance and local greeting choices; names used by the provider are whitelisted in shared/dialogue.js. Persist only the selected ID with preferences. Speech bubbles remain transient, user initiated, and suppressed in quiet mode. `src/art/placement.ts` reserves dry-land/body clearance; manual drops pause autonomy for 20 seconds. Pointer capture distinguishes a tap from a drag and restores OrbitControls on release/cancel/blur; keep the orbit lock through React rerenders. Electron's additional begin/move/end grab bridge reads the cursor only in the main process and clamps the existing pet window to the display work area. Never expose arbitrary window coordinates or general IPC through preload. See INTERACTION_QA.md and scripts/review-companions.mjs for the nine real-model captures.

## Current planet-universe direction

The latest user explicitly keeps the product name 同頻星球. The legacy `b612` preference identifier is internal compatibility data; never display the reference name in the UI. The scene now uses a continuous convex dome, Shader sky, fog/cloud sprites, three clickable distant destinations and four worlds. Preserve the independent lamp/flower state within a session, timer state during travel, actual Raycaster targets and keyboard alternatives. JourneyCamera owns camera movement during travel; do not teleport the character to fake arrival. `src/art/companion-skin.ts` owns nine distinct material profiles and the thin-shell fallback for phones/software rendering. Do not claim this is offline volumetric SSS or that software FPS proves hardware performance. Review evidence is in UNIVERSE_QA.md. The default Playwright config matches browser .spec files only, keeping Vitest unit files out of Playwright discovery.

## Approved clay and Nebula-only material review

The user approved the nine SDF clay shapes, then explicitly limited the next stage to **Nebula material testing only**. Do not color the other eight, add animations, or change approved proportions/antennae/face without new instructions. Clay originals live in assets/art/clay-stage; approved-three-sha256.json preserves the first approval baseline. See NEBULA_MATERIAL_REVIEW.md for current scope; earlier clay documents are historical stages.

The optional `?nebula-material=soft|mist|gel` route uses the actual production R3F Scene and an isolated models/material-preview/nebula.glb whose Body POSITION buffer matches the approved clay exactly. Default routes retain existing assets. The preview freezes pose/autonomy, uses desktop physical transmission and an explicit phone thin-shell fallback. NebulaInterior owns a static spatial density field and interior stars; NebulaBloom is mounted only in this test. Keep five facial surfaces alpha=1 and sorted after the transmission pass to avoid self-refraction ghost eyes. Do not mistake the renderer's transparent-list flag for visual facial alpha. Browser capture must call scene.userData.renderMaterialPreview so evidence includes the real Bloom pipeline. Only the calibration query `material-probe` adds the neutral background card.

### B adopted as Nebula default

The user chose B. `resolveNebulaMaterial` now returns mist for Nebula without a query; the other eight remain legacy. Explicit material query still freezes the comparison pose/autonomy, while normal pages retain existing behavior/animation code. Interior geometry is portaled to BodyControl using the inverse rest matrix. Mount Bloom only for Nebula in planet mode, never in transparent pet mode; phones/pets use the approved thin-shell fallback. Do not add new animations or color the remaining eight.

### All nine authorized and integrated (latest)

The user subsequently said 「所有角色跟著完成」, explicitly extending the material/integration scope to all nine. This supersedes the earlier eight-character pause. Preserve every approved Body POSITION buffer; Nebula stays B, other eight use independent approved SDF assets through residentModelPath. Colored sources live in assets/art/residents-final, runtime assets in public/models/residents (Nebula retains its existing preview asset path). See RESIDENT_MATERIALS.md. Existing controller/interaction is retained, with no new clips. Bloom applies in planet mode for all, never pet. Short Fern/Puff seat cushions must match residentSeatLift; screen drag anchors use residentFocusHeight. Picker portraits are actual R3F crops, generated by compose-final-residents.py. Final evidence belongs in artifacts/resident-final, not the earlier Nebula-only report.

### Articulated motion and expressions authorized (current)

The latest user explicitly requests heading-correct travel, articulated limbs, expressions and slightly less transparency for all nine. This supersedes the earlier animation pause. Preserve approved rest meshes. Material URLs now animate normally; only explicit `still` freezes comparison pose/autonomy. Face visibility uses camera-relative facing to prevent rear ghost eyes. Gait phase follows actual distance; review-only `pose-time` samples reproducible poses. See MOTION_QA.md.

### Day/night control (latest)

The user replaces the upper-right sun/settings popover with a direct day/night toggle and removes its old contents. Do not restore the settings panel. `night` is a persisted preference; sky/fog/water, scene lighting and environment intensity respond without remounting the character or changing timer/planet/lamp state. Keep the independent lamp toggle. `scripts/check-daynight.mjs` validates desktop and touch-phone switching, actual light changes and reload persistence.

### Simplified picker and hidden mini entry

The user removes the picker model-review link and drag instruction and temporarily hides the mini/pet entry button. Keep the underlying desktop mode implementation for future restoration. Health provider=llm means configured only; show AI connected only after a validated provider reply. Provider logs must contain bounded reason/status codes only, never keys, user text or provider response bodies. See API_CONNECTION_QA.md.

### Larger residents, supported seated pose and denser jelly (latest)

The user explicitly requests taller/larger residents, no chair penetration, and less transparency. Planet characters now have a uniform 1.18 presentation scale (approved rest GLB POSITION remains unchanged); focus/drag anchors follow that scale. The runtime Seated corrective supports the whole underside and recomputes its normals; do not restore the old center-only lift. The chair is wider/deeper, the back and desk have more clearance, and the terrain station pad matches its footprint. Climbing uses an arc and avoids lagging below the support height. See SEATING_QA.md and actual R3F mesh/furniture measurements in artifacts/seating.
