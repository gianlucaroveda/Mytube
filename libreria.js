{
  // --- ELEMENTI DOM DEL MODALE LIBRERIA ---
  const libraryOverlay = document.getElementById('library-overlay');
  const btnLibraryFooter = document.getElementById('footer-library-btn');

  // Funzione helper locale per sicurezza nell'HTML
  function safeText(str) {
    if (typeof escapeHtml === 'function') return escapeHtml(str);
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- FILTRO CHIAVI LOCALSTORAGE ---
  function getSavedPlaylistKeys() {
    return Object.keys(localStorage).filter(key => {
      if (!key.startsWith('xx_')) return false;
      try {
        const data = JSON.parse(localStorage.getItem(key));
        return Array.isArray(data);
      } catch {
        return false;
      }
    });
  }

  // --- FUNZIONE PER CREARE UNA NUOVA PLAYLIST VUOTA ---
  function createNewPlaylist() {
    const name = prompt("Inserisci il nome per la nuova playlist:");
    if (!name || !name.trim()) return;

    const cleanName = name.trim();
    const storageKey = `xx_${cleanName}`;

    if (localStorage.getItem(storageKey)) {
      alert("⚠️ Esiste già una playlist con questo nome!");
      return;
    }

    localStorage.setItem(storageKey, JSON.stringify([]));
    renderLibraryPlaylists();
  }

  // --- APERTURA E CHIUSURA ---
  function openLibraryModal() {
    if (!libraryOverlay) return;
    renderLibraryPlaylists();
    libraryOverlay.classList.add('open');
  }

  function closeLibraryModal() {
    if (!libraryOverlay) return;
    libraryOverlay.classList.remove('open');
  }

  // --- RENDERING DEI CUBOTTI ---
  function renderLibraryPlaylists() {
    const libraryGrid = document.getElementById('libraryGrid') || document.getElementById('library-grid');
    if (!libraryGrid) return;
    libraryGrid.innerHTML = '';

    // 1. CUBOTTO "+ NUOVA PLAYLIST"
    const addCard = document.createElement('div');
    addCard.className = 'playlist-card create-card';
    addCard.innerHTML = `
      <div class="create-card-content">
        <span class="plus-icon">+</span>
        <span class="create-title">Nuova Playlist</span>
      </div>
    `;
    addCard.addEventListener('click', createNewPlaylist);
    libraryGrid.appendChild(addCard);

    // 2. CUBOTTI PLAYLIST SALVATE
    const playlistKeys = getSavedPlaylistKeys();

    playlistKeys.forEach(storageKey => {
      const displayName = storageKey.replace(/^xx_/, '');
      const items = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      const firstVideoId = items[0]?.id || items[0]?.videoId;
      const thumbnailUrl = firstVideoId 
        ? `https://i.ytimg.com/vi/${firstVideoId}/hqdefault.jpg` 
        : '';

      const card = document.createElement('div');
      card.className = 'playlist-card';
      if (thumbnailUrl) {
        card.style.backgroundImage = `url('${thumbnailUrl}')`;
      }

      card.innerHTML = `
        <div class="playlist-card-overlay">
          <div class="playlist-info">
            <div class="playlist-card-title">${safeText(displayName)}</div>
            <div class="playlist-card-count">${items.length} elementi</div>
          </div>
          <button class="card-options-btn" title="Opzioni">⋮</button>
        </div>
      `;

      // LOGICA DI CONFERMA INLINE (Metodo 1)
      const optionsBtn = card.querySelector('.card-options-btn');
      let timeoutId = null;

      optionsBtn.addEventListener('click', (e) => {
        // Evita che il click avvii il caricamento della playlist
        e.stopPropagation();

        if (!optionsBtn.classList.contains('confirming')) {
          // PRIMO CLICK: Trasforma il bottone nel badge di conferma
          optionsBtn.classList.add('confirming');
          optionsBtn.textContent = 'Elimina';

          // Ripristino automatico dopo 3 secondi di inattività
          timeoutId = setTimeout(() => {
            optionsBtn.classList.remove('confirming');
            optionsBtn.textContent = '⋮';
          }, 3000);

        } else {
          // SECONDO CLICK: Annulla il timer ed elimina la playlist
          clearTimeout(timeoutId);
          localStorage.removeItem(storageKey);
          renderLibraryPlaylists();
        }
      });

      // Click sul resto del cubotto -> Carica la playlist nel player
      card.addEventListener('click', () => {
        if (typeof playlist !== 'undefined') {
          playlist = items;
        }
        
        if (typeof savePlaylistToTemp === 'function') savePlaylistToTemp();
        if (typeof renderPlaylist === 'function') renderPlaylist();

        if (typeof updateBackgroundFromThumbnail === 'function' && firstVideoId) {
          updateBackgroundFromThumbnail(firstVideoId);
        }

        closeLibraryModal();
      });

      libraryGrid.appendChild(card);
    });
  }

  // --- EVENT LISTENERS ---
  if (btnLibraryFooter) {
    btnLibraryFooter.addEventListener('click', openLibraryModal);
  }

  if (libraryOverlay) {
    libraryOverlay.addEventListener('click', function (e) {
      if (e.target === libraryOverlay) {
        closeLibraryModal();
      }
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && libraryOverlay && libraryOverlay.classList.contains('open')) {
      closeLibraryModal();
    }
  });
}

{
  // --- ELEMENTI DOM ---
document.addEventListener('DOMContentLoaded', () => {
  const randomizerOverlay = document.getElementById('randomizer-overlay');
  
  // 🔴 FIX: Colleghiamo l'apertura al pulsante desiderato (es. #footer-search-btn o #randomizerBtn se esiste)
  const randomizerBtn = document.getElementById('randomizerBtn') || document.getElementById('footer-profile-btn');
  const closeRandomizerBtn = document.getElementById('close-randomizer-btn');
  
  const createMixCard = document.getElementById('createMixCard');
  const mixSelectOverlay = document.getElementById('mix-select-overlay');
  const closeMixSelectBtn = document.getElementById('close-mix-select-btn');
  const mixPlaylistChecklist = document.getElementById('mixPlaylistChecklist');
  const mixNameInput = document.getElementById('mixNameInput');
  const saveMixBtn = document.getElementById('saveMixBtn');
  const dailyMixGrid = document.getElementById('dailyMixGrid');

  // Prefix in localStorage per i Daily Mix
  const MIX_PREFIX = 'mix_';

  // --- APERTURA / CHIUSURA MODALE RANDOMIZER ---
  function openRandomizerModal() {
    if (randomizerOverlay) {
      randomizerOverlay.classList.add('open');
      renderDailyMixes();
    }
  }

  function closeRandomizerModal() {
    if (randomizerOverlay) randomizerOverlay.classList.remove('open');
  }

  if (randomizerBtn) randomizerBtn.addEventListener('click', openRandomizerModal);
  if (closeRandomizerBtn) closeRandomizerBtn.addEventListener('click', closeRandomizerModal);

  if (randomizerOverlay) {
    randomizerOverlay.addEventListener('click', (e) => {
      if (e.target === randomizerOverlay) closeRandomizerModal();
    });
  }

  // --- CREAZIONE E SELEZIONE PLAYLIST PER DAILY MIX ---
  if (createMixCard) {
    createMixCard.addEventListener('click', () => {
      openMixCreationModal();
    });
  }

  function openMixCreationModal() {
    if (!mixSelectOverlay || !mixPlaylistChecklist) return;

    mixNameInput.value = '';
    mixPlaylistChecklist.innerHTML = '';

    // Recupera tutte le playlist dell'utente (chiavi xx_)
    const keys = Object.keys(localStorage).filter(k => k.startsWith('xx_'));

    if (keys.length === 0) {
      mixPlaylistChecklist.innerHTML = `<div class="empty-msg">Nessuna playlist trovata in libreria. Crea prima delle playlist!</div>`;
    } else {
      keys.forEach(key => {
        const name = key.replace(/^xx_/, '');
        let items = [];
        try {
          items = JSON.parse(localStorage.getItem(key) || '[]');
        } catch (err) {
          items = [];
        }

        const safeName = typeof escapeHtml === 'function' ? escapeHtml(name) : name;

        const itemDiv = document.createElement('label');
        itemDiv.className = 'checklist-item';
        itemDiv.innerHTML = `
          <input type="checkbox" value="${key}" />
          <span>${safeName} (${items.length} brani)</span>
        `;
        mixPlaylistChecklist.appendChild(itemDiv);
      });
    }

    mixSelectOverlay.classList.add('open');
  }

  function closeMixSelectModal() {
    if (mixSelectOverlay) mixSelectOverlay.classList.remove('open');
  }

  if (closeMixSelectBtn) closeMixSelectBtn.addEventListener('click', closeMixSelectModal);

  // --- SALVATAGGIO NUOVO DAILY MIX ---
  if (saveMixBtn) {
    saveMixBtn.addEventListener('click', () => {
      const mixName = mixNameInput.value.trim();
      if (!mixName) {
        alert('⚠️ Inserisci un nome per il tuo Daily Mix!');
        return;
      }

      const selectedCheckboxes = mixPlaylistChecklist.querySelectorAll('input[type="checkbox"]:checked');
      const selectedKeys = Array.from(selectedCheckboxes).map(cb => cb.value);

      if (selectedKeys.length === 0) {
        alert('⚠️ Seleziona almeno una playlist da cui attingere i brani!');
        return;
      }

      const mixData = {
        name: mixName,
        sourcePlaylists: selectedKeys
      };

      localStorage.setItem(MIX_PREFIX + Date.now(), JSON.stringify(mixData));
      closeMixSelectModal();
      renderDailyMixes();
    });
  }

  // --- RENDERING DEI DAILY MIX ESISTENTI ---
  function renderDailyMixes() {
    if (!dailyMixGrid) return;

    // Rimuovi tutte le card esistenti tranne quella con il '+' per creare
    const cards = dailyMixGrid.querySelectorAll('.mix-card:not(.create-card)');
    cards.forEach(c => c.remove());

    const mixKeys = Object.keys(localStorage).filter(k => k.startsWith(MIX_PREFIX));

    mixKeys.forEach(mixKey => {
      let mixData = {};
      try {
        mixData = JSON.parse(localStorage.getItem(mixKey) || '{}');
      } catch (e) {
        return;
      }

      const safeName = typeof escapeHtml === 'function' ? escapeHtml(mixData.name || '') : (mixData.name || '');
      const sourceCount = (mixData.sourcePlaylists && mixData.sourcePlaylists.length) ? mixData.sourcePlaylists.length : 0;

      const card = document.createElement('div');
      card.className = 'mix-card mix-item-card';

      card.innerHTML = `
        <div class="mix-card-overlay">
          <div class="mix-card-title">🎲 ${safeName}</div>
          <div class="mix-card-sub">${sourceCount} playlist mixate</div>
        </div>
        <button class="delete-mix-btn">&times;</button>
      `;

      // Click sulla card -> Unisce i brani e fa lo SHUFFLE
      card.addEventListener('click', (e) => {
        if (!e.target.classList.contains('delete-mix-btn')) {
          playDailyMix(mixData);
          closeRandomizerModal();
        }
      });

      // Eliminazione Mix
      const delBtn = card.querySelector('.delete-mix-btn');
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Eliminare il mix "${mixData.name}"?`)) {
          localStorage.removeItem(mixKey);
          renderDailyMixes();
        }
      });

      dailyMixGrid.appendChild(card);
    });
  }

  // --- SHUFFLE E CARICAMENTO IN CODA ---
  function playDailyMix(mixData) {
    let combinedTracks = [];

    if (!mixData.sourcePlaylists) return;

    // Estrai i brani da tutte le playlist selezionate
    mixData.sourcePlaylists.forEach(key => {
      try {
        const items = JSON.parse(localStorage.getItem(key) || '[]');
        combinedTracks = combinedTracks.concat(items);
      } catch (err) {
        console.error('Errore durante la lettura di ' + key, err);
      }
    });

    // Rimuovi duplicati basati sull'ID del video
    const uniqueTracks = combinedTracks.filter((v, i, a) => 
      a.findIndex(t => (t.id || t.videoId) === (v.id || v.videoId)) === i
    );

    if (uniqueTracks.length === 0) {
      alert('⚠️ Le playlist selezionate per questo mix non contengono brani.');
      return;
    }

    // Algoritmo Fisher-Yates per lo Shuffle Casuale dei brani
    for (let i = uniqueTracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [uniqueTracks[i], uniqueTracks[j]] = [uniqueTracks[j], uniqueTracks[i]];
    }

    // Carica la coda e avvia la riproduzione
    if (typeof playlist !== 'undefined') {
      playlist = uniqueTracks;
      if (typeof savePlaylistToTemp === 'function') savePlaylistToTemp();
      if (typeof renderPlaylist === 'function') renderPlaylist();
      if (typeof loadYouTubeWindow === 'function') loadYouTubeWindow(0);
    }
  }
});
}