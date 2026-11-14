# Dream Mall background music

Put `.mp3`, `.ogg`, `.wav`, or `.m4a` files in this folder, then restart the Vite dev server or rebuild for deployment.

Music is discovered automatically with Vite `import.meta.glob` from `src/music/`. No playlist edits are required.

## Included audio (prepared separately)

- `dream-01.mp3` — first uploaded WAV, converted to 192 kbps MP3 (~30 seconds)
- `dream-02.mp3` — second uploaded WAV, converted to 192 kbps MP3 (~200 seconds)
- `dream-03.mp3` — third uploaded MP3, preserved without re-encoding (~30 seconds)

Place these three files alongside this README before building/deploying. The files are **not yet committed** to GitHub; the player starts with an empty playlist until they are added.

## Playback behavior

- Starts automatically when the browser allows audible autoplay; otherwise starts at the first pointer or keyboard interaction, including pressing Enter to enter the game.
- Sequential playlist loop: when the last song ends, the first song plays.
- Play/Pause, Next, track selector and volume controls.
- "Add locally" loads selected audio files for the current page session only; it does not upload files to GitHub.
- "Remove" hides a packaged track in this browser (saved in localStorage), or removes a locally added track. "Restore hidden" restores packaged tracks.
- For permanent changes, add or remove audio files in this directory and rebuild/redeploy. When removing a file, local browser hidden-track settings may still contain its old identifier, which is harmless.
- Default volume 30%, stored per browser.
- Audio playback uses HTMLAudioElement and does not compete with the 3D render loop.

GitHub Pages is static hosting. A permanent in-browser upload/delete feature for every visitor would require a secure server or an authenticated storage workflow. This player intentionally does not expose repository write credentials.

Only include music you have the necessary rights to distribute on a public site.
