# QA CHECKLIST

## Input

- [ ] Schema valid
- [ ] Required assets present
- [ ] Rights/provenance recorded
- [ ] Extreme text/data tested
- [ ] No secrets/PII in public metadata

## Composition

- [ ] Correct dimensions/fps/duration
- [ ] No random/wall-clock behavior
- [ ] Fonts loaded and glyphs present
- [ ] No unintended overflow
- [ ] Contrast acceptable
- [ ] Safe areas respected
- [ ] Scene hero frames approved

## Motion

- [ ] Entrances support hierarchy
- [ ] Transitions have meaning
- [ ] No duplicate conflicting animation
- [ ] No dead/frozen scene without intent
- [ ] Final frame/hold correct

## Media/audio

- [ ] Video seeks correctly
- [ ] Audio not duplicated
- [ ] Loudness/peak checked
- [ ] Captions synchronized
- [ ] Pronunciation checked
- [ ] Remote assets frozen

## Technical

- [ ] Lint/typecheck passed
- [ ] Representative frames rendered
- [ ] Draft full video reviewed
- [ ] Determinism test passed
- [ ] Codec/color/alpha verified
- [ ] Target platform playback verified

## Delivery

- [ ] Final manifest created
- [ ] Exact versions recorded
- [ ] Artifact checksum recorded
- [ ] Approval tied to exact version/input
- [ ] Retention/publish policy applied
