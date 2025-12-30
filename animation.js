document.addEventListener("DOMContentLoaded", () => {
  const toggleSearchAreaBtn = document.getElementById("toggleSearchBtn");
  const searchArea = document.getElementById("searchArea");

  if (toggleSearchAreaBtn && searchArea) {
    toggleSearchAreaBtn.addEventListener("click", () => {
      searchArea.classList.toggle("show");
    });
  }
});
document.getElementById("toggleLinkBtn").addEventListener("click", () => {
  const linkBox = document.getElementById("linkSearch");
  linkBox.classList.toggle("show");
});

document.addEventListener('DOMContentLoaded', () => {
  const gotoHighlightsBtn = document.getElementById('gotoHighlightsBtn');
  if (gotoHighlightsBtn) {
    gotoHighlightsBtn.addEventListener('click', () => {
      window.location.href = "highlights.html";
    });
  }
});
document.addEventListener('DOMContentLoaded', () => {
  const goFullscreen = document.getElementById('goFullscreen');
  if (!goFullscreen) return;

  const el = document.documentElement;

  // === Funzione per entrare in fullscreen ===
  function enterFS() {
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
  }

  // === Funzione per uscire dal fullscreen ===
  function exitFS() {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
  }

  // === Ripristina fullscreen al primo tap ===
  function tryRestoreFullscreen() {
    const wanted = localStorage.getItem("wantFullscreen") === "true";
    if (!wanted) return;

    if (!document.fullscreenElement &&
        !document.webkitFullscreenElement &&
        !document.msFullscreenElement) {
      enterFS();
    }
  }

  // === Listener click del tuo bottone ===
  goFullscreen.addEventListener('click', () => {
    const isFullscreen =
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.msFullscreenElement;

    if (isFullscreen) {
      // L’utente vuole uscire → aggiorna preferenza
      localStorage.setItem("wantFullscreen", "false");
      exitFS();
    } else {
      // L’utente vuole entrare → salva preferenza
      localStorage.setItem("wantFullscreen", "true");
      enterFS();
    }
  });

  // === Quando esci dal fullscreen, prepara il prossimo tap ===
  document.addEventListener("fullscreenchange", () => {
    const isFS = !!document.fullscreenElement;

    if (!isFS) {
      // fullscreen perso → al prossimo tap prova a rientrare
      document.addEventListener("click", tryRestoreFullscreen, { once: true });
    }
  });

  // === Se all’avvio era settato fullscreen → al primo tap rientra ===
  if (localStorage.getItem("wantFullscreen") === "true") {
    document.addEventListener("click", tryRestoreFullscreen, { once: true });
  }
});

