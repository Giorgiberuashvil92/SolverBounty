# PokerAICoach API (NestJS + MongoDB)

## Setup

```bash
cp .env.example .env
# set MONGODB_URI + JWT_SECRET
npm run start:dev
```

API: `http://localhost:3000/api`

## Auth

- `POST /api/auth/register` — email/password
- `POST /api/auth/login`
- `POST /api/auth/social` — apple | google | guest
- `POST /api/auth/onboarding` — player profile quiz after first login
- `GET /api/auth/me` — Bearer token

All dashboard/reviews routes require `Authorization: Bearer <token>`.

## Consents (important)

- `analytics` — product events (default on)
- `partnerInsights` — **opt-in** anonymized aggregates only (stakes mix, event counts). Never raw hands/email for sale without legal consent framework.

## Key routes

- `GET /api/dashboard`
- `GET /api/reviews`
- `POST /api/sessions/:sessionId/key-hands/:handId/analyze`
- `POST /api/sessions/:sessionId/key-hands/:handId/reviewed`
- `GET /api/analytics/partner-insights`
- `GET|POST /api/coach/thread|chat` · `POST /api/coach/parse-hand`
- `GET|PUT /api/study/ranges/:position`
- `GET|PATCH /api/share/settings` · `POST /api/share/send`

Optional: `OPENAI_API_KEY` for real coach/parse (heuristic fallback otherwise).
