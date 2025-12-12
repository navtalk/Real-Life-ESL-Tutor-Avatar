<template>
  <footer class="corner-footer">
    <span class="footer-copy">Copyright 2025 NavTalk. All rights reserved.</span>
    <div class="footer-links">
      <a href="https://www.youtube.com/@navtalk" target="_blank" rel="noreferrer">YouTube</a>
      <a href="https://discord.gg/navtalk" target="_blank" rel="noreferrer">Discord</a>
      <a href="https://x.com/navtalkai" target="_blank" rel="noreferrer">X</a>
      <a href="https://www.linkedin.com/company/navtalk-ai" target="_blank" rel="noreferrer">LinkedIn</a>
    </div>
  </footer>
</template>

<style scoped>
.corner-footer {
  position: fixed;
  left: clamp(12px, 3vw, 48px);
  right: clamp(12px, 3vw, 48px);
  bottom: clamp(12px, 3vw, 36px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  color: rgba(17, 20, 39, 0.7);
  font-size: 0.95rem;
  pointer-events: none;
}

.footer-copy,
.footer-links {
  pointer-events: auto;
}

.footer-links {
  display: inline-flex;
  gap: 18px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.footer-links a {
  color: #111327;
  text-decoration: none;
  font-weight: 600;
}

.footer-links a:hover {
  text-decoration: underline;
}

@media (max-width: 640px) {
  .corner-footer {
    left: 12px;
    right: 12px;
    bottom: 12px;
    flex-direction: column;
    align-items: flex-start;
  }

  .footer-links {
    justify-content: flex-start;
  }
}
</style>
