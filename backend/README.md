# Vylapp Backend

Node.js 20 + Express 4 + PostgreSQL 16 API server.

```bash
cp ../.env.example .env    # fill in secrets
npm install
node src/db/migrate.js     # run all 4 migrations in order
npm run dev                # port 4000
```

See root README.md for full architecture documentation.
