


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


function renderPlaylist() {
  const playlistList = document.getElementById('playlistList');
  playlistList.innerHTML = '';

  playlist.forEach((p, idx) => {
    const li = document.createElement('li');
    li.className = 'item';
    li.innerHTML = `
      <img src="${p.thumb || ''}" alt="thumb" />
      <div class="center-content">
        <div class="scrolling-title">${escapeHtml(p.title || p.id)}</div>
        <div class="index-label">#${idx + 1}</div>
      </div>
      <div class="btns">
        <button class="del secondary" data-idx="${idx}">✖</button>
      </div>
    `;

    // Click sull'intero li per far partire la traccia
    li.addEventListener('click', (e) => {
      // Se il click NON è sulla X, riproduci la traccia
      if (!e.target.classList.contains('del')) {
        playIndex(idx);
      }
    });

    // Click sulla X per rimuovere la traccia
    li.querySelector('.del').addEventListener('click', () => {
      playlist.splice(idx, 1);
      savePlaylistToTemp();
      renderPlaylist();
    });

    playlistList.appendChild(li);

    // ==== ANIMAZIONE SCROLL TITOLI LUNGHI ====
    const container = li.querySelector('.center-content');
    const title = li.querySelector('.scrolling-title');

    const containerWidth = container.offsetWidth;
    const titleWidth = title.scrollWidth;

    if (titleWidth > containerWidth) {
      const distance = titleWidth - containerWidth;
      let start = null;

      function step(timestamp) {
        if (!start) start = timestamp;
        const elapsed = (timestamp - start) / 1000; // secondi
        const progress = (elapsed / 6) % 2; // ciclo avanti-indietro (6s di default)

        let offset;
        if (progress <= 1) {
          offset = -distance * progress; // andata
        } else {
          offset = -distance * (2 - progress); // ritorno
        }

        title.style.transform = `translateX(${offset}px)`;
        requestAnimationFrame(step);
      }

      requestAnimationFrame(step);
    }
  });
}



// --- Crea una nuova playlist nel localStorage ---
function createPlaylistFromPrompt() {
  const name = prompt("Inserisci il nome della nuova playlist:");
  if (!name) return;
  const trimmed = name.trim();
  if (!trimmed) {
    alert('Nome non valido.');
    return;
  }
  if (localStorage.getItem(trimmed) !== null) {
    const ok = confirm(`Esiste già una playlist "${trimmed}". Sovrascriverla?`);
    if (!ok) return;
  }
  localStorage.setItem(trimmed, JSON.stringify([]));
  alert(`✅ Playlist "${trimmed}" creata.`);
}

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

// --- Event binding ---
document.addEventListener('DOMContentLoaded', () => {
  const createBtn = document.getElementById('createPlaylistBtn');
  const saveBtn = document.getElementById('saveLocal');
  const loadBtn = document.getElementById('loadLocal');
  const clearBtn = document.getElementById('clearPlaylist');

  if (createBtn) createBtn.addEventListener('click', createPlaylistFromPrompt);
  if (saveBtn) saveBtn.addEventListener('click', savePlaylist);
  if (loadBtn) loadBtn.addEventListener('click', loadPlaylistFromLocal);
  if (clearBtn) clearBtn.addEventListener('click', clearPlaylist);
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


