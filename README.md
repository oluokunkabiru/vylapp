# Vylapp Public Website

React 18 + Vite + Tailwind CSS — public marketing site for Vylapp.

## Project structure

```
vylapp-website/
├── src/
│   ├── App.jsx        ← All 17 pages + Nav + Footer (single file)
│   ├── config.js      ← All brand constants sourced from .env
│   ├── index.css      ← Tailwind base + ticker + fadeUp animations
│   └── main.jsx       ← React entry point
├── .env               ← Colors, pricing, API endpoints, feature flags
├── tailwind.config.js ← Custom Vylapp color tokens
├── postcss.config.js
└── package.json
```

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs to dist/
```

## Connect backend

In `.env`, set:
```
VITE_API_BASE_URL=https://api.vylapp.com
```
The `API` object in `config.js` reads this and all forms route there automatically.

## Change brand colors / pricing / stats

Edit `.env` only — no component changes needed:
```
VITE_COLOR_VIOLET=#7C3AED
VITE_PRICE_PRO=9
VITE_STAT_MEMBERS=50K+
```

## Add a new page

1. Write a new page component in `App.jsx`
2. Add its route in the `Router` switch
3. Add its link in the `Nav` and `Foot` components

## Feature flags (enable/disable pages)

```
VITE_FEATURE_CAREERS=true   ← re-enable Careers
VITE_FEATURE_BLOG=false     ← hide Blog from nav
```

## Pages included

Home, About, Features, Communities, Pricing, For Creators, Spaces,
Blog, Press, Help, Terms, Privacy, Guidelines, Contact,
Manifesto, Changelog, Investors

## Tech stack

- React 18 + Vite
- Tailwind CSS v3
- Google Fonts: Sora, DM Sans, JetBrains Mono
- No external UI libraries
- All brand colors driven by .env via config.js
