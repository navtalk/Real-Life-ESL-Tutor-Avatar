import { assetUrl } from '../utils/assetUrl'

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
    persona: '',
    description: 'Keeps sessions calm and clear, great for foundational learners.',
    expertise: [],
    photo: assetUrl('images/Lily.png'),
  },
  {
    id: 'owen',
    name: 'Owen',
    persona: '',
    description: 'Natural small talk and story-driven guidance for smooth chats.',
    expertise: [],
    photo: assetUrl('images/Owen.png'),
  },
  {
    id: 'nicole',
    name: 'Nicole',
    persona: '',
    description: 'Precise grammar corrections and exam-oriented drills.',
    expertise: [],
    photo: assetUrl('images/Nicole.png'),
  },
  {
    id: 'ben',
    name: 'Ben',
    persona: '',
    description: 'Helps you lead meetings with confidence and clarity.',
    expertise: [],
    photo: assetUrl('images/Ben.png'),
  },
]

export function findAvatar(avatarId?: string) {
  if (!avatarId) return undefined
  return tutorAvatars.find((avatar) => avatar.id === avatarId)
}
