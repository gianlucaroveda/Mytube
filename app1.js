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

const MAX_RESULTS = 20;
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
    events: { onStateChange: onPlayerStateChange }
  });
}



function loadYouTubeWindow(index) {
  if (!player || !playlist || !playlist.length) return;

  // Assicuriamoci che l'indice sia all'interno dei limiti della playlist
  if (index < 0 || index >= playlist.length) return;

  // 1. Calcola l'inizio (1 brano prima) e la fine (fino a 2 brani dopo)
  const start = Math.max(0, index - 1);
  // In JS slice non include l'elemento all'indice 'end', quindi usiamo index + 3 (index + 1 + 2)
  const end = Math.min(playlist.length, index + 3);

  // 2. Estrai la finestra degli ID
  const windowIds = playlist.slice(start, end);

  // 3. Calcola l'indice relativo preciso del video corrente ALL'INTERNO della finestra
  const currentInWindow = index - start;

  // Memorizza dove inizia la finestra globale
  currentWindowStart = start;

  console.log("🎬 Carico finestra YouTube:", windowIds, "(Index relativo nella finestra:", currentInWindow, ")");

  // 4. Carica la playlist su YouTube
  player.loadPlaylist({
    playlist: windowIds,
    index: currentInWindow,
    suggestedQuality: 'default'
  });
}

// volume
volumeSlider.addEventListener('input', () => {
  if (player && typeof player.setVolume === 'function') {
    player.setVolume(volumeSlider.value);
  }
});



function maybeUpdateWindow() {
  if (!playlist.length) return;

  let relativeIndex = currentIndex - currentWindowStart;

  // caso circolare: se currentIndex è minore di currentWindowStart (si torna indietro)
  if (relativeIndex < 0) {
    loadYouTubeWindow(currentIndex);
    return;
  }

  // se siamo alla fine della finestra
  if (relativeIndex >= WINDOW_SIZE - 1) {
    // se siamo arrivati alla fine della playlist, riparti da zero
    if (currentIndex === playlist.length - 1) {
      loadYouTubeWindow(0);
    } else {
      loadYouTubeWindow(currentIndex);
    }
  }
}

// --- Carica finestra dinamica ---
function loadYouTubeWindow(index) {
  if (!playlist.length || !player) return;

  // calcola start/end finestra
  const start = Math.max(0, index - 1);
  let end = start + WINDOW_SIZE;

  // se oltre la lunghezza playlist, fai wrap circolare
  let windowIds = [];
  for (let i = 0; i < WINDOW_SIZE; i++) {
    windowIds.push(playlist[(start + i) % playlist.length].id);
  }

  currentWindowStart = start;
  console.log("🎞️ Carico finestra:", windowIds);

  player.loadPlaylist({
    playlist: windowIds,
    index: index - start,
    suggestedQuality: 'default'
  });
}

function updateNowPlayingHighlight() {
  document.querySelectorAll('#playlistList .item').forEach(li => {
    li.classList.toggle('now-playing', li.dataset.id === currentPlayingId);
  });
}


// === Controlli base ===
function playIndex(i) {
  if (!player || !playlist.length) return;
  currentIndex = i;
  loadYouTubeWindow(currentIndex);
  updateNowPlayingHighlight();

}

function playNext() {
  if (!playlist.length || !player) return;

  // avanzo circular
  currentIndex = (currentIndex + 1) % playlist.length;

  maybeUpdateWindow();
  player.nextVideo();
}

// === playPrev circolare ===
function playPrev() {
  if (!playlist.length || !player) return;

  // retrocedo circular
  currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;

  maybeUpdateWindow();
  player.previousVideo();
}


function togglePlay() {
  if (!player) return;
  const state = player.getPlayerState();
  if (state === YT.PlayerState.PLAYING) player.pauseVideo();
  else if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.CUED) player.playVideo();
  else if (state === -1 && playlist.length) playIndex(currentIndex);
}

// === Cambio di stato ===
function onPlayerStateChange(e) {
  if (e.data === YT.PlayerState.PLAYING) {
    const videoId = player.getVideoData().video_id;
    currentPlayingId = videoId;
    // Prova a recuperare l'indice reale dalla playlist interna di YouTube
    const idxInPlaylist = player.getPlaylistIndex?.();
    if (idxInPlaylist !== undefined && idxInPlaylist >= 0) {
      currentIndex = currentWindowStart + idxInPlaylist;
    } else {
      // Fallback: cerca per id nella playlist locale
      const foundIdx = playlist.findIndex(v => v.id === videoId);
      if (foundIdx !== -1) currentIndex = foundIdx;
    }

    maybeUpdateWindow();

    // Aggiorna UI
    updateBackgroundFromThumbnail(videoId);
    document.getElementById('play').innerHTML = "&#x23F8;"; // pausa
    updateNowPlayingHighlight();
  }
  else if (e.data === YT.PlayerState.PAUSED) {
    document.getElementById('play').innerHTML = "&#x25B6;"; // play
    updateNowPlayingHighlight();
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
    if(url.hostname.includes('youtu.be')) return url.pathname.slice(1);
    if(url.searchParams.get('v')) return url.searchParams.get('v');
  } catch(e){}
  const m = input.match(/v=([-_0-9A-Za-z]{11})/);
  return m ? m[1] : null;
}


if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('play', () => player.playVideo());
  navigator.mediaSession.setActionHandler('pause', () => player.pauseVideo());
  navigator.mediaSession.setActionHandler('previoustrack', playPrev);
  navigator.mediaSession.setActionHandler('nexttrack', playNext);
  
  // Mantieni la sessione attiva
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // tenta di continuare (alcuni browser lo consentono)
      try { player.playVideo(); } catch {}
    }
  });
}


// === Imposta listener quando la pagina è pronta ===
document.addEventListener('DOMContentLoaded', () => {
  const createBtn = document.getElementById('createPlaylistBtn');
  const saveBtn = document.getElementById('saveLocal');
  const loadBtn = document.getElementById('loadLocal');
  const clearBtn = document.getElementById('clearPlaylist');
  const importBtn = document.getElementById('importPlaylist'); 
  const modifyYTKeyBtn = document.getElementById('modifyBtn');
  const importFixedBtn = document.getElementById('importFixedBtn');

  if (importFixedBtn) importFixedBtn.addEventListener('click', importFixedPlaylist);
  if (createBtn) createBtn.addEventListener('click', createPlaylistFromPrompt);
  if (saveBtn) saveBtn.addEventListener('click', savePlaylist);
  if (loadBtn) loadBtn.addEventListener('click', loadPlaylistFromLocal);
  if (modifyYTKeyBtn) modifyYTKeyBtn.addEventListener('click', ModificaAPIKey);
  if (clearBtn) clearBtn.addEventListener('click', clearPlaylist);
  if (importBtn) importBtn.addEventListener('click', importPlaylistFromPrompt); // <-- nuovo
});

function ModificaAPIKey() {
  const newKey = prompt("Inserisci la nuova chiave API YouTube:");
  if (newKey !== null) { // premendo "OK" con campo vuoto verrà comunque salvato
    localStorage.setItem('yt_key_suffix', newKey);
    alert("✅ Chiave API aggiornata.");
  }
}

// --- Eventi principali ---


addBtn.addEventListener('click', ()=> {
  const id = extractVideoId(addUrl.value);
  if(!id){ alert('URL o ID non valido'); return; }
  playlist.push({ id, title: id, thumb: '' });
  savePlaylistToTemp();
  renderPlaylist();
});
playBtn.addEventListener('click', togglePlay);
prevBtn.addEventListener('click', playPrev);
nextBtn.addEventListener('click', playNext);



// --- Funzione per ID video da URL o codice ---
function extractVideoId(input){
  if(!input) return null;
  input = input.trim();
  if(/^[-_0-9A-Za-z]{11}$/.test(input)) return input;
  try{
    const url = new URL(input);
    if(url.hostname.includes('youtu.be')) return url.pathname.slice(1);
    if(url.searchParams.get('v')) return url.searchParams.get('v');
  } catch(e){}
  const m = input.match(/v=([-_0-9A-Za-z]{11})/);
  return m ? m[1] : null;
}

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
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, img.width, img.height).data;

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
