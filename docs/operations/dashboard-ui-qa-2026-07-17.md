# Dashboard UI QA — 2026-07-17

Automated Chrome DevTools smoke test for the local ReFrameMotion dashboard.

API URL: ephemeral local test server
Project under review: rospan.ru/rospan-vertical-2min-conversion

## Click Coverage

- PASS: initial load
- PASS: save API key button
- PASS: refresh catalog button
- PASS: site/check/audio/sort/search controls
- PASS: DEMO export plan button
- PASS: DEMO export queue button
- PASS: approval select change and restore
- PASS: create draft brief button
- PASS: create single job button
- PASS: batch import button
- PASS: refresh jobs button
- PASS: cancel queued job button
- PASS: retry cancelled job button
- PASS: mobile project cards layout
- PASS: API catalog rendered/passed/final MP4 evidence
- PASS: QA draft cleanup (1 file(s))

## Screenshots

- Desktop catalog: docs/operations/screenshots/dashboard-qa-01-desktop-catalog.png
- Filters/search: docs/operations/screenshots/dashboard-qa-02-filters-search.png
- Export plan: docs/operations/screenshots/dashboard-qa-03-export-plan.png
- Draft brief: docs/operations/screenshots/dashboard-qa-04-brief-created.png
- Queue and batch actions: docs/operations/screenshots/dashboard-qa-05-queue-batch-actions.png
- Mobile cards: docs/operations/screenshots/dashboard-qa-06-mobile-cards.png

## Notes

- The test uses isolated temporary copies of the SQLite data directory and project catalog.
- Draft brief creation and approval changes mutate only the temporary project catalog copy.
- Export queue is tested by creating a queued command job only; the worker is not started by this QA script.
