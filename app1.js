// youtube-api.js
let API_KEY = null;

// Parte fissa della chiave (Assicurati che questa sia corretta!)
const API_KEY_ = 'AIzaSyCC4GXA3zQV8ybRS337XVP1jISvrcp';

// API KEY init
window.addEventListener('load', () => {
    // Recupera il suffisso salvato o lo chiede all'utente
    let last = localStorage.getItem('yt_key_suffix');

    if (!last) {
        last = prompt("Inserisci il suffisso della API Key:");
    }
    // Controllo semplificato: basta che l'utente abbia scritto qualcosa
    if (last && last.trim() !== "") {
        API_KEY = API_KEY_ + last.trim();
        localStorage.setItem('yt_key_suffix', last.trim());
        console.log("API Key configurata correttamente.");
    } else {
        alert("Nessun suffisso inserito. Le funzioni di ricerca non funzioneranno.");
        localStorage.removeItem('yt_key_suffix'); // Pulisce per permettere riprovo al refresh
    }
});

const MAX_RESULTS = 50;
const MAX_RESULTS_PLAYLIST = 50; 
let currentPlayingId = null; // id del brano attualmente in riproduzione

// ... resto del codice (player, playlist, DOM refs ecc.) ...
// app state condiviso
let player;
let playlist = JSON.parse(localStorage.getItem('mytube_playlist') || '[]');
let currentIndex = 0;

// DOM refs
const resultsList = document.getElementById('resultsList');
const playlistList = document.getElementById('playlistList');
const searchBtn = document.getElementById('searchBtn');
const searchPlaylistBtn = document.getElementById('searchPlaylistBtn');
const addUrl = document.getElementById('addUrl');
const addBtn = document.getElementById('addBtn');
const playBtn = document.getElementById('play');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const volumeSlider = document.getElementById('volume');


// YouTube iframe player
// Finestra di brani caricata su YouTube: serve per avere i tasti multimediali
// (precedente / successivo) anche a schermo spento. Più è grande, meno spesso va rigenerata.
const WINDOW_SIZE = 6;
let windowMap = [];            // indici globali dei brani presenti nella finestra
let windowIds = [];            // id dei brani nella finestra (per capire se la coda è cambiata)
let lastPlayingVideoId = null;
let consecutiveErrors = 0;
let qualityTimer = null;

const QUALITY_RANK = ['tiny', 'small', 'medium', 'large', 'hd720', 'hd1080', 'hd1440', 'hd2160', 'highres'];
const START_QUALITY = 'small';   // 240p appena parte il brano
const MAX_QUALITY = 'medium';    // poi al massimo 360p

// === YouTube iframe player ===
function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    videoId: playlist[0]?.id || '',
    playerVars: { playsinline: 1, rel: 0, mute: 0 },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
      onError: onPlayerError,
      onPlaybackQualityChange: onQualityChange
    }
  });
}

function onPlayerReady() {
  player.setVolume(volumeSlider.value);
}

// --- Qualità (best effort: YouTube può ignorare setPlaybackQuality) ---
function setQuality(q) {
  try { player.setPlaybackQuality(q); } catch (_) {}
}
function onQualityChange(e) {
  if (QUALITY_RANK.indexOf(e.data) > QUALITY_RANK.indexOf(MAX_QUALITY)) setQuality(MAX_QUALITY);
}
function scheduleQualityCap() {
  clearTimeout(qualityTimer);
  qualityTimer = setTimeout(() => setQuality(MAX_QUALITY), 4000);
}

// volume
volumeSlider.addEventListener('input', () => {
  if (player && typeof player.setVolume === 'function') {
    player.setVolume(volumeSlider.value);
  }
});

// --- Evidenzia il brano in riproduzione (titolo scorrevole solo su quello) ---
function updateNowPlayingHighlight() {
  const list = document.getElementById('playlistList');
  if (!list) return;
  const prev = list.querySelector('.now-playing');
  const cur = list.children[currentIndex];
  if (prev && prev !== cur) {
    prev.classList.remove('now-playing');
    prev.querySelector('.scrolling-title')?.classList.remove('marquee');
  }
  if (!cur || cur.dataset.id !== currentPlayingId) return;
  cur.classList.add('now-playing');
  const t = cur.querySelector('.scrolling-title');
  const box = cur.querySelector('.center-content');
  if (t && box && !t.classList.contains('marquee') && t.scrollWidth > box.clientWidth) {
    t.style.setProperty('--shift', (box.clientWidth - t.scrollWidth) + 'px');
    t.classList.add('marquee');
  }
}

// --- Finestra di riproduzione ---
function buildWindow(index) {
  const n = playlist.length;
  const size = Math.min(WINDOW_SIZE, n);
  const first = n > 1 ? index - 1 : index;   // un brano prima: il tasto "precedente" resta attivo
  const map = [];
  for (let k = 0; k < size; k++) map.push((((first + k) % n) + n) % n);
  return map;
}

function isWindowValid() {
  return windowMap.length > 0 &&
    windowMap.every((gi, k) => playlist[gi] && playlist[gi].id === windowIds[k]);
}

function loadYouTubeWindow(index, startSeconds = 0) {
  if (!player || typeof player.loadPlaylist !== 'function' || !playlist.length) return;
  const n = playlist.length;
  index = ((index % n) + n) % n;

  windowMap = buildWindow(index);
  windowIds = windowMap.map(i => playlist[i].id);
  currentIndex = index;
  currentPlayingId = playlist[index].id;

  player.loadPlaylist({
    playlist: windowIds,
    index: windowMap.indexOf(index),
    startSeconds: startSeconds,
    suggestedQuality: START_QUALITY
  });
  player.setLoop(windowMap.length < 3);   // liste cortissime: giro continuo

  updateNowPlayingHighlight();
  updateMediaSessionMetadata(playlist[index]);
}

function currentRel() {
  const r = player.getPlaylistIndex ? player.getPlaylistIndex() : -1;
  return (typeof r === 'number') ? r : -1;
}

function findNearestIndex(id) {
  let best = -1, bestDist = Infinity;
  playlist.forEach((t, i) => {
    if (t.id === id) {
      const d = Math.abs(i - currentIndex);
      if (d < bestDist) { best = i; bestDist = d; }
    }
  });
  return best;
}

// === Controlli base ===
function playIndex(i) { loadYouTubeWindow(i); }

function playNext() {
  if (!player || !playlist.length) return;
  const rel = currentRel();
  if (!isWindowValid() || rel < 0 || rel >= windowMap.length - 1) {
    loadYouTubeWindow(currentIndex + 1);
  } else {
    player.nextVideo();
  }
}

function playPrev() {
  if (!player || !playlist.length) return;
  const rel = currentRel();
  if (!isWindowValid() || rel <= 0) {
    loadYouTubeWindow(currentIndex - 1);
  } else {
    player.previousVideo();
  }
}

function onPlayerError() {
  consecutiveErrors++;
  if (playlist.length < 2 || consecutiveErrors >= playlist.length) return;
  setTimeout(() => {
    const st = player.getPlayerState();
    if (st !== YT.PlayerState.PLAYING && st !== YT.PlayerState.BUFFERING) playNext();
  }, 1500);
}

// === Cambio di stato ===
function onPlayerStateChange(e) {
  const S = YT.PlayerState;

  if (e.data === S.BUFFERING) {
    // qualità bassa solo all'inizio di un nuovo brano, non nei ribuffering a metà
    const vid = player.getVideoData && player.getVideoData().video_id;
    if (vid && vid !== lastPlayingVideoId) setQuality(START_QUALITY);
    return;
  }

  if (e.data === S.PLAYING) {
    consecutiveErrors = 0;
    const videoId = player.getVideoData().video_id;
    const rel = currentRel();
    const valid = isWindowValid();

    let idx = -1;
    if (valid && rel >= 0 && playlist[windowMap[rel]]?.id === videoId) idx = windowMap[rel];
    else idx = findNearestIndex(videoId);

    const trackChanged = videoId !== lastPlayingVideoId;
    lastPlayingVideoId = videoId;
    currentPlayingId = videoId;
    if (idx !== -1) currentIndex = idx;

    document.getElementById('play').innerHTML = "&#x23F8;";
    if (trackChanged) {
      updateBackgroundFromThumbnail(videoId);
      scheduleQualityCap();
      updateMediaSessionMetadata(playlist[currentIndex]);
    }
    updateNowPlayingHighlight();
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';

    if (trackChanged) {
      if (idx === -1) {
        // il brano non è più nella coda (coda sostituita): riparto dalla nuova coda
        if (playlist.length) loadYouTubeWindow(0);
        return;
      }
      // finestra rigenerata solo se la coda è cambiata o siamo ai bordi (precedente/successivo restano attivi)
      const size = windowMap.length;
      const atEdge = size >= 3 && (rel === 0 || rel === size - 1);
      if (!valid || atEdge) loadYouTubeWindow(currentIndex, player.getCurrentTime());
    }
  }
  else if (e.data === S.PAUSED) {
    document.getElementById('play').innerHTML = "&#x25B6;";
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
  }
}

function togglePlay() {
  if (!player) return;
  const S = YT.PlayerState;
  const state = player.getPlayerState();
  if (state === S.PLAYING) player.pauseVideo();
  else if (state === S.PAUSED) player.playVideo();
  else if (state === S.ENDED) playNext();
  else if (playlist.length) {
    // brano solo "preparato": carico la finestra, così compaiono i tasti multimediali
    if (!windowMap.length) loadYouTubeWindow(currentIndex);
    else player.playVideo();
  }
}

// --- Utility per salvataggio temporaneo (mytube_playlist) ---
function savePlaylistToTemp(){
  localStorage.setItem('mytube_playlist', JSON.stringify(playlist));
}


// --- Funzione per ID video da URL o codice ---
function extractVideoId(input){
  if(!input) return null;
  input = input.trim();
  if(/^[-_0-9A-Za-z]{11}$/.test(input)) return input;
  try{
    const url = new URL(input);
    if(url.hostname.includes('youtu.be')) return url.pathname.slice(1, 12);
    if(url.searchParams.get('v')) return url.searchParams.get('v');
    const p = url.pathname.match(/^\/(?:shorts|embed|live)\/([-_0-9A-Za-z]{11})/);
    if(p) return p[1];
  } catch(e){}
  const m = input.match(/v=([-_0-9A-Za-z]{11})/);
  return m ? m[1] : null;
}


if ('mediaSession' in navigator) {
  const ms = navigator.mediaSession;
  const safe = (name, fn) => { try { ms.setActionHandler(name, fn); } catch (_) {} };
  safe('play', () => player && player.playVideo());
  safe('pause', () => player && player.pauseVideo());
  safe('previoustrack', playPrev);
  safe('nexttrack', playNext);
  safe('stop', () => player && player.pauseVideo());
}

// Aggiorna titolo/artista/copertina mostrati nella notifica media di Android.
// È il pezzo che manca di più: senza metadata, il sistema riconosce meno bene
// la sessione come "riproduzione musicale attiva" e la notifica è debole.
function updateMediaSessionMetadata(track) {
  if (!('mediaSession' in navigator) || !track) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title || 'Brano sconosciuto',
    artist: 'MyTube',
    album: 'Playlist',
    artwork: track.thumb ? [
      { src: track.thumb, sizes: '120x90', type: 'image/jpeg' }
    ] : []
  });
}


// === Imposta listener quando la pagina è pronta ===
// (save / load / clear / shuffle sono già collegati in playlist.js)
document.addEventListener('DOMContentLoaded', () => {
  const modifyYTKeyBtn = document.getElementById('modifyBtn');
  const importBtn = document.getElementById('importPlaylist');
  const importFixedBtn = document.getElementById('importFixedBtn');

  if (modifyYTKeyBtn) modifyYTKeyBtn.addEventListener('click', ModificaAPIKey);
  if (importBtn) importBtn.addEventListener('click', importPlaylistFromPrompt);
  if (importFixedBtn) importFixedBtn.addEventListener('click', importFixedPlaylist);
});

function ModificaAPIKey() {
  const newKey = prompt("Inserisci il suffisso della API Key YouTube:");
  if (newKey === null) return;            // annulla
  const clean = newKey.trim();
  if (!clean) { alert("⚠️ Suffisso vuoto, chiave non modificata."); return; }
  localStorage.setItem('yt_key_suffix', clean);
  API_KEY = API_KEY_ + clean;             // attiva subito, senza ricaricare la pagina
  alert("✅ Chiave API aggiornata.");
}

// --- Eventi principali ---


// (il pulsante 'Aggiungi' per URL/ID è gestito in cerca.js)
playBtn.addEventListener('click', togglePlay);
prevBtn.addEventListener('click', playPrev);
nextBtn.addEventListener('click', playNext);



async function importFixedPlaylist() {
  // 🔗 URL della playlist fissa
  const playlistUrl = "https://www.youtube.com/watch?v=KKlw4l144Kg&list=PL3zg7RiOZwQASmLNJs1drPx3-QXwlvNrf";
  

  // Estrai l'ID playlist dal link
  const match = playlistUrl.match(/[?&]list=([^&]+)/);
  if (!match) {
    alert("❌ Link playlist non valido.");
    return;
  }

  const playlistId = match[1];
  let nextPageToken = '';
  const videos = [];

  try {
    // 📡 Recupera i dati dalla YouTube API
    do {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${API_KEY}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`
      );
      const data = await response.json();

      if (!data.items) {
        throw new Error(data.error?.message || "Errore nel recupero dati dalla YouTube API.");
      }

      // 🎞️ Aggiungi i video trovati
      data.items.forEach(item => {
        const videoId = item.snippet.resourceId?.videoId;
        if (videoId) {
          videos.push({
            id: videoId,
            title: item.snippet.title,
            thumb: item.snippet.thumbnails?.default?.url || ''
          });
        }
      });

      nextPageToken = data.nextPageToken;
    } while (nextPageToken);

    // 🧹 (Opzionale) svuota la playlist attuale
    playlist.length = 0;

    // 💾 Aggiungi i video e aggiorna la UI
    playlist.push(...videos);
    savePlaylistToTemp();
    renderPlaylist();

    alert(`✅ Importati ${videos.length} video dalla playlist fissa YouTube!`);

  } catch (err) {
    console.error("Errore durante l'importazione:", err);
    alert(`❌ Errore: ${err.message}`);
  }
}


// === Funzione per importare una playlist YouTube ===
async function importPlaylistFromPrompt() {
  const url = prompt("📋 Incolla il link della playlist YouTube:");
  if (!url) return;

  const match = url.match(/[?&]list=([^&]+)/);
  if (!match) {
    alert("❌ Link non valido o playlist mancante (deve contenere ?list=...).");
    return;
  }

  const playlistId = match[1];
  await importYouTubePlaylist(playlistId);
}

// === Carica tutti i video di una playlist da YouTube ===
async function importYouTubePlaylist(playlistId) {
  let nextPageToken = '';
  const videos = [];

  try {
    do {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${API_KEY}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`
      );

      const data = await response.json();
      if (!data.items) throw new Error("Errore nel recupero dati dalla YouTube API.");

      data.items.forEach(item => {
        const videoId = item.snippet.resourceId?.videoId;
        if (videoId) {
          videos.push({
            id: videoId,
            title: item.snippet.title,
            thumb: item.snippet.thumbnails?.default?.url || ''
          });
        }
      });

      nextPageToken = data.nextPageToken;
    } while (nextPageToken);

    playlist.push(...videos);
    savePlaylistToTemp();
    renderPlaylist();

    alert(`✅ Importati ${videos.length} video dalla playlist YouTube!`);

  } catch (err) {
    console.error(err);
    alert("❌ Errore durante l'importazione della playlist.");
  }
}

function updateBackgroundFromThumbnail(videoId) {
  if (!videoId) return;

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = `https://i.ytimg.com/vi/${videoId}/default.jpg`;

  img.onload = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 16;
    canvas.height = 16;
    ctx.drawImage(img, 0, 0, 16, 16);
    const data = ctx.getImageData(0, 0, 16, 16).data;

    let r = 0, g = 0, b = 0;
    const total = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }

    r = Math.round(r / total);
    g = Math.round(g / total);
    b = Math.round(b / total);

    // Applica transizione dolce
    document.body.style.transition = "background-color 1s ease";
    document.body.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
  };
}

let wakeLock = null;

async function requestWakeLock() {
  if (!('wakeLock' in navigator) || wakeLock) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (err) {
    console.warn('Wake Lock non disponibile:', err.message);
  }
}

// Il browser rilascia il lock quando blocchi il telefono o cambi tab:
// lo richiediamo di nuovo appena la pagina torna visibile.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') requestWakeLock();
});
window.addEventListener('load', requestWakeLock);
// Fallback: alcuni browser lo accettano solo dopo un gesto dell'utente
document.addEventListener('click', requestWakeLock);

// === Service Worker (registrato qui perché lo script inline è bloccato dalla CSP) ===
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registrato', reg.scope))
      .catch(err => console.error('Errore SW:', err));
  });
}
