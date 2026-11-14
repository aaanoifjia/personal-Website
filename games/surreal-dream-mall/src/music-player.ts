import "./music-player.css";

type Track = { id: string; title: string; url: string; local: boolean };

const bundledFiles = import.meta.glob("./music/*.{mp3,ogg,wav,m4a}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const bundledTracks: Track[] = Object.entries(bundledFiles)
  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  .map(([path, url]) => ({
    id: path,
    title: path.split("/").pop()!.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
    url,
    local: false,
  }));

const HIDDEN_KEY = "surreal-dream-mall:hidden-music";
const VOLUME_KEY = "surreal-dream-mall:music-volume";

function readHidden(): Set<string> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]");
    return new Set(Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);
  } catch {
    return new Set();
  }
}

function readVolume(): number {
  try {
    const stored = localStorage.getItem(VOLUME_KEY);
    if (stored === null) return 0.3;
    const value = Number(stored);
    return Number.isFinite(value) && value >= 0 && value <= 1 ? value : 0.3;
  } catch {
    return 0.3;
  }
}

function saveSetting(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* Private browsing */ }
}

export function initMusicPlayer() {
  const hidden = readHidden();
  const uploaded: Track[] = [];
  let currentIndex = 0;
  let manuallyPaused = false;

  const audio = new Audio();
  audio.preload = "auto";
  audio.volume = readVolume();

  const panel = document.createElement("section");
  panel.className = "dream-music-player";
  panel.setAttribute("aria-label", "Background music player");
  panel.innerHTML = [
    '<div class="dream-music-header"><span>♫ Dream Mall Radio</span><span class="dream-music-note">playlist loop</span></div>',
    '<select class="dream-music-select" aria-label="Select track"></select>',
    '<div class="dream-music-actions">',
    '<button type="button" data-action="toggle">Play</button>',
    '<button type="button" data-action="next">Next</button>',
    '<button type="button" data-action="remove" title="Hide this track in this browser">Remove</button>',
    '<label class="dream-music-upload">Add locally<input type="file" accept="audio/mpeg,audio/ogg,audio/wav,audio/mp4,.mp3,.ogg,.wav,.m4a" multiple /></label>',
    '</div>',
    '<div class="dream-music-volume"><label for="dream-music-volume">Volume</label><input id="dream-music-volume" type="range" min="0" max="100" step="1" /></div>',
    '<div class="dream-music-footer"><span class="dream-music-status" aria-live="polite"></span><button type="button" data-action="restore" hidden>Restore hidden</button></div>',
  ].join("");
  document.body.appendChild(panel);

  const select = panel.querySelector<HTMLSelectElement>(".dream-music-select")!;
  const status = panel.querySelector<HTMLSpanElement>(".dream-music-status")!;
  const toggle = panel.querySelector<HTMLButtonElement>('[data-action="toggle"]')!;
  const next = panel.querySelector<HTMLButtonElement>('[data-action="next"]')!;
  const remove = panel.querySelector<HTMLButtonElement>('[data-action="remove"]')!;
  const restore = panel.querySelector<HTMLButtonElement>('[data-action="restore"]')!;
  const upload = panel.querySelector<HTMLInputElement>('input[type="file"]')!;
  const volume = panel.querySelector<HTMLInputElement>('input[type="range"]')!;
  volume.value = String(Math.round(audio.volume * 100));

  const tracks = () => [...bundledTracks.filter(track => !hidden.has(track.id)), ...uploaded];

  function render(message?: string) {
    const list = tracks();
    currentIndex = list.length ? Math.min(currentIndex, list.length - 1) : 0;
    select.replaceChildren(...list.map((track, i) => {
      const option = document.createElement("option");
      option.value = String(i);
      option.textContent = track.title + (track.local ? " (local)" : "");
      return option;
    }));
    select.disabled = list.length === 0;
    select.value = String(currentIndex);
    toggle.disabled = next.disabled = remove.disabled = list.length === 0;
    toggle.textContent = audio.paused ? "Play" : "Pause";
    restore.hidden = hidden.size === 0;
    if (message) status.textContent = message;
    else if (!list.length) status.textContent = "Add music files or upload locally.";
    else status.textContent = String(currentIndex + 1) + " / " + String(list.length) + " · " + (audio.paused ? "Paused" : "Playing");
  }

  async function playCurrent() {
    const list = tracks();
    const track = list[currentIndex];
    if (!track) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      render();
      return;
    }
    if (audio.dataset.trackId !== track.id) {
      audio.src = track.url;
      audio.dataset.trackId = track.id;
    }
    try {
      await audio.play();
      render();
    } catch (error) {
      const blocked = error instanceof DOMException && error.name === "NotAllowedError";
      render(blocked ? "Click Play or Enter to enable audio." : "Audio unavailable. Try another track.");
    }
  }

  function advance() {
    const list = tracks();
    if (!list.length) return;
    currentIndex = (currentIndex + 1) % list.length;
    manuallyPaused = false;
    void playCurrent();
  }

  audio.addEventListener("ended", advance);
  audio.addEventListener("pause", () => render());
  audio.addEventListener("playing", () => render());

  toggle.addEventListener("click", () => {
    if (!audio.paused) {
      manuallyPaused = true;
      audio.pause();
      render();
    } else {
      manuallyPaused = false;
      void playCurrent();
    }
  });

  next.addEventListener("click", advance);
  select.addEventListener("change", () => {
    currentIndex = Number(select.value);
    manuallyPaused = false;
    void playCurrent();
  });

  remove.addEventListener("click", () => {
    const track = tracks()[currentIndex];
    if (!track) return;
    if (track.local) {
      const index = uploaded.findIndex(item => item.id === track.id);
      if (index !== -1) uploaded.splice(index, 1);
      URL.revokeObjectURL(track.url);
    } else {
      hidden.add(track.id);
      saveSetting(HIDDEN_KEY, JSON.stringify([...hidden]));
    }
    audio.pause();
    delete audio.dataset.trackId;
    currentIndex = Math.min(currentIndex, Math.max(0, tracks().length - 1));
    void playCurrent();
  });

  restore.addEventListener("click", () => {
    hidden.clear();
    saveSetting(HIDDEN_KEY, "[]");
    render("Restored packaged tracks.");
  });

  upload.addEventListener("change", () => {
    const files = [...(upload.files ?? [])].filter(file => /\.(mp3|ogg|wav|m4a)$/i.test(file.name));
    if (!files.length) return;
    const before = tracks().length;
    for (const file of files) {
      uploaded.push({
        id: "local:" + crypto.randomUUID(),
        title: file.name.replace(/\.[^.]+$/, ""),
        url: URL.createObjectURL(file),
        local: true,
      });
    }
    currentIndex = before;
    manuallyPaused = false;
    upload.value = "";
    void playCurrent();
  });

  volume.addEventListener("input", () => {
    audio.volume = Number(volume.value) / 100;
    saveSetting(VOLUME_KEY, String(audio.volume));
  });

  // Audibly autoplay when permitted, otherwise start on the first gesture.
  const tryUnlock = () => {
    if (!manuallyPaused && audio.paused && tracks().length) void playCurrent();
  };
  document.addEventListener("pointerdown", tryUnlock, { capture: true });
  document.addEventListener("keydown", tryUnlock, { capture: true });

  render();
  void playCurrent();
}
