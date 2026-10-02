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
let currentWindowStart = 0;

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
const WINDOW_SIZE = 4;

// === YouTube iframe player ===
function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    videoId: playlist[0]?.id || '',
    playerVars: { playsinline: 1, rel: 0, mute: 0 },
    events: { onReady: onPlayerReady, onStateChange: onPlayerStateChange, onError: onPlayerError }
  });
}




function onPlayerReady() {
  player.setVolume(volumeSlider.value);
}

// Video eliminato / non incorporabile: passa al successivo (max un giro completo, poi si ferma)
let consecutiveErrors = 0;
function onPlayerError() {
  consecutiveErrors++;
  if (playlist.length > 1 && consecutiveErrors < playlist.length) {
    setTimeout(playNext, 500);
  }
}

// volume
volumeSlider.addEventListener('input', () => {
  if (player && typeof player.setVolume === 'function') {
    player.setVolume(volumeSlider.value);
  }
});







function updateNowPlayingHighlight() {
  document.querySelectorAll('#playlistList .item').forEach(li => {
    li.classList.toggle('now-playing', li.dataset.id === currentPlayingId);
  });
}


// === Controlli base (senza finestre/playlist YouTube) ===
function playIndex(i) {
  if (!player || !playlist.length) return;
  currentIndex = ((i % playlist.length) + playlist.length) % playlist.length;
  const track = playlist[currentIndex];
  currentPlayingId = track.id;

  player.loadVideoById(track.id);   // parte subito, nessuna playlist da costruire
  updateNowPlayingHighlight();
  updateMediaSessionMetadata(track);
}

// Compatibilità: se cerca.js / libreria.js chiamano ancora la vecchia funzione
function loadYouTubeWindow(i) { playIndex(i); }

function playNext() { if (playlist.length) playIndex(currentIndex + 1); }
function playPrev() { if (playlist.length) playIndex(currentIndex - 1); }

function onPlayerStateChange(e) {
  if (e.data === YT.PlayerState.ENDED) {
    playNext();
    return;
  }

  if (e.data === YT.PlayerState.PLAYING) {
    consecutiveErrors = 0;
    const videoId = player.getVideoData().video_id;
    currentPlayingId = videoId;

    // Riallinea l'indice solo se il brano non coincide
    if (playlist[currentIndex]?.id !== videoId) {
      const found = playlist.findIndex(v => v.id === videoId);
      if (found !== -1) currentIndex = found;
    }

    updateBackgroundFromThumbnail(videoId);
    document.getElementById('play').innerHTML = "&#x23F8;";
    updateNowPlayingHighlight();
    updateMediaSessionMetadata(playlist[currentIndex]);
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
  }
  else if (e.data === YT.PlayerState.PAUSED) {
    document.getElementById('play').innerHTML = "&#x25B6;";
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
  }
}




function togglePlay() {
  if (!player) return;
  const state = player.getPlayerState();
  if (state === YT.PlayerState.PLAYING) player.pauseVideo();
  else if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.CUED) player.playVideo();
  else if (state === -1 && playlist.length) playIndex(currentIndex);
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
  navigator.mediaSession.setActionHandler('play', () => player.playVideo());
  navigator.mediaSession.setActionHandler('pause', () => player.pauseVideo());
  navigator.mediaSession.setActionHandler('previoustrack', playPrev);
  navigator.mediaSession.setActionHandler('nexttrack', playNext);
  navigator.mediaSession.setActionHandler('stop', () => player.pauseVideo());
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
  img.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

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
