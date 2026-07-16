# Vylapp Frontend

React 18 + Vite 5. Proxies /api → localhost:4000 in development.

```bash
npm install
npm run dev        # port 5173
npm run build      # production build → dist/
```

⚠ Security: JWT tokens are currently stored in localStorage.
Migration to httpOnly cookies is a tracked pending item.

See root README.md for full architecture documentation.
