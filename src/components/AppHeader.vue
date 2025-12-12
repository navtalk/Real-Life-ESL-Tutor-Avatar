<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <header class="corner-header">
    <RouterLink class="corner-brand" to="/">
      <img src="/icons/navtalk.png" alt="NavTalk logo" />
      <span>NavTalk</span>
    </RouterLink>

    <a
      class="corner-github"
      href="https://github.com/navtalk/Real-Life-ESL-Tutor-Avatar"
      target="_blank"
      rel="noreferrer"
    >
      GitHub
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M4 12 12 4m0 0H6m6 0v6"
          stroke="white"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </a>
  </header>
</template>

<style scoped>
.corner-header {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.corner-brand,
.corner-github {
  pointer-events: auto;
}

.corner-brand {
  position: fixed;
  top: clamp(12px, 3vw, 32px);
  left: clamp(12px, 3vw, 48px);
  display: inline-flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  font-size: 1.2rem;
  font-weight: 700;
  color: #1d1e2c;
  padding: 10px 18px;
}

.corner-brand img {
  width: 42px;
  height: 42px;
}

.corner-github {
  position: fixed;
  top: clamp(12px, 3vw, 32px);
  right: clamp(12px, 3vw, 48px);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 999px;
  border: none;
  background: #12131d;
  color: #fff;
  font-weight: 600;
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 14px 30px rgba(18, 19, 29, 0.25);
}

.corner-github:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 38px rgba(18, 19, 29, 0.25);
}

@media (max-width: 640px) {
  .corner-brand,
  .corner-github {
    position: fixed;
    top: 12px;
    padding: 8px 16px;
  }

  .corner-brand {
    left: 12px;
  }

  .corner-github {
    right: 12px;
  }
}
</style>
