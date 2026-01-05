<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { assetUrl } from '../utils/assetUrl'

const brandLogo = assetUrl('icons/navtalk-logo.svg')
</script>

<template>
  <header class="corner-header">
    <RouterLink class="corner-brand" to="/">
      <img :src="brandLogo" alt="NavTalk logo" />
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
  top: 0;
  right: 0;
  left: 0;
  padding: clamp(12px, 3vw, 32px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  pointer-events: none;
}

.corner-brand,
.corner-github {
  pointer-events: auto;
}

.corner-brand {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  font-weight: 700;
}

.corner-brand img {
  width: 126px;
  height: 26px;
}

.corner-github {
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
  .corner-header {
    padding: 12px;
  }

  .corner-github {
    padding: 8px 16px;
  }
}
</style>
