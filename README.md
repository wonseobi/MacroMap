# MacroMap

A minimalist diet-tracking web app. Enter your stats and goal, get daily calorie
and protein targets, and log foods against them.

## Features

- **Profile setup** — name, age, sex, height, weight, weekly training frequency,
  and goal (lose fat / maintain / build muscle), with live BMI preview.
- **Daily targets** — BMR via Mifflin-St Jeor, TDEE from training frequency,
  goal-adjusted calorie target, and a protein target scaled to bodyweight.
  Shown as animated progress rings plus BMI / BMR / TDEE stats.
- **Food logging** — search foods and log portions in grams. Backed by the
  [Edamam Food Database API](https://developer.edamam.com/) when credentials
  are configured; falls back to built-in sample foods otherwise.
- Profile and food log persist in `localStorage` (user accounts and
  cross-platform sync planned later).

## Tech stack

- [Vite](https://vite.dev/) + React 19 + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/)
- [React Router](https://reactrouter.com/)
- [React Bits](https://reactbits.dev/) components (`CountUp`, `BlurText`)
  installed via the shadcn registry
- [lucide-react](https://lucide.dev/) icons

## Getting started

```bash
npm install
npm run dev
```

### Environment variables

Copy `.env.example` to `.env.local` (gitignored) and fill in:

| Variable | Purpose |
|---|---|
| `VITE_EDAMAM_APP_ID` / `VITE_EDAMAM_APP_KEY` | Live food search via Edamam |
| `REACTBITS_LICENSE_KEY` | Installing React Bits Pro components/blocks |

Without Edamam keys the app uses a small built-in food dataset so development
still works end to end.

### Adding React Bits components

Free registry:

```bash
npx shadcn@latest add "https://reactbits.dev/r/<Component>-TS-TW"
```

Pro registries are already configured in `components.json` — add your license
key to `.env.local`, then:

```bash
npx shadcn@latest add @reactbits-starter/<slug>-tw   # animated components
npx shadcn@latest add @reactbits-pro/<slug>          # page-section blocks
```

## Roadmap

- [ ] User accounts and saved progress
- [ ] Mobile app with shared data (cross-platform sync)
- [ ] Daily history and progress charts
- [ ] More macros (carbs, fat) and micronutrients
