# Rooftop cat encounter

Open the local Vite app and click **Preview startled cat**. The button restarts
the movie just before the encounter on rooftop A. Controls collapse to keep the
action visible; click **Runtime controls** to reopen pause, resume, speed, and
restart controls. **Restart** still plays the whole movie from the beginning.

The cat notices the approaching teacher at a safe distance, pauses in surprise,
crouches with its feet planted, then turns and jumps away to the right. The
teacher keeps running without touching it. There is no impact burst, collision
shake, teacher recoil, or airborne tumbling.
This is a scripted cartoon sequence with no physics engine or random spawning.

When startled, a 0.64-second original synthesized cartoon meow plays through the
existing AudioManager. Its rounded falling pitch, gentle onset/release and
2.3 kHz low-pass smoothing soften the mildly annoyed sound. The channel volume
is `AUDIO_CONFIG.catMeow` (0.42); playback speed preserves pitch and the existing
pause/resume/reset controls also manage the sound. Regenerate the WAV with
`node scripts/generate-cat-meow.mjs`.

## Implementation

- `src/entities/RooftopCat.ts` owns the three sprite poses, shadow, surprise
  indicator, and the encounter timeline.
- `src/scenes/CityScene.ts` schedules the startle from the rooftop's actual run
  distance and duration. The cat lives in the same world coordinates as the
  teacher, so camera tracking does not separate them.
- `src/game/config.ts` exposes `MOVIE_CONFIG.city.catEncounter`: rooftop,
  run progress, startle distance, size, entrance, flight distance/height/duration,
  and anticipation duration.
- All animation belongs to the existing master timeline. There are no
  independent timers or ticker listeners for the cat.
- `PlaybackController.restart(startAt)` rebuilds the timeline and renders the
  preceding callbacks before continuing, preserving scene and pose state for
  the preview. Calling it without an argument retains the original behavior.

## Review observations

The current PixiJS scene / GSAP timeline architecture supports this addition
without a renderer rewrite or another animation dependency. The production
build passed before and after the change.

One existing lifecycle issue remains outside this feature: `Game.destroy()`
discards the playback controller without killing its repeating master timeline.
The controller currently has no disposal method. If this app starts mounting
and unmounting `Game` instances, the old master can retain callbacks and scene
references after destruction. Stop and dispose the master before destroying
scenes when adding that lifecycle. The current one-instance startup does not
exercise this path.

## Validation

- TypeScript and Vite production build.
- Targeted runtime assertions against the implementation: hidden before entry,
  walking toward the startle point, planted crouch, upward jump without tumbling,
  paused position stability, exit visibility, identical second-loop trajectory,
  reset, preview callbacks, speed retention, and normal restart.
- Built-in browser inspection of entry and airborne poses at 0.25x and 1x.
- Full movie playback across a loop boundary at 2x, returning to the city
  with the same master timeline generation; browser error/warning log was empty.
- Existing music changes in the working tree were preserved.

## Asset provenance

- File: `src/assets/city/cat-sprites.png`
- Generator: built-in image generation tool, not the CLI fallback.
- Original size: 2172 x 724, RGBA with transparency.
- Three poses share one source texture; frame rectangles are in
  `src/assets/cityAssets.ts`. The generated PNG is preserved without
  background removal or image edits.

Final generation prompt:

> Use case: stylized-concept. Asset type: transparent PNG sprite sheet for a side-scrolling pixel-art rooftop animation. Generate one horizontal sprite sheet with exactly three equal square cells in a single row, no borders or labels. The same small cute orange tabby cat with cream muzzle, belly and paws, dark navy-brown pixel outlines and a long striped tail appears in all cells. Facing LEFT, side view. Cell 1: alert standing/walking cat, all four paws at bottom baseline, tail raised. Cell 2: second walking step, same proportions and scale. Cell 3: surprised airborne cat, legs spread and tail curved, round wide eyes, entire body visible. Art should look like hand drawn Japanese 16-bit video game pixel art with clear stepped edges, compact pixel clusters and restrained shading, readable when each cat is displayed about 60 pixels wide. Center each cat inside its own equal square with generous transparent margins and no overlap. True transparent background with alpha, no floor or shadow, no checkerboard pattern, no scenery, no lettering, no other characters, no motion effects. This is a playful cartoon animation asset.
