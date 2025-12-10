export interface TutorAvatar {
  id: string
  name: string
  persona: string
  description: string
  expertise: string[]
  photo: string
}

export const tutorAvatars: TutorAvatar[] = [
  {
    id: 'lily',
    name: 'Lily',
    persona: 'Warm & encouraging mentor',
    description: 'Keeps sessions calm and clear, great for foundational learners.',
    expertise: ['Pronunciation', 'Listening confidence'],
    photo:
      'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'owen',
    name: 'Owen',
    persona: 'Conversational coach',
    description: 'Natural small talk and story-driven guidance for smooth chats.',
    expertise: ['Story telling', 'Daily chat loops'],
    photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'nicole',
    name: 'Nicole',
    persona: 'Structured strategist',
    description: 'Precise grammar corrections and exam-oriented drills.',
    expertise: ['Exam prep', 'Writing feedback'],
    photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'ben',
    name: 'Ben',
    persona: 'Business storyteller',
    description: 'Helps you lead meetings with confidence and clarity.',
    expertise: ['Presentations', 'Negotiation'],
    photo:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80',
  },
]

export function findAvatar(avatarId?: string) {
  if (!avatarId) return undefined
  return tutorAvatars.find((avatar) => avatar.id === avatarId)
}
