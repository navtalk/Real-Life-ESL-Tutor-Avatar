import { assetUrl } from '../utils/assetUrl'

export interface TutorAvatar {
  id: string
  name: string
  persona: string
  description: string
  expertise: string[]
  photo: string
  characterName: string
  voice: string
  category: 'beginner' | 'daily' | 'exam' | 'business'
}

export const tutorAvatars: TutorAvatar[] = [
  {
    id: 'lily',
    name: 'Lily',
    persona: '',
    description: 'Keeps sessions calm and clear, great for foundational learners.',
    expertise: [],
    photo: assetUrl('images/Lily.png'),
    characterName: 'navtalk.Lily',
    voice: 'marin',
    category: 'beginner',
  },
  {
    id: 'elaine',
    name: 'Elaine',
    persona: '',
    description: 'Keeps sessions calm and clear, great for foundational learners.',
    expertise: [],
    photo: assetUrl('images/Elaine.png'),
    characterName: 'navtalk.Elaine',
    voice: 'marin',
    category: 'beginner',
  },
  {
    id: 'owen',
    name: 'Owen',
    persona: '',
    description: 'Natural small talk and story-driven guidance for smooth chats.',
    expertise: [],
    photo: assetUrl('images/Owen.png'),
    characterName: 'navtalk.Owen',
    voice: 'cedar',
    category: 'daily',
  },
  {
    id: 'valentina',
    name: 'Valentina',
    persona: '',
    description: 'Natural small talk and story-driven guidance for smooth chats.',
    expertise: [],
    photo: assetUrl('images/Valentina.png'),
    characterName: 'navtalk.Valentina',
    voice: 'marin',
    category: 'daily',
  },
  {
    id: 'nicole',
    name: 'Nicole',
    persona: '',
    description: 'Precise grammar corrections and exam-oriented drills.',
    expertise: [],
    photo: assetUrl('images/Nicole.png'),
    characterName: 'navtalk.Nicole',
    voice: 'marin',
    category: 'exam',
  },
  {
    id: 'gabriela',
    name: 'Gabriela',
    persona: '',
    description: 'Precise grammar corrections and exam-oriented drills.',
    expertise: [],
    photo: assetUrl('images/Gabriela.png'),
    characterName: 'navtalk.Gabriela',
    voice: 'marin',
    category: 'exam',
  },
  {
    id: 'ella',
    name: 'Ella',
    persona: '',
    description: 'Precise grammar corrections and exam-oriented drills.',
    expertise: [],
    photo: assetUrl('images/Ella.png'),
    characterName: 'navtalk.Ella',
    voice: 'marin',
    category: 'exam',
  },
  {
    id: 'ben',
    name: 'Ben',
    persona: '',
    description: 'Helps you lead meetings with confidence and clarity.',
    expertise: [],
    photo: assetUrl('images/Ben.png'),
    characterName: 'navtalk.Ben',
    voice: 'cedar',
    category: 'business',
  },
  {
    id: 'lisa',
    name: 'Lisa',
    persona: '',
    description: 'Helps you lead meetings with confidence and clarity.',
    expertise: [],
    photo: assetUrl('images/Lisa.png'),
    characterName: 'navtalk.Lisa',
    voice: 'marin',
    category: 'business',
  },
]

export function findAvatar(avatarId?: string) {
  if (!avatarId) return undefined
  return tutorAvatars.find((avatar) => avatar.id === avatarId)
}
