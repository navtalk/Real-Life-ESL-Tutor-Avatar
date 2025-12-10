<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { findGoal } from '../data/goals'
import { tutorAvatars, type TutorAvatar } from '../data/avatars'
import AvatarCard from '../components/AvatarCard.vue'

const props = defineProps<{
  goalId: string
}>()

const router = useRouter()

const goal = computed(() => findGoal(props.goalId))

watchEffect(() => {
  if (!goal.value) {
    router.replace('/')
  }
})

function handleSelect(avatar: TutorAvatar) {
  router.push({ name: 'session', params: { goalId: props.goalId, avatarId: avatar.id } })
}

function goBack() {
  router.push({ name: 'home' })
}
</script>

<template>
  <section v-if="goal" class="app-panel">
    <div class="breadcrumbs">
      <button class="link-like" @click="goBack">Back to Goals</button>
      <span> / </span>
      <strong>Meet your avatar</strong>
    </div>
    <h2 class="page-title">Meet Your Avatar</h2>
    <p class="page-subtitle">
      You chose: <strong>{{ goal.title }}</strong>. Select the tutor who matches your learning vibe and
      speaking tempo.
    </p>

    <div class="avatar-grid">
      <AvatarCard
        v-for="avatar in tutorAvatars"
        :key="avatar.id"
        :avatar="avatar"
        @select="handleSelect"
      />
    </div>
  </section>
</template>

<style scoped>
.avatar-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 32px;
}

</style>
