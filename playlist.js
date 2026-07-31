


console.log("✅ Script caricato correttamente");

const togglePlaylistButtons = document.getElementById('togglePlaylistButtons');
const playlistOverlay = document.getElementById('playlistOverlay');
const closePlaylistOverlay = document.getElementById('closePlaylistOverlay');

togglePlaylistButtons.addEventListener('click', () => {
  playlistOverlay.classList.toggle('active');
});

closePlaylistOverlay.addEventListener('click', () => {
  playlistOverlay.classList.remove('active');
});




// Recupero il bottone
  const createPlaylistBtn = document.getElementById('createPlaylistBtn');
  console.log("🔍 Bottone trovato?", !!createPlaylistBtn);

  // Funzione per creare la playlist
  function createPlaylistFromPrompt() {
    console.log("🎯 Click ricevuto su 'Crea nuova playlist'");
    const name = prompt("Inserisci il nome della nuova playlist (no caratteri / o null):");
    if (!name) {
      console.log("⚠️ Prompt annullato o vuoto");
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      alert('Nome non valido.');
      return;
    }
    if (localStorage.getItem(trimmed) !== null) {
      const ok = confirm(`Esiste già una chiave chiamata "${trimmed}". Sovrascriverla?`);
      if (!ok) return;
    }
    localStorage.setItem(trimmed, JSON.stringify([]));
    console.log(`💾 Playlist "${trimmed}" salvata in localStorage`);
    alert(`Playlist "${trimmed}" creata.`);
  }

  // Aggiunta evento click
  if (createPlaylistBtn) {
    createPlaylistBtn.addEventListener('click', createPlaylistFromPrompt);
    console.log("✅ Listener click aggiunto al bottone");
  } else {
    console.error("❌ Bottone 'createPlaylistBtn' non trovato nel DOM");
  }

// VARIABILE GLOBALE PER TRACCIARE IL VIDEO DA AGGIUNGERE
let videoToAddToPlaylist = null;

function renderPlaylist() {
  const playlistList = document.getElementById('playlistList');
  if (!playlistList) return;

  const listScrollTop = playlistList.scrollTop;
  const pageScrollTop = window.scrollY || document.documentElement.scrollTop;

  playlistList.innerHTML = '';

  playlist.forEach((p, idx) => {
    const li = document.createElement('li');
    li.className = 'item' + (p.id === currentPlayingId ? ' now-playing' : '');
    li.dataset.id = p.id;

    li.innerHTML = `
      <img src="${p.thumb || ''}" alt="thumb" />
      <div class="center-content">
        <div class="scrolling-title">${typeof escapeHtml === 'function' ? escapeHtml(p.title || p.id) : (p.title || p.id)}</div>
        <div class="index-label">#${idx + 1}</div>
      </div>
      <div class="btns">
        <button class="item-menu-btn secondary" data-idx="${idx}">⋮</button>
      </div>
      <!-- Mini Popover Menu -->
      <div class="item-popover hidden">
        <button class="popover-opt opt-add">➕ Aggiungi a playlist</button>
        <button class="popover-opt opt-del">🗑️ Elimina dalla coda</button>
      </div>
    `;

    // Click sull'elemento -> Riproduzione
    li.addEventListener('click', (e) => {
      if (!e.target.closest('.btns') && !e.target.closest('.item-popover')) {
        playIndex(idx);
      }
    });

    const menuBtn = li.querySelector('.item-menu-btn');
    const popover = li.querySelector('.item-popover');
    const btnAdd = li.querySelector('.opt-add');
    const btnDel = li.querySelector('.opt-del');

    // Apertura Popover Menu
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.item-popover').forEach(p => {
        if (p !== popover) p.classList.add('hidden');
      });
      popover.classList.toggle('hidden');
    });

    // Opzione 1: Aggiungi a Playlist (Apre Selezione Grafica)
    btnAdd.addEventListener('click', (e) => {
      e.stopPropagation();
      popover.classList.add('hidden');
      openSelectPlaylistModal(p); // Passa l'oggetto video corrente
    });

    // Opzione 2: Elimina dalla Coda
    btnDel.addEventListener('click', (e) => {
      e.stopPropagation();
      playlist.splice(idx, 1);
      if (typeof savePlaylistToTemp === 'function') savePlaylistToTemp();
      renderPlaylist();
    });

    if (typeof enableLongPressDrag === 'function') {
      enableLongPressDrag(li);
    }

    playlistList.appendChild(li);

    // Animazione Scroll Titoli Lunghi
    const container = li.querySelector('.center-content');
    const title = li.querySelector('.scrolling-title');
    const containerWidth = container.offsetWidth;
    const titleWidth = title.scrollWidth;

    if (titleWidth > containerWidth) {
      const distance = titleWidth - containerWidth;
      let start = null;
      function step(timestamp) {
        if (!start) start = timestamp;
        const elapsed = (timestamp - start) / 1000;
        const progress = (elapsed / 6) % 2;
        let offset;
        if (progress <= 1) offset = -distance * progress;
        else offset = -distance * (2 - progress);
        title.style.transform = `translateX(${offset}px)`;
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
  });

  playlistList.scrollTop = listScrollTop;
  window.scrollTo(0, pageScrollTop);
}

// ==========================================
// LOGICA SELEZIONE GRAFICA DELLE PLAYLIST
// ==========================================

function openSelectPlaylistModal(videoObject) {
  videoToAddToPlaylist = videoObject;
  const modal = document.getElementById('select-playlist-overlay');
  const grid = document.getElementById('select-playlist-grid');
  if (!modal || !grid) return;

  grid.innerHTML = '';

  // Filtra solo le playlist utente (chiavi xx_)
  const keys = Object.keys(localStorage).filter(k => k.startsWith('xx_'));

  if (keys.length === 0) {
    grid.innerHTML = `<div class="empty-msg">Nessuna playlist creata in libreria.</div>`;
  } else {
    keys.forEach(storageKey => {
      const displayName = storageKey.replace(/^xx_/, '');
      const items = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const firstVideoId = items[0]?.id || items[0]?.videoId;
      const thumbnailUrl = firstVideoId 
        ? `https://i.ytimg.com/vi/${firstVideoId}/hqdefault.jpg` 
        : '';

      const card = document.createElement('div');
      card.className = 'select-playlist-card';
      if (thumbnailUrl) {
        card.style.backgroundImage = `url('${thumbnailUrl}')`;
      }

      card.innerHTML = `
        <div class="select-card-overlay">
          <div class="select-card-title">${typeof escapeHtml === 'function' ? escapeHtml(displayName) : displayName}</div>
          <div class="select-card-count">${items.length} brani</div>
        </div>
      `;

      // Click sulla scheda -> Append del video alla playlist
      card.addEventListener('click', () => {
        appendVideoToPlaylist(storageKey, displayName, videoToAddToPlaylist);
        closeSelectPlaylistModal();
      });

      grid.appendChild(card);
    });
  }

  modal.classList.add('open');
}

function closeSelectPlaylistModal() {
  const modal = document.getElementById('select-playlist-overlay');
  if (modal) modal.classList.remove('open');
  videoToAddToPlaylist = null;
}

function appendVideoToPlaylist(storageKey, displayName, videoObj) {
  if (!videoObj) return;

  const items = JSON.parse(localStorage.getItem(storageKey) || '[]');
  const targetId = videoObj.id || videoObj.videoId;

  // Controllo duplicati
  const exists = items.some(item => (item.id || item.videoId) === targetId);
  if (exists) {
    alert(`⚠️ Il brano è già presente nella playlist "${displayName}"!`);
    return;
  }

  items.push(videoObj);
  localStorage.setItem(storageKey, JSON.stringify(items));
}

// Chiudi Popover al click esterno
document.addEventListener('click', () => {
  document.querySelectorAll('.item-popover').forEach(p => p.classList.add('hidden'));
});

// Listener per chiusura Modale
document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('close-select-playlist-btn');
  const overlay = document.getElementById('select-playlist-overlay');

  if (closeBtn) closeBtn.addEventListener('click', closeSelectPlaylistModal);
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeSelectPlaylistModal();
    });
  }
});


function savePlaylist() {
  const currentQueue = JSON.parse(localStorage.getItem('mytube_playlist') || '[]');
  if (currentQueue.length === 0) {
    alert("❌ La coda è vuota, nulla da salvare.");
    return;
  }

  const keys = Object.keys(localStorage).filter(k => {
    try { JSON.parse(localStorage.getItem(k)); return true; }
    catch { return false; }
  });

  if (keys.length === 0) {
    alert("⚠️ Non esistono playlist salvate. Creane una prima!");
    return;
  }

  // Se esiste già un popup, rimuovilo
  const existing = document.getElementById('playlistSaveOverlay');
  if (existing) existing.remove();

  // Overlay
  const overlay = document.createElement('div');
  overlay.id = 'playlistSaveOverlay';
  Object.assign(overlay.style, {
     color: '#ffffffff',
    position: 'fixed',
    inset: '0',
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: '1000',
    scrollbarStyle: 'hidden'
  });

  // Box
  // Box principale
  const box = document.createElement('div');
  box.id = 'Popup_selezione'; // o box.classList.add('playlistBox')

  const title = document.createElement('h3');
  title.textContent = "Scegli la playlist dove salvare:";
  title.style.marginBottom = '1rem';
  box.appendChild(title);

  // Bottoni per ogni playlist
  keys.forEach(k => {
    const btn = document.createElement('button');
    btn.textContent = k;
    Object.assign(btn.style, {
       color: '#ffffffff',
      display: 'block',
      width: '100%',
      padding: '0.9rem',
      margin: '0.9rem 0',
      borderRadius: '0.5rem',
      border: '1px solid #ccc',
      background: '#35353570',
      cursor: 'pointer',
      transition: 'background 0.2s'
    });
    btn.addEventListener('mouseover', () => btn.style.background = '#e0e0e0');
    btn.addEventListener('mouseout', () => btn.style.background = '#35353570');
    btn.addEventListener('click', () => {
      const data = localStorage.getItem(k);
      if (!data) return alert(`⚠️ Playlist "${k}" non esiste.`);

      try {
        const parsed = JSON.parse(data);
        if (!Array.isArray(parsed)) throw new Error();
        const merged = [...parsed, ...currentQueue];
        localStorage.setItem(k, JSON.stringify(merged));

        overlay.remove();
        alert(`✅ ${currentQueue.length} elementi aggiunti alla playlist "${k}".`);
        console.log(`💾 Playlist "${k}" aggiornata con ${currentQueue.length} nuovi elementi.`);
      } catch {
        alert("❌ Errore nel salvataggio nella playlist selezionata.");
      }
    });
    box.appendChild(btn);
  });

  // Bottone "Annulla"
  const cancel = document.createElement('button');
  cancel.textContent = "Annulla";
  Object.assign(cancel.style, {
    color: '#ffffffff',
    marginTop: '1rem',
    padding: '0.4rem 0.8rem',
    borderRadius: '0.5rem',
    border: 'none',
    background: '#27272754',
    cursor: 'pointer'
  });
  cancel.addEventListener('click', () => overlay.remove());
  box.appendChild(cancel);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

// --- Carica la coda temporanea mytube_playlist ---
function loadPlaylistFromLocal(){
  playlist = JSON.parse(localStorage.getItem('mytube_playlist') || '[]');
  renderPlaylist();
}

// --- Svuota la playlist attuale ---
function clearPlaylist(){
  playlist = [];
  savePlaylistToTemp();
  renderPlaylist();
}

function shufflePlaylist() {
  if (playlist.length <= 1) return;

  // 1. Memorizziamo l'ID del brano in riproduzione per non perdere il segno
  const currentId = playlist[currentIndex] ? playlist[currentIndex].id : null;

  // 2. Algoritmo di Fisher-Yates per mischiare l'array 'playlist'
  for (let i = playlist.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [playlist[i], playlist[j]] = [playlist[j], playlist[i]];
  }

  // 3. Riposizioniamo currentIndex sul brano che era attivo
  if (currentId) {
    currentIndex = playlist.findIndex(p => p.id === currentId);
  }

  // 4. Salviamo la coda rimescolata nel localStorage con il nome corretto
  localStorage.setItem('mytube_playlist', JSON.stringify(playlist));

  renderPlaylist();
}

// --- Event binding ---
document.addEventListener('DOMContentLoaded', () => {
  const createBtn = document.getElementById('createPlaylistBtn');
  const saveBtn = document.getElementById('saveLocal');
  const loadBtn = document.getElementById('loadLocal');
  const clearBtn = document.getElementById('clearPlaylist');
  const shuffleBtn = document.getElementById('shuffleBtn');
  const randomizerBtn = document.getElementById('randomizerBtn');

  if (createBtn) createBtn.addEventListener('click', createPlaylistFromPrompt);
  if (saveBtn) saveBtn.addEventListener('click', savePlaylist);
  if (loadBtn) loadBtn.addEventListener('click', loadPlaylistFromLocal);
  if (clearBtn) clearBtn.addEventListener('click', clearPlaylist);
  if (shuffleBtn) shuffleBtn.addEventListener('click', shufflePlaylist);
  if (randomizerBtn) randomizerBtn.addEventListener('click', openRandomizerSelector);

});

// --- Helper HTML escape ---
function escapeHtml(s){
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}


function loadPlaylistFromSelection() {
  const keys = Object.keys(localStorage).filter(k => {
    try {
      JSON.parse(localStorage.getItem(k));
      return true;
    } catch {
      return false;
    }
  });

  if (keys.length === 0) {
    alert("❌ Nessuna playlist salvata trovata.");
    return;
  }

  // Se esiste già una finestra aperta, rimuovila
  const existing = document.getElementById('playlistSelectorOverlay');
  if (existing) existing.remove();

  // Crea overlay
  const overlay = document.createElement('div');
  overlay.id = 'playlistSelectorOverlay';
  Object.assign(overlay.style, {
    color: '#ffffffff',
    position: 'fixed',
    inset: '0',
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: '1000',
    overflowY: 'scroll',
    scrollbarStyle: 'hidden'
  });

  // Box principale
  const box = document.createElement('div');
  box.id = 'Popup_selezione'; // o box.classList.add('playlistBox')

  const title = document.createElement('h3');
  title.textContent = "Seleziona una playlist:";
  title.style.marginBottom = '1rem';
  box.appendChild(title);

  // Lista opzioni
  keys.forEach(k => {
    const btn = document.createElement('button');
    btn.textContent = k;
    Object.assign(btn.style, {
      color: '#ffffffff',
      display: 'block',
      width: '100%',
      padding: '0.9rem',
      margin: '0.9rem 0',
      borderRadius: '0.5rem',
      border: '1px solid #ccc',
      background: '#35353570',
      cursor: 'pointer',
      transition: 'background 0.2s'
    });
    btn.addEventListener('mouseover', () => btn.style.background = '#e0e0e0');
    btn.addEventListener('mouseout', () => btn.style.background = '#35353570');
    btn.addEventListener('click', () => {
      const data = localStorage.getItem(k);
      if (!data) return alert(`⚠️ Playlist "${k}" non esiste.`);
      try {
        const parsed = JSON.parse(data);
        if (!Array.isArray(parsed)) throw new Error();
        localStorage.setItem('mytube_playlist', JSON.stringify(parsed));
        if (typeof playlist !== 'undefined') {
          playlist = parsed;
          if (typeof renderPlaylist === 'function') renderPlaylist();
        }
        overlay.remove();
        alert(`✅ Playlist "${k}" caricata (${parsed.length} elementi).`);
      } catch {
        alert("❌ Errore nel caricamento della playlist selezionata.");
      }
    });
    box.appendChild(btn);
  });

  // Bottone per annullare
  const cancel = document.createElement('button');
  cancel.textContent = "Annulla";
  Object.assign(cancel.style, {
    color: '#ffffffff',
    marginTop: '1rem',
    padding: '0.4rem 0.8rem',
    borderRadius: '0.5rem',
    border: 'none',
    background: '#27272754',
    cursor: 'pointer'
  });
  cancel.addEventListener('click', () => overlay.remove());
  box.appendChild(cancel);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

function openRandomizerSelector() {
  const allKeys = Object.keys(localStorage);
  
  // 1. Identifichiamo le playlist valide
  const playlistKeys = allKeys.filter(k => {
    if (k === 'yt_key_suffix' || k === 'mytube_playlist') return false;
    try {
      return Array.isArray(JSON.parse(localStorage.getItem(k)));
    } catch { return false; }
  });

  if (playlistKeys.length === 0) {
    alert("❌ Nessuna playlist salvata trovata.");
    return;
  }

  // 2. Creazione Overlay (stile MyTube)
  const overlay = document.createElement('div');
  overlay.id = 'randomizerOverlay';
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.8)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '2000'
  });

  const box = document.createElement('div');
  box.id = 'Popup_selezione'; // Uso il tuo ID per mantenere lo stile CSS
  box.style.maxHeight = '80vh';
  box.style.overflowY = 'auto';

  const title = document.createElement('h3');
  title.textContent = "Seleziona le sorgenti per il Mix:";
  title.style.color = "white";
  box.appendChild(title);

  // Contenitore per le opzioni
  const listContainer = document.createElement('div');
  listContainer.style.margin = "1.5rem 0";

  // 3. Creiamo le righe con checkbox
  const selectedKeys = [];

  playlistKeys.forEach(k => {
    const label = document.createElement('label');
    Object.assign(label.style, {
      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px',
      background: '#35353570', margin: '5px 0', borderRadius: '5px', cursor: 'pointer', color: 'white'
    });

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = k;
    cb.checked = true; // Di default le selezioniamo tutte

    label.appendChild(cb);
    label.append(k);
    listContainer.appendChild(label);
  });
  box.appendChild(listContainer);

  // 4. Bottone Genera
  const genBtn = document.createElement('button');
  genBtn.textContent = "🎲 Genera Mix Casuale";
  Object.assign(genBtn.style, {
    width: '100%', padding: '12px', background: '#e62117', color: 'white',
    border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'
  });

  genBtn.addEventListener('click', () => {
    // Recupera solo le chiavi spuntate
    const checked = Array.from(box.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.value);
    
    if (checked.length === 0) return alert("Seleziona almeno una playlist!");

    runSmartRandomizer(checked); // Esegue il mix
    overlay.remove();
  });

  // 5. Bottone Annulla
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = "Annulla";
  Object.assign(cancelBtn.style, {
    width: '100%', marginTop: '10px', padding: '8px', background: 'transparent',
    color: '#aaa', border: '1px solid #555', borderRadius: '5px', cursor: 'pointer'
  });
  cancelBtn.addEventListener('click', () => overlay.remove());

  box.appendChild(genBtn);
  box.appendChild(cancelBtn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

// La funzione core che elabora i dati
function runSmartRandomizer(targetKeys) {
  let newRandomCoda = [];

  targetKeys.forEach(key => {
    const data = JSON.parse(localStorage.getItem(key));
    if (data.length > 0) {
      // Peschiamo un numero casuale di brani (da 2 a 6)
      const numToExtract = Math.min(data.length, Math.floor(Math.random() * 11) + 10);
      const shuffledSrc = [...data].sort(() => 0.5 - Math.random());
      newRandomCoda = [...newRandomCoda, ...shuffledSrc.slice(0, numToExtract)];
    }
  });

  // Mischia finale (Fisher-Yates)
  for (let i = newRandomCoda.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newRandomCoda[i], newRandomCoda[j]] = [newRandomCoda[j], newRandomCoda[i]];
  }

  playlist = newRandomCoda;
  currentIndex = 0;
  savePlaylistToTemp();
  renderPlaylist();
  
  alert(`🔀 Mix creato: ${playlist.length} brani estratti.`);
}
// Aggiunge listener al bottone “Carica locale”
document.addEventListener('DOMContentLoaded', () => {
  const loadLocalBtn = document.getElementById('loadLocal');
  if (loadLocalBtn) {
    loadLocalBtn.addEventListener('click', loadPlaylistFromSelection);
  }
});


function overwritePlaylist() {
  const currentQueue = JSON.parse(localStorage.getItem('mytube_playlist') || '[]');
  if (currentQueue.length === 0) {
    alert("⚠️ La coda è vuota, nulla da salvare.");
    return;
  }

  const keys = Object.keys(localStorage).filter(k => {
    try { JSON.parse(localStorage.getItem(k)); return true; }
    catch { return false; }
  });

  if (keys.length === 0) {
    alert("❌ Non ci sono playlist salvate. Creane una prima!");
    return;
  }

  // Se esiste già un popup, rimuovilo
  const existing = document.getElementById('playlistOverwriteOverlay');
  if (existing) existing.remove();

  // Overlay
  const overlay = document.createElement('div');
  overlay.id = 'playlistOverwriteOverlay';
  Object.assign(overlay.style, {
    color: '#ffffffff',
    position: 'fixed',
    inset: '0',
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: '1000',
    overflowY: 'scroll'
  });

  // Box principale
  const box = document.createElement('div');
  box.id = 'Popup_selezione'; // o box.classList.add('playlistBox')

   // Titolo
  const title = document.createElement('h3');
  title.textContent = "⚠️ Scegli la playlist da sovrascrivere:";
  title.classList.add('playlistBox-title'); 
  box.appendChild(title);


  // Aggiunge bottoni per ogni playlist
  keys.forEach(k => {
    const btn = document.createElement('button');
    btn.textContent = k;
    Object.assign(btn.style, {
      color: '#ffffffff',
      display: 'block',
      width: '100%',
      padding: '0.9rem',
      margin: '0.9rem 0',
      borderRadius: '0.5rem',
      border: '1px solid #ccc',
      background: '#35353570',
      cursor: 'pointer',
      transition: 'background 0.2s'
    });
    btn.addEventListener('mouseover', () => btn.style.background = '#f0d0d0');
    btn.addEventListener('mouseout', () => btn.style.background = '#35353570');
    btn.addEventListener('click', () => {
      if (!confirm(`⚠️ Sovrascrivere completamente "${k}" con la coda attuale (${currentQueue.length} elementi)?`))
        return;

      try {
        localStorage.setItem(k, JSON.stringify(currentQueue));
        overlay.remove();
        alert(`✅ Playlist "${k}" sovrascritta con ${currentQueue.length} elementi.`);
        console.log(`💾 Playlist "${k}" sovrascritta.`);
      } catch {
        alert("❌ Errore nel salvataggio della playlist.");
      }
    });
    box.appendChild(btn);
  });

  // Bottone annulla
  const cancel = document.createElement('button');
  cancel.textContent = "Annulla";
  Object.assign(cancel.style, {
    color: '#ffffffff',
    marginTop: '1rem',
    padding: '0.4rem 0.8rem',
    borderRadius: '0.5rem',
    border: 'none',
    background: '#27272754',
    cursor: 'pointer'
  });
  cancel.addEventListener('click', () => overlay.remove());
  box.appendChild(cancel);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}


// Listener per il nuovo bottone
document.addEventListener('DOMContentLoaded', () => {
  const overwriteBtn = document.getElementById('overwriteLocal');
  if (overwriteBtn) {
    overwriteBtn.addEventListener('click', overwritePlaylist);
  }
});

function deletePlaylist() {
  const keys = Object.keys(localStorage).filter(k => {
    try { JSON.parse(localStorage.getItem(k)); return true; }
    catch { return false; }
  });

  if (keys.length === 0) {
    alert("❌ Non ci sono playlist salvate da eliminare.");
    return;
  }

  // Rimuovi eventuale overlay esistente
  const existing = document.getElementById('playlistDeleteOverlay');
  if (existing) existing.remove();

  // Overlay scuro
  const overlay = document.createElement('div');
  overlay.id = 'playlistDeleteOverlay';
  Object.assign(overlay.style, {
    color: '#ffffffff',
    position: 'fixed',
    inset: '0',
    background: 'rgba(0, 0, 0, 0.77)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: '1000',
    overflowY: 'scroll'
  });

  // Box principale
  const box = document.createElement('div');
  box.id = 'Popup_selezione'; // o box.classList.add('playlistBox')

  const title = document.createElement('h3');
  title.textContent = "🗑️ Seleziona la playlist da eliminare:";
  title.classList.add('playlistBox-title');
  box.appendChild(title);


  // Bottoni per ogni playlist salvata
   keys.forEach(k => {
    const btn = document.createElement('button');
    btn.textContent = k;
    Object.assign(btn.style, {
      display: 'block',
      width: '100%',
      padding: '0.8rem',
      margin: '0.5rem 0',
      borderRadius: '0.5rem',
      border: '1px solid #aaa',
      background: '#35353570',
      color: '#fff',
      cursor: 'pointer',
      transition: 'background 0.2s'
    });

    // Se è mytube_playlist → disabilitato
    if (k === 'mytube_playlist') {
      btn.disabled = true;
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
      btn.title = "Non puoi eliminare la playlist principale";
    } else {
      btn.addEventListener('mouseover', () => btn.style.background = '#f0d0d0');
      btn.addEventListener('mouseout', () => btn.style.background = '#35353570');
      btn.addEventListener('click', () => {
        if (confirm(`⚠️ Vuoi davvero eliminare la playlist "${k}"?`)) {
          localStorage.removeItem(k);
          overlay.remove();
          alert(`🗑️ Playlist "${k}" eliminata con successo.`);
        }
      });
    }

    box.appendChild(btn);
  });

  // Bottone Annulla
  const cancel = document.createElement('button');
  cancel.textContent = "Annulla";
  Object.assign(cancel.style, {
    color: '#ffffffff',
    marginTop: '1rem',
    padding: '0.4rem 0.8rem',
    borderRadius: '0.5rem',
    border: 'none',
    background: '#27272754',
    cursor: 'pointer'
  });
  cancel.addEventListener('click', () => overlay.remove());
  box.appendChild(cancel);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

// 🔗 Listener per il bottone "Elimina playlist"
document.addEventListener('DOMContentLoaded', () => {
  const deleteBtn = document.getElementById('deletePlaylistBtn');
  console.log("Pagina caricata, renderPlaylist in esecuzione...");
  renderPlaylist();
  if (deleteBtn) {
    deleteBtn.addEventListener('click', deletePlaylist);
  }
});


const LONG_PRESS_MS = 450;
const MOVE_CANCEL_THRESHOLD = 10; // px di tolleranza prima di annullare il long-press

function enableLongPressDrag(li) {
  let pressTimer = null;
  let dragging = false;
  let startX = 0, startY = 0;

  function cleanup() {
    dragging = false;
    li.classList.remove('dragging');
    li.style.transform = '';
    li.style.pointerEvents = '';
    document.querySelectorAll('.item.drag-target-above, .item.drag-target-below')
      .forEach(el => el.classList.remove('drag-target-above', 'drag-target-below'));
    clearTimeout(pressTimer);
  }

  function getClientCoords(e) {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (e.changedTouches && e.changedTouches.length > 0) {
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  function onStart(e) {
    if (e.target.closest('.del')) return;

    const coords = getClientCoords(e);
    startX = coords.x;
    startY = coords.y;

    pressTimer = setTimeout(() => {
      dragging = true;
      li.classList.add('dragging');
    }, LONG_PRESS_MS);

    // Eventi Touch
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);

    // Eventi Mouse (Desktop)
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
  }

  function onMove(e) {
    const coords = getClientCoords(e);
    const dx = Math.abs(coords.x - startX);
    const dy = Math.abs(coords.y - startY);

    if (!dragging) {
      // Se si muove prima di 450ms, annulla il timer per permettere lo scroll nativo del container
      if (dx > MOVE_CANCEL_THRESHOLD || dy > MOVE_CANCEL_THRESHOLD) {
        clearTimeout(pressTimer);
      }
      return;
    }

    // Una volta che il drag è attivo, blocca lo scroll del container
    if (e.cancelable) {
      e.preventDefault();
    }

    const offsetY = coords.y - startY;
    li.style.transform = `translateY(${offsetY}px)`;

    document.querySelectorAll('.item.drag-target-above, .item.drag-target-below')
      .forEach(el => el.classList.remove('drag-target-above', 'drag-target-below'));

    const siblings = Array.from(playlistList.children).filter(el => el !== li);
    for (const sib of siblings) {
      const rect = sib.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (coords.y < midY) {
        sib.classList.add('drag-target-above');
        break;
      } else if (sib === siblings[siblings.length - 1]) {
        sib.classList.add('drag-target-below');
      }
    }
  }

  function onEnd(e) {
    clearTimeout(pressTimer);

    window.removeEventListener('touchmove', onMove);
    window.removeEventListener('touchend', onEnd);
    window.removeEventListener('touchcancel', onEnd);
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onEnd);

    if (dragging) {
      const targetAbove = document.querySelector('.item.drag-target-above');
      const targetBelow = document.querySelector('.item.drag-target-below');
      const draggedId = li.dataset.id;

      let newOrderIds = Array.from(playlistList.children)
        .filter(el => el !== li)
        .map(el => el.dataset.id);

      if (targetAbove) {
        const insertBeforeId = targetAbove.dataset.id;
        const insertIdx = newOrderIds.indexOf(insertBeforeId);
        newOrderIds.splice(insertIdx, 0, draggedId);
      } else if (targetBelow) {
        newOrderIds.push(draggedId);
      } else {
        newOrderIds.splice(playlist.findIndex(p => p.id === draggedId), 0, draggedId);
      }

      const byId = new Map(playlist.map(p => [p.id, p]));
      playlist = newOrderIds.map(id => byId.get(id));

      savePlaylistToTemp();
      cleanup();
      renderPlaylist();
    } else {
      cleanup();
    }
  }

  li.addEventListener('touchstart', onStart, { passive: true });
  li.addEventListener('mousedown', onStart);
}