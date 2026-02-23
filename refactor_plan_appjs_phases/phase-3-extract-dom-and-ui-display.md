# Phase 3: Extract DOM References and UI Display Logic

## Goal

Isolate direct DOM coupling (element lookup and display updates) without changing event listener behavior yet.

## Target Outcome

- `domRefs` module caches elements/query selections
- UI display/update helpers moved out of `app.js`
- Event listeners still registered from `app.js` (for now)

## New Modules

- `/Users/sturk/Desktop/Geo Figures/src/app/dom/domRefs.js`
- `/Users/sturk/Desktop/Geo Figures/src/app/ui/modeUi.js`
- `/Users/sturk/Desktop/Geo Figures/src/app/ui/styleUi.js`

## Functions to Move

### `modeUi.js`
- `modeLabel`
- `canvasHintText`
- `constructionSelectionStatusText`
- `updateModeUi`

### `styleUi.js`
- `syncStyleInputsFromDoc`
- Related small style UI sync helpers (if extracted cleanly)

### `domRefs.js`
- Current top-level `document.getElementById(...)`
- `querySelectorAll(...)` collections (`modeButtons`, triangle mode buttons, etc.)

## Implementation Steps

1. Create `createDomRefs(document)` that returns a structured `dom` object.
2. Replace top-level DOM lookups in `app.js` with `const dom = createDomRefs(document)`.
3. Move display-only UI functions to `modeUi.js` and `styleUi.js`.
4. Pass explicit dependencies to moved functions:
   - `store`
   - `session`
   - `dom`
   - helper callbacks as needed
5. Keep initialization order unchanged:
   - `wireUi()`
   - marquee init
   - mode UI sync
   - style UI sync
   - render

## Critical Invariants

- Preserve all existing null checks
- Preserve active button CSS class behavior
- Preserve status text and hint text strings
- Preserve triangle menu visibility toggles and hint hover behavior

## Anti-Goals

- Do not move `wireUi()` yet
- Do not change event registration closures in this phase

## Regression Checks (Mandatory)

- Toolbar active states by mode
- Triangle submenu interactions
- Status text updates during point collection
- Drawing hint text behavior and hover hide/show behavior
- Style input synchronization after load/applyDoc

## Exit Criteria

- DOM refs are centralized
- UI display helpers are extracted
- `app.js` still registers events successfully with unchanged behavior

## Suggested Commit Boundary

- `domRefs` extraction
- `modeUi` extraction
- `styleUi` extraction

