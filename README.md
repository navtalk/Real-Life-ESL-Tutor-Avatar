# NavTalk Education Studio

Immersive language-learning playground inspired by the NavTalk Hotel Front Desk reference.
Learners pick a goal, select an avatar tutor, and start a realtime NavTalk session with live video,
speech-to-text transcripts, and manual prompts for fine-grained control.

## Getting Started

```bash
cd navtalk-education
npm install
cp .env.example .env.local   # fill in your NavTalk credentials
npm run dev
```

The dev server runs on <http://localhost:5173>.

### Required environment variables

| Key | Description |
| --- | --- |
| `VITE_NAVTALK_LICENSE` | NavTalk realtime license key. |
| `VITE_NAVTALK_MODEL` | Defaults to `gpt-realtime`. |
| `VITE_NAVTALK_CHARACTER` | Character name provided by NavTalk (e.g. `navtalk.Brain`). |
| `VITE_NAVTALK_VOICE` | Voice preset (e.g. `cedar`). |
| `VITE_NAVTALK_BASE_URL` | NavTalk transfer origin, defaults to `transfer.navtalk.ai`. |
| `VITE_NAVTALK_PROMPT` | Optional fallback prompt. The UI sends a goal/avatar prompt automatically. |

> The browser will request microphone and camera (video playback) permissions the first time you start a NavTalk session.

## Project Structure

- `src/views` – Goal selection, avatar selection, and live session screens.
- `src/components` – Presentational building blocks (cards, layout elements).
- `src/composables/useNavTalkRealtime.ts` – Encapsulates the realtime websocket + WebRTC workflow from the NavTalk reference project, with a few education-specific tweaks.
- `src/data` – Static seed data for learning goals and avatar personas. Swap with API calls as needed.

## Customization Ideas

1. Replace the static data modules with backend APIs or CMS data.
2. Add assessment widgets (fluency scoring, vocabulary cards) to the transcript panel.
3. Record session analytics or export transcripts for review.

## Building for Production

```bash
npm run build    # type-checks with vue-tsc then builds via Vite
npm run preview  # preview the production build locally
```
