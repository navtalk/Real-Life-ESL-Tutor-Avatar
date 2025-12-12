<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import AppFooter from './components/AppFooter.vue'
</script>

<template>
  <div class="app-shell">
    <AppHeader />
    <div class="frame-box">
      <main class="app-main">
        <RouterView />
      </main>
    </div>
    <AppFooter />
  </div>
</template>
