# Supplied Nebula replacement and contact diagnosis

## Evidence and causes

Reviewed the user's 16.06-second recording (20261125-1327-32.6341119.mp4).
The previous model rolls sideways while travelling near the reading station.

1. `groundNormal` differentiated the sampled heightfield over just 0.03 units,
   then `CharacterPlacement` immediately adopted the resulting full rotation.
   Adjacent marked walkable samples in the four worlds include height changes
   corresponding to 81–83 degree slopes. Mesh seams and the forcibly flattened
   chair zone therefore rotated the entire resident like a falling object.
2. The heightfield/obstacle mask describes a foot location, not the full body.
   Its original broad chair exception and 0.35 height-change allowance per
   short path sample accepted paths through furniture and uneven surfaces.
3. `RUNTIME_TRANSFORMS.seatHeight` is relative to the station floor. Subtracting
   .14 again in `seatedRootOffset` lowered the seated resident by .14 units.
4. A stale `arrivalAction === read` could keep boarding offsets active during
   subsequent autonomous actions. A .25-second movement delta also amplified
   individual steps on a slow frame.

## Changes

- Limit terrain lean to 8 degrees and interpolate the orientation; cap movement
  substeps at .05 seconds. Use only the current boarding intent for seat motion.
- Correct the relative seat-height conversion. Smooth the boarding arc upward.
- Block chair-back routes explicitly, use shorter route samples, and avoid
  skipping a corner waypoint too early.
- Build Three.js Octrees from the real uploaded landscape triangles. Use a
  conservative core probe for path planning and a larger body capsule for actual
  walking contacts; retain a controlled raised boarding route to the fitted seat.
  Connected landing candidates are anchored to the reading terrace.
- Sample the animated model's lower surface spatially and raycast against actual
  scene triangles for foot support, including irregular seat/rock surfaces.
  Cache static geometry queries and cap the extra foot correction.

## User model

Source: `assets/art/user-models/星雲仔.zip` → `星雲仔.glb`.
The supplied GLB already embeds the four actions also found in the supplied
`星雲仔動作.blend`: AntennaSway, Bounce, Walk, Wave. No new clips are invented.
Idle/read/rest use AntennaSway; locomotion uses Walk; happy uses Bounce;
listen/stretch use Wave. A dedicated authored seated/read/rest clip is not present.

The original GLB has non-finite rotation keys (including Body and antenna tracks).
Blender import/export without repair collapses the body scale during playback.
The generator repairs only those invalid quaternion keys to the node's rest
rotation before import; `NEBULA_RUNTIME.json` records each repair. Some original
motion cannot be recovered from invalid values and uses the rest direction.

`prepare-supplied-nebula.py` produces a skinned ~4.8 MB GLB with 49,135 triangles
from the user's ~82 MB / 1,965,432-face mesh. UVs, painted face, texture and rig
are retained; shape proportions are not redesigned. The original ZIPs are intact.
The runtime scales the complete model uniformly to fit the station, and reduces
its original full transmission to .22 on desktop (opaque textured phone fallback).
Earlier approved/generated models remain available for explicit material review;
normal Nebula routes use `models/user-residents/nebula.glb`.

## Verification and limits

- `tests/supplied-nebula.test.ts`: embedded clips, valid finite transforms, skin
  attributes, triangle and file-size budgets.
- `tests/support-stability.test.ts`: all marked walkable samples plus seam offsets
  across all four worlds have bounded finite lean; chair back is obstructed.
- `tests/world-collision.test.ts`: actual-triangle floor contact and body recovery.
- `scripts/check-supplied-nebula.mjs`: real R3F model and controller; recorded
  spawn/read/walk poses, source-mesh ray-parity samples and actual screenshots.
  Controller frames are advanced deterministically without repeated software
  rendering; this is not a hardware FPS measurement or exhaustive mesh proof.
- `artifacts/supplied-nebula/results.json` is the authoritative latest browser
  result. Inspect its sampled contacts rather than assuming every frame is clear.
- Fully authored seated leg folding, additional facial expressions, and recovery
  of invalid source animation rotations require additional animation assets/work.

## Arm visibility correction

The mesh retains both arms, but the original AntennaSway/Bounce rotation tracks
apply half-turns to Hand.L/Hand.R instead of their rig rest orientations, folding
them into the torso. Rest-only previews did not reveal this playback problem.
`repair-nebula-arms.py` replaces those tracks with rest-relative rotations:
relaxed idle hands, bounded alternating walking swings, a small bounce gesture,
and a raised right-hand wave. Geometry, UVs and skin weights are byte-identical;
original uploaded files remain untouched. The preparation script applies this
repair after export. The runtime URL is versioned `arms-v2` to refresh cached GLBs.

Validation: 55 unit tests and build/lint passed; all four clips captured while
playing in real R3F, with no page errors. Idle and waving screenshots were visually
reviewed for both arms. See `artifacts/nebula-arms/`.
