<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <header class="app-header">
    <RouterLink class="brand-link" to="/">
      <img src="/navtalk-mark.svg" alt="NavTalk logo" />
      <div class="brand-copy">
        <span class="brand-name">NavTalk</span>
        <span class="brand-tagline">Learning Studio</span>
      </div>
    </RouterLink>

    <div class="header-actions">
      <a class="ghost-button" href="https://navtalk.ai" target="_blank" rel="noreferrer">
        Visit navtalk.ai
      </a>
      <a
        class="ghost-button"
        href="https://github.com/navtalk/Hotel-Front-Desk-Receptionist"
        target="_blank"
        rel="noreferrer"
      >
        Reference repo ->
      </a>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 24px;
}

.brand-link {
  display: flex;
  align-items: center;
  text-decoration: none;
  gap: 14px;
}

.brand-link img {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  box-shadow: 0 10px 25px rgba(67, 56, 202, 0.35);
}

.brand-copy {
  display: flex;
  flex-direction: column;
}

.brand-name {
  color: #1d1e2c;
  font-size: 1.2rem;
  font-weight: 700;
}

.brand-tagline {
  color: #6b7280;
  font-size: 0.95rem;
}

.header-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.ghost-button {
  border-radius: 999px;
  border: 1px solid rgba(29, 30, 44, 0.2);
  background: rgba(255, 255, 255, 0.6);
  padding: 10px 20px;
  text-decoration: none;
  color: #1d1e2c;
  font-weight: 600;
  transition: border 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.ghost-button:hover {
  border-color: rgba(29, 30, 44, 0.35);
  box-shadow: 0 10px 30px rgba(17, 20, 39, 0.12);
  transform: translateY(-2px);
}

@media (max-width: 640px) {
  .app-header {
    flex-direction: column;
    gap: 16px;
  }

  .header-actions {
    width: 100%;
    justify-content: center;
  }
}
</style>
