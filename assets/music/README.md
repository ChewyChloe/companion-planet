# Planet music

User-supplied recordings are preserved in `assets/misic` (original folder spelling).
These audio-only MP3 derivatives use 160 kbps, with embedded artwork removed.

| Planet | Runtime file | Original title |
| --- | --- | --- |
| 同頻星球 | home.mp3 | 同頻星球 (Lo-fi Study Companion).wav |
| 月光書原 | moon.mp3 | 月光書原 (Midnight Lo-fi Library).wav |
| 玫瑰花園 | rose.mp3 | 玫瑰花園 (Rose Garden Lo-fi).wav |
| 微風森林 | forest.mp3 | 微風森林 (Whispering Forest Lo-fi).wav |

Rebuild with `python scripts/prepare-planet-music.py` (requires ffmpeg).
`sources.json` records original and output SHA-256 hashes. No third-party licensing
claim is made for these user-provided recordings.

Vite emits content-hashed URLs. The player waits for the sound-button gesture,
loops one track at volume 0.35, changes track with the active planet, preserves
the off state during travel, and releases the audio element when unmounted.
Production browser check: `BASE_URL=http://127.0.0.1:3005 node scripts/check-planet-music.mjs`.
