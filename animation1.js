document.addEventListener('DOMContentLoaded', () => {
  const gotoYTBtn = document.getElementById('gotoYTBtn');

  if (gotoYTBtn) {
    gotoYTBtn.addEventListener('click', () => {
    
      window.location.href = "index.html";
    });
  } 
});