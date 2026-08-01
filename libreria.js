{
  // --- ELEMENTI DOM DEL MODALE LIBRERIA ---
  const libraryOverlay = document.getElementById('library-overlay');
  const btnLibraryFooter = document.getElementById('footer-library-btn');

  // --- ELEMENTI DOM DEL MODALE MODIFICA ---
  const editOverlay = document.getElementById('edit-overlay');
  const editResultsList = document.getElementById('editResultsList');
  const editPlaylistNameInput = document.getElementById('editPlaylistName');
  const editSaveNameBtn = document.getElementById('editSaveNameBtn');

  let currentEditingKey = null; // storageKey della playlist attualmente in modifica

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

  // --- APERTURA E CHIUSURA LIBRERIA ---
  function openLibraryModal() {
    if (!libraryOverlay) return;
    renderLibraryPlaylists();
    libraryOverlay.classList.add('open');
  }

  function closeLibraryModal() {
    if (!libraryOverlay) return;
    libraryOverlay.classList.remove('open');
  }

  // ==================================================
  // --- MODALE MODIFICA PLAYLIST ---
  // ==================================================

  function openEditPlaylistModal(storageKey) {
    if (!editOverlay) return;
    currentEditingKey = storageKey;

    const displayName = storageKey.replace(/^xx_/, '');
    if (editPlaylistNameInput) editPlaylistNameInput.value = displayName;

    renderEditPlaylistItems();
    editOverlay.classList.add('open');
  }

  function closeEditPlaylistModal() {
    if (!editOverlay) return;
    editOverlay.classList.remove('open');
    currentEditingKey = null;
  }

  function renderEditPlaylistItems() {
    if (!editResultsList || !currentEditingKey) return;
    editResultsList.innerHTML = '';

    const items = JSON.parse(localStorage.getItem(currentEditingKey) || '[]');

    if (items.length === 0) {
      editResultsList.innerHTML = `<li class="empty-message">Nessun elemento in questa playlist.</li>`;
      return;
    }

    items.forEach((item, index) => {
      const videoId = item.id || item.videoId;
      const title = item.title || videoId || 'Senza titolo';
      const thumbnailUrl = videoId ? `https://i.ytimg.com/vi/${videoId}/default.jpg` : '';

      const li = document.createElement('li');
      li.className = 'result-item';
      li.innerHTML = `
        ${thumbnailUrl ? `<img src="${thumbnailUrl}" class="result-thumb" />` : ''}
        <span class="result-title">${safeText(title)}</span>
        <div class="result-actions">
          <button class="editMoveUpBtn" title="Sposta su">▲</button>
          <button class="editMoveDownBtn" title="Sposta giù">▼</button>
          <button class="editRemoveBtn" title="Rimuovi">✖</button>
        </div>
      `;

      li.querySelector('.editMoveUpBtn').addEventListener('click', () => moveItemInPlaylist(index, -1));
      li.querySelector('.editMoveDownBtn').addEventListener('click', () => moveItemInPlaylist(index, 1));
      li.querySelector('.editRemoveBtn').addEventListener('click', () => removeItemFromPlaylist(index));

      editResultsList.appendChild(li);
    });
  }

  function removeItemFromPlaylist(index) {
    if (!currentEditingKey) return;
    const items = JSON.parse(localStorage.getItem(currentEditingKey) || '[]');
    items.splice(index, 1);
    localStorage.setItem(currentEditingKey, JSON.stringify(items));
    renderEditPlaylistItems();
  }

  function moveItemInPlaylist(index, direction) {
    if (!currentEditingKey) return;
    const items = JSON.parse(localStorage.getItem(currentEditingKey) || '[]');
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;

    [items[index], items[newIndex]] = [items[newIndex], items[index]];
    localStorage.setItem(currentEditingKey, JSON.stringify(items));
    renderEditPlaylistItems();
  }

  function renamePlaylist() {
    if (!currentEditingKey || !editPlaylistNameInput) return;
    const newName = editPlaylistNameInput.value.trim();
    if (!newName) return;

    const newKey = `xx_${newName}`;
    if (newKey === currentEditingKey) return;

    if (localStorage.getItem(newKey)) {
      alert("⚠️ Esiste già una playlist con questo nome!");
      return;
    }

    const items = localStorage.getItem(currentEditingKey);
    localStorage.setItem(newKey, items);
    localStorage.removeItem(currentEditingKey);
    currentEditingKey = newKey;

    renderLibraryPlaylists();
  }

  if (editSaveNameBtn) {
    editSaveNameBtn.addEventListener('click', renamePlaylist);
  }

  if (editOverlay) {
    editOverlay.addEventListener('click', function (e) {
      if (e.target === editOverlay) closeEditPlaylistModal();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && editOverlay && editOverlay.classList.contains('open')) {
      closeEditPlaylistModal();
    }
  });

  // ==================================================
  // --- RENDERING DEI CUBOTTI (LIBRERIA) ---
  // ==================================================

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
          <div class="card-options-wrap">
            <button class="card-options-btn" title="Opzioni">⋮</button>
          </div>
        </div>
      `;

      const optionsWrap = card.querySelector('.card-options-wrap');
      const optionsBtn = card.querySelector('.card-options-btn');

      optionsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showOptionsMenu(optionsWrap, storageKey);
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

  // --- MENU A DUE OPZIONI (MODIFICA / ELIMINA) ---
  function showOptionsMenu(wrapEl, storageKey) {
    // Se il menu è già aperto per questa card, non ricrearlo
    if (wrapEl.querySelector('.card-options-btn').classList.contains('menu-open')) return;

    const originalBtn = wrapEl.querySelector('.card-options-btn');
    originalBtn.classList.add('menu-open');
    originalBtn.style.display = 'none';

    const editBtn = document.createElement('button');
    editBtn.className = 'card-options-btn option-edit';
    editBtn.textContent = '✏️';
    editBtn.title = 'Modifica';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'card-options-btn option-delete';
    deleteBtn.textContent = '🗑️';
    deleteBtn.title = 'Elimina';

    let deleteTimeoutId = null;

    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeOptionsMenu();
      openEditPlaylistModal(storageKey);
    });

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();

      if (!deleteBtn.classList.contains('confirming')) {
        // PRIMO CLICK: chiedi conferma
        deleteBtn.classList.add('confirming');
        deleteBtn.textContent = 'Elimina';

        deleteTimeoutId = setTimeout(() => {
          deleteBtn.classList.remove('confirming');
          deleteBtn.textContent = '🗑️';
        }, 3000);
      } else {
        // SECONDO CLICK: elimina davvero
        clearTimeout(deleteTimeoutId);
        localStorage.removeItem(storageKey);
        renderLibraryPlaylists();
      }
    });

    function closeOptionsMenu() {
      editBtn.remove();
      deleteBtn.remove();
      outsideCloser && document.removeEventListener('click', outsideCloser);
      originalBtn.style.display = '';
      originalBtn.classList.remove('menu-open');
    }

    const outsideCloser = (e) => {
      if (!wrapEl.contains(e.target)) closeOptionsMenu();
    };
    document.addEventListener('click', outsideCloser);

    wrapEl.appendChild(editBtn);
    wrapEl.appendChild(deleteBtn);
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