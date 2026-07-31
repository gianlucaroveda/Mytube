// Incapsuliamo in un blocco per evitare Scope Pollution / Variabili già dichiarate
{
  // --- ELEMENTI DOM DEL MODALE E DELLA RICERCA ---
  const searchOverlay = document.getElementById('search-overlay');
  const btnSearchFooter = document.getElementById('footer-search-btn');
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const searchPlaylistBtn = document.getElementById('searchPlaylistBtn');
  const resultsList = document.getElementById('resultsList');
  const toggleLinkBtn = document.getElementById('toggleLinkBtn');
  const linkSearch = document.getElementById('linkSearch');
  const addUrlInput = document.getElementById('addUrl');
  const addBtn = document.getElementById('addBtn');

  // --- GESTIONE APERTURA / CHIUSURA MODALE ---
  function openSearchModal() {
    if (!searchOverlay) return;
    searchOverlay.classList.add('open');
    setTimeout(() => {
      if (searchInput) searchInput.focus();
    }, 300);
  }

  function closeSearchModal() {
    if (!searchOverlay) return;
    searchOverlay.classList.remove('open');
  }

  if (btnSearchFooter) {
    btnSearchFooter.addEventListener('click', openSearchModal);
  }

  if (searchOverlay) {
    searchOverlay.addEventListener('click', function (e) {
      if (e.target === searchOverlay) {
        closeSearchModal();
      }
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && searchOverlay && searchOverlay.classList.contains('open')) {
      closeSearchModal();
    }
  });

  // Toggle sezione "..." (Aggiungi tramite URL/ID)
  if (toggleLinkBtn && linkSearch) {
    toggleLinkBtn.addEventListener('click', () => {
      linkSearch.classList.toggle('hidden-link');
      linkSearch.classList.toggle('show');
    });
  }

  // --- FUNZIONALITÀ DI RICERCA YOUTUBE ---

  // 1. Cerca Video
  async function searchYouTube(query) {
    if (!query.trim()) return;
    if (typeof API_KEY === 'undefined' || !API_KEY) {
      alert('Inserisci la tua API key valida.');
      return;
    }

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${MAX_RESULTS}&q=${encodeURIComponent(query)}&key=${API_KEY}`;
    
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Errore chiamata YouTube API');
      const data = await res.json();
      renderResults(data.items || []);
    } catch (err) {
      alert(err.message);
    }
  }

  // RENDERING RISULTATI VIDEO (Con Menu a 3 Pallini)
  function renderResults(items) {
    if (!resultsList) return;
    resultsList.innerHTML = '';

    for (const it of items) {
      const li = document.createElement('li');
      li.className = 'item';
      const vid = it.id.videoId;
      const title = it.snippet.title;
      const thumb = it.snippet.thumbnails.default.url;

      const videoObj = { id: vid, title: title, thumb: thumb };

      li.innerHTML = `
        <img src="${thumb}" alt="thumb" />
        <div class="text">
          <div class="scrolling-title">${typeof escapeHtml === 'function' ? escapeHtml(title) : title}</div>
          <div class="channel">${typeof escapeHtml === 'function' ? escapeHtml(it.snippet.channelTitle) : it.snippet.channelTitle}</div>
        </div>
        <div class="btns">
          <button class="item-menu-btn secondary">⋮</button>
        </div>
        <!-- Mini Popover Menu nei Risultati -->
        <div class="item-popover hidden">
          <button class="popover-opt opt-add-queue">➕ Aggiungi alla coda</button>
          <button class="popover-opt opt-add-playlist">📁 Aggiungi a playlist</button>
        </div>
      `;

      const menuBtn = li.querySelector('.item-menu-btn');
      const popover = li.querySelector('.item-popover');
      const btnAddQueue = li.querySelector('.opt-add-queue');
      const btnAddPlaylist = li.querySelector('.opt-add-playlist');

      // Apertura / Chiusura Popover
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Chiude eventuali altri popover aperti nei risultati o nella coda
        document.querySelectorAll('.item-popover').forEach(p => {
          if (p !== popover) p.classList.add('hidden');
        });
        popover.classList.toggle('hidden');
      });

      // Opzione 1: Aggiungi alla coda corrente
      btnAddQueue.addEventListener('click', (e) => {
        e.stopPropagation();
        popover.classList.add('hidden');

        if (typeof playlist !== 'undefined') {
          playlist.push(videoObj);
          if (typeof savePlaylistToTemp === 'function') savePlaylistToTemp();
          if (typeof renderPlaylist === 'function') renderPlaylist();
        }
      });

      // Opzione 2: Aggiungi a una Playlist salvata (Apre la Selezione Grafica)
      btnAddPlaylist.addEventListener('click', (e) => {
        e.stopPropagation();
        popover.classList.add('hidden');

        if (typeof openSelectPlaylistModal === 'function') {
          openSelectPlaylistModal(videoObj);
        } else {
          alert("Errore: Funzione di selezione grafica playlist non trovata.");
        }
      });

      resultsList.appendChild(li);
    }
  }

  // 2. Cerca Playlist YouTube
  async function searchYouTubePlaylists(query) {
    if (!query.trim()) return;
    if (typeof API_KEY === 'undefined' || !API_KEY) {
      alert('Inserisci la tua API key valida.');
      return;
    }

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=playlist&maxResults=${MAX_RESULTS}&q=${encodeURIComponent(query)}&key=${API_KEY}`;
    
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Errore chiamata YouTube API');
      const data = await res.json();
      renderPlaylistResults(data.items || []);
    } catch (err) {
      alert(err.message);
    }
  }

  function renderPlaylistResults(items) {
    if (!resultsList) return;
    resultsList.innerHTML = '';

    for (const it of items) {
      const li = document.createElement('li');
      li.className = 'item';
      const playlistId = it.id.playlistId;

      li.innerHTML = `
        <img src="${it.snippet.thumbnails.default.url}" alt="thumb" />
        <div class="text">
          <div class="scrolling-title">${typeof escapeHtml === 'function' ? escapeHtml(it.snippet.title) : it.snippet.title}</div>
          <div class="channel">${typeof escapeHtml === 'function' ? escapeHtml(it.snippet.channelTitle) : it.snippet.channelTitle}</div>
        </div>
        <div>
          <button data-pid="${playlistId}">Importa</button>
        </div>
      `;

      li.querySelector('button').addEventListener('click', () => {
        importPlaylistById(playlistId);
      });

      resultsList.appendChild(li);
    }
  }

  // 3. Importa Video da una Playlist trovata
  async function importPlaylistById(playlistId) {
    if (typeof API_KEY === 'undefined' || !API_KEY) {
      alert('Inserisci la tua API key valida.');
      return;
    }

    const maxRes = typeof MAX_RESULTS_PLAYLIST !== 'undefined' ? MAX_RESULTS_PLAYLIST : 50;
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${maxRes}&playlistId=${playlistId}&key=${API_KEY}`;
    
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Errore nel caricamento della playlist.');
      const data = await res.json();

      if (typeof playlist !== 'undefined') {
        for (const it of data.items) {
          const vid = it.snippet.resourceId.videoId;
          playlist.push({
            id: vid,
            title: it.snippet.title,
            thumb: it.snippet.thumbnails?.default?.url || ''
          });
        }

        if (typeof savePlaylistToTemp === 'function') savePlaylistToTemp();
        if (typeof renderPlaylist === 'function') renderPlaylist();
        alert('✅ Playlist importata con successo nella coda!');
      }
    } catch (err) {
      alert(err.message);
    }
  }

  // --- EVENT LISTENERS PER I PULSANTI DI RICERCA ---

  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => {
      searchYouTube(searchInput.value);
    });
  }

  if (searchPlaylistBtn && searchInput) {
    searchPlaylistBtn.addEventListener('click', () => {
      searchYouTubePlaylists(searchInput.value);
    });
  }

  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        searchYouTube(searchInput.value);
      }
    });
  }
}