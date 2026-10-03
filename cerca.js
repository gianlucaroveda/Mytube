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

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${typeof MAX_RESULTS !== 'undefined' ? MAX_RESULTS : 50}&q=${encodeURIComponent(query)}&key=${API_KEY}`;
    
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Errore chiamata YouTube API');
      const data = await res.json();
      renderResults(data.items || []);
    } catch (err) {
      alert(err.message);
    }
  }

  // RENDERING RISULTATI VIDEO (un solo innerHTML + listener delegato)
  let currentResults = [];

  function renderResults(items) {
    if (!resultsList) return;
    currentResults = items.map(it => ({
      id: it.id.videoId,
      title: it.snippet.title,
      thumb: it.snippet.thumbnails.default.url,
      channel: it.snippet.channelTitle
    }));

    resultsList.innerHTML = currentResults.map((v, i) =>
      `<li class="item" data-i="${i}">` +
      `<img src="${escapeHtml(v.thumb)}" alt="" width="100" height="70" loading="lazy" decoding="async">` +
      `<div class="text"><div class="scrolling-title">${escapeHtml(v.title)}</div>` +
      `<div class="channel">${escapeHtml(v.channel)}</div></div>` +
      `<div class="btns"><button class="item-menu-btn secondary">⋮</button></div></li>`
    ).join('');
  }

  if (resultsList) {
    resultsList.addEventListener('click', (e) => {
      const imp = e.target.closest('button[data-pid]');
      if (imp) { importPlaylistById(imp.dataset.pid); return; }

      const menuBtn = e.target.closest('.item-menu-btn');
      if (!menuBtn) return;
      e.stopPropagation();
      const v = currentResults[+menuBtn.closest('li').dataset.i];
      if (!v) return;
      const track = { id: v.id, title: v.title, thumb: v.thumb };
      showItemMenu(menuBtn, [
        { label: '➕ Aggiungi alla coda', fn: () => { playlist.push(track); savePlaylistToTemp(); renderPlaylist(); } },
        { label: '📁 Aggiungi a playlist', fn: () => openSelectPlaylistModal(track) }
      ]);
    });
  }

  // 2. Cerca Playlist YouTube
  async function searchYouTubePlaylists(query) {
    if (!query.trim()) return;
    if (typeof API_KEY === 'undefined' || !API_KEY) {
      alert('Inserisci la tua API key valida.');
      return;
    }

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=playlist&maxResults=${typeof MAX_RESULTS !== 'undefined' ? MAX_RESULTS : 50 }&q=${encodeURIComponent(query)}&key=${API_KEY}`;
    
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
    resultsList.innerHTML = items.map(it =>
      `<li class="item">` +
      `<img src="${escapeHtml(it.snippet.thumbnails.default.url)}" alt="" width="100" height="70" loading="lazy" decoding="async">` +
      `<div class="text"><div class="scrolling-title">${escapeHtml(it.snippet.title)}</div>` +
      `<div class="channel">${escapeHtml(it.snippet.channelTitle)}</div></div>` +
      `<div><button data-pid="${escapeHtml(it.id.playlistId)}">Importa</button></div></li>`
    ).join('');
  }

  // --- ESTRAZIONE ID E IMPORTAZIONE PLAYLIST ---

  // Estrattore Universale di ID Playlist (Accetta URL completi, URL brevi e ID grezzi)
  function extractPlaylistId(input) {
    if (!input) return null;
    let str = input.trim();

    // Se è un URL o contiene parametri di query
    if (str.includes('list=')) {
      const match = str.match(/[?&]list=([^&]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Se l'utente inserisce direttamente l'ID (es. PL..., OLAK5uy_...)
    // Rimuove eventuali caratteri o spazi spuri
    const cleanIdMatch = str.match(/([a-zA-Z0-9_-]{12,})/);
    return cleanIdMatch ? cleanIdMatch[1] : null;
  }

  // Importa Video da una Playlist trovata
  async function importPlaylistById(input) {
    if (typeof API_KEY === 'undefined' || !API_KEY) {
      alert('Inserisci la tua API key valida.');
      return;
    }
    
    const playlistId = extractPlaylistId(input);
    if (!playlistId) {
      alert('❌ Link o ID playlist non valido.');
      return;
    }

    let pageToken = '';
    const imported = [];
    try {
      do {
        const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&pageToken=${pageToken}&key=${API_KEY}`;

        const res = await fetch(url);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error?.message || 'Impossibile trovare la playlist.');
        }

        const data = await res.json();

        if (data.items) {
          for (const it of data.items) {
            const vid = it.snippet?.resourceId?.videoId;
            const title = it.snippet?.title;

            // Salta video privati, eliminati o senza ID
            if (vid && title && title !== 'Private video' && title !== 'Deleted video') {
              imported.push({
                id: vid,
                title: title,
                thumb: it.snippet.thumbnails?.medium?.url || it.snippet.thumbnails?.default?.url || ''
              });
            }
          }
        }

        pageToken = data.nextPageToken || '';
      } while (pageToken);

      if (imported.length > 0) {
        playlist = imported;   // sostituisce la coda solo se l'import è riuscito
        if (addUrlInput) addUrlInput.value = '';
        if (typeof savePlaylistToTemp === 'function') savePlaylistToTemp();
        if (typeof renderPlaylist === 'function') renderPlaylist();
        alert(`✅ Importati ${imported.length} brani nella coda!`);
      } else {
        alert('⚠️ Nessun video trovato o la playlist è vuota.');
      }

    } catch (err) {
      alert(`Errore: ${err.message}`);
    }
  }

  // --- EVENT LISTENERS PER AGGIUNTA TRAMITE URL/ID E RICERCA ---

  // Aggiunta da URL/ID: link con ?list= -> importa playlist, altrimenti video singolo in coda
  async function addByInput(raw) {
    const input = (raw || '').trim();
    if (!input) {
      alert('Inserisci un URL o un ID valido.');
      return;
    }

    if (/[?&]list=/.test(input)) {
      importPlaylistById(input);
      return;
    }

    const vid = extractVideoId(input);
    if (!vid) {
      importPlaylistById(input); // forse è un ID playlist: ci pensa la validazione
      return;
    }

    const track = { id: vid, title: vid, thumb: '' };
    if (API_KEY) {
      try {
        const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${vid}&key=${API_KEY}`);
        const data = await res.json();
        const sn = data.items && data.items[0] && data.items[0].snippet;
        if (sn) {
          track.title = sn.title;
          track.thumb = sn.thumbnails?.default?.url || '';
        }
      } catch (e) { /* resta con l'ID come titolo */ }
    }

    playlist.push(track);
    savePlaylistToTemp();
    renderPlaylist();
    addUrlInput.value = '';
  }

  if (addBtn && addUrlInput) {
    addBtn.addEventListener('click', () => addByInput(addUrlInput.value));
    addUrlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addByInput(addUrlInput.value);
    });
  }

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