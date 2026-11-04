# Architecture

How Vehicle Load Estimator is put together, for developers changing it. The README covers what the
app does for the person using it and how the load numbers are worked out; this covers the code.

## At a glance

A single-page React app, built into one self-contained HTML file (`vite-plugin-singlefile`) so it
runs from the online site and from a downloaded file alike. There is no server: everything is
computed in the browser and saved in its `localStorage`.

```
src/
  main.tsx            start-up: picks the version to open, then renders <App>
  App.tsx             shell: top bar, palette, viewport, side panel, banners, shortcuts, share links
  model/              pure TypeScript, no React or three.js: the domain
    types.ts          the Setup data model and the coordinate frames
    calc.ts           the load model: compute(setup) -> Result
    geometry.ts       body proportions, item placement, host <-> world coordinates
    vehicles.ts       every vehicle model and its published figures
    trailers.ts       trailer types and their presets
    presets.ts        new setups, item templates, switching vehicle or trailer
    tyres.ts          load index table, tyre size parsing
    migrate.ts        normalises saved setups (fills in fields added since)
    versions.ts       settings versions and the upgrade chain
    format.ts         number formatting
  state/
    store.ts          saved state (zustand + localStorage): setups, undo, version, backup
    ui.ts             unsaved UI state, and bridges between the DOM and the 3D scene
    result.ts         cached compute() per setup and slope; useResult()
    versioning.ts     which hosted version to open for the saved settings
  components/         the React UI: panels, fields, dialogs, banners, report
  three/              the 3D view (react-three-fiber): scene, models, items, labels, picking
  share.ts            setups encoded in a link (#s=…&v=…)
  build.ts            build stamp (version, commit), app URLs
scripts/
  versions-manifest.mjs   run by the release workflow: writes versions.json for the site
```

## Data model

Everything the person enters is one `Setup` (`model/types.ts`): the vehicle (`ute`, a `UteSpec`), its
weighbridge readings, the hitch, the trailer (`caravan`, a `CaravanSpec`) and its readings, the load
items, check settings, and the list of `placeholders` (setup paths holding typical rather than
published values, shown with a chip next to the field).

The names `ute` and `caravan` are historical: they mean "the vehicle" and "the towed trailer"
whatever the body style (`ute.bodyStyle`: ute, SUV or van) or trailer type (`caravan.kind`). They are
kept because saved setups, exported files and share links use them as keys.

Units are kg and mm throughout the model. Positions are in a **host frame**:

| Host | Origin | x | y | z |
|---|---|---|---|---|
| `ute` (the vehicle) | front axle centre, on the ground | rearward | right (driver side) | up |
| `caravan` (the trailer) | tow ball (coupling) centre | rearward | right | up |

The 3D view uses three.js world space in metres (+X forward, +Y up, +Z right) with the vehicle's
front axle at the origin and the trailer `caravanOffset` (wheelbase + ball offset) behind it.
`toWorld` / `fromWorld` in `model/geometry.ts` are the only conversions.

## The core pipeline

```
Setup ──compute(setup, { grade })──► Result ──► results panel, gauges, 3D labels, report, inspector
  ▲                                     │
  └── store.update(fn) ◄── UI edits ────┘ (cached per setup object and slope in state/result.ts)
```

`compute` (`model/calc.ts`) is pure and never throws. In order:

1. Guards nonsense sizes from imported files.
2. **Baselines**: the vehicle's four wheel loads and the trailer's ball and axle loads as weighed,
   filling in missing readings and cross-checking redundant ones (`deriveUteBaseline`,
   `deriveCaravanBaseline`). Problems become `issues`, never errors.
3. **Items** (`itemLoads`): each item's mass is shared between the axles by lever arm (`uteShare`,
   `caravanShare`). Items ticked "was on the vehicle when weighed" are also subtracted at their
   weighed position, so they count only if moved or removed.
4. **Slope**: masses lean along the road by their height times the gradient, using assumed centre
   of mass heights for the vehicle and trailer themselves.
5. **Hitching** (`hitchUp`): ball weight levered about the rear axle, the trailer's own weight
   moved with its axles, the weight distribution hitch's couple, and the trailer's pull on the ball
   on a slope.
6. **Checks** (`vehicleChecks`, `towingChecks`) against every rating, plus headroom figures.

`capacityAt` answers "how much more fits here" by running `compute` again with a 1 kg probe and
dividing each limit's spare capacity by how much the probe moved it.

The README's "How the numbers are worked out" gives the physics; the doc comments on each function
give the details.

## State, persistence and edits

`state/store.ts` holds the saved state in a zustand store persisted to `localStorage`
(`STORAGE_KEY`). All setup edits go through `update(fn)`, which clones the open setup, applies `fn`
and replaces it: setups are never mutated in place. That is what makes `resultFor`'s cache (a
`WeakMap` keyed by setup object) correct, and what undo relies on. Edits with the same history key
in quick succession share one undo step (typing in a field).

Fields bind to the setup by dotted path (`NumField path="ute.limits.gvm"`), read with `getPath` and
written with `setPath`, which also clears that path's placeholder mark.

UI-only state (selected item, tab, view, slope, toasts) lives in `state/ui.ts` and is not saved.

## Settings versions and hosting

Saved settings, exported files and share links carry the version of the app that saved them
(`DATA_VERSION`, which is `package.json`'s version). Settings from before 1.4.0 carry none and count
as 1.4.0 (`BASELINE`). Every release stays online at `…/v/<version>/`; the root is the latest, and
`versions.json` lists them.

Before anything renders, `main.tsx` decides (`state/versioning.ts`, `decideVersion`):

- settings from an older version: redirect the root to that version's copy, which shows a banner
  offering the upgrade on every visit;
- settings from a newer version than this copy: show them read-only (`storageLock`), never saving;
- the root page being a stale cached copy of an older release: reload it once under a fresh address.

Upgrading runs in the latest version, which knows every step: `UPGRADES` in `model/versions.ts` holds
one step per release that changed what is saved, applied oldest first. Releases that change nothing
saved need no step. The old settings are kept as a backup until the next upgrade.

`normalizeSetup` (`model/migrate.ts`) is separate and always runs on load: it fills in fields added
since a setup was saved, from the defaults, and replaces sizes no field would allow.

## The 3D view

`three/Scene.tsx` renders on demand (only when something changes). Models are built from the same
geometry the load model uses:

- `model/geometry.ts` (`uteGeometry`, `vanGeometry`, `caravanGeometry`) turns the entered dimensions
  into stations and heights for bonnet, cowl, beltline, roof, tub, seats and wheels.
- `three/uteBody.ts` lofts the ute or SUV body through cross-sections (`three/loft.ts`); parts attach
  to it through its surface functions. `three/VanModel.tsx` extrudes the van's side silhouette.
- `three/TrailerModel.tsx` draws the chassis and a body per trailer type; `three/Items.tsx` draws
  items, each filling its box.

Picking (`three/Interaction.tsx`): meshes carry `userData` (`surface`, `host`, `itemId`). A ray hit is
converted back to the level scene and the host frame, and `placeFromHit` rests the item's box on the
surface (or snaps people to the nearest seat). The same picking places items dropped from the
palette (`components/Viewport.tsx`) and moves dragged ones. On a slope everything on the road sits in
one tilted group (`SlopeTilt`), and picking undoes the tilt.

## Extending it

- **A vehicle model**: see the header of `model/vehicles.ts`. Every model is checked by
  `vehicles.test.ts` (payload equals GVM less kerb, tare at most kerb, axle ratings allow the GVM).
- **A trailer type**: `TrailerKind` in `types.ts`, its preset and placeholders in `trailers.ts`, a body
  in `TrailerModel.tsx`, and any items in `ITEM_TEMPLATES` with `kinds`.
- **An item**: a template in `ITEM_TEMPLATES` (`presets.ts`) with an anchor (`Anchor` in
  `geometry.ts`) that says where it lands when clicked.
- **A setup field**: add it to the types and to `newSetup` (or the presets it comes from);
  `normalizeSetup` fills it into older saves. `inputs.test.ts` fails if a new field changes no result,
  unless it is listed as only naming or drawing something. If it changes how saved data must be read,
  add an upgrade step to `UPGRADES`.
- **A check**: in `vehicleChecks` or `towingChecks`; checks are listed in the order they are pushed.

## Tests, build and release

- `npm test` (vitest): the load model, every vehicle model, every input field, versions and upgrades,
  share links. `npm run build` type-checks (`tsc`, TypeScript 7) and builds the single file, copying it
  to `vehicle-load-estimator.html` in the repo root; CI checks the committed copy matches the source.
- Releasing: bump `package.json`'s version, then publish a GitHub release with the same tag. The
  Release workflow refuses a tag that doesn't match, runs the tests, attaches the file to the release
  and adds the build to the `gh-pages` branch under `v/<version>/` (the newest also at the root) with
  an updated `versions.json`.
