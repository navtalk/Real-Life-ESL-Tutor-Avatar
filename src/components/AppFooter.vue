<template>
  <footer class="app-footer">
    <span>Copyright 2025 NavTalk. Built for immersive language learning.</span>
    <div class="footer-links">
      <a href="https://www.youtube.com/@navtalk" target="_blank" rel="noreferrer">YouTube</a>
      <a href="https://discord.gg/navtalk" target="_blank" rel="noreferrer">Discord</a>
      <a href="https://x.com/navtalkai" target="_blank" rel="noreferrer">X</a>
      <a href="https://www.linkedin.com/company/navtalk-ai" target="_blank" rel="noreferrer">LinkedIn</a>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  color: #6b7280;
  font-size: 0.95rem;
  margin-top: 32px;
}

.footer-links {
  display: inline-flex;
  gap: 18px;
  flex-wrap: wrap;
}

.footer-links a {
  color: #1d1e2c;
  text-decoration: none;
  font-weight: 600;
}

.footer-links a:hover {
  text-decoration: underline;
}
</style>
