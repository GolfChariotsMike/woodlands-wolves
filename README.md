# Woodlands Wolves Ball Club — Have a Go Day

Registration site for **Woodlands Wolves Ball Club** Have a Go Day. Parents submit a child's name, age, parent name, phone, and email. Entries are stored in Supabase. Club staff can review and export them from `/admin`.

## Setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key used by the register and admin APIs |

DraftPilot Supabase project: `https://kouembkldbpdbhzeaoth.supabase.co`

Registrations are inserted into `woodlands_wolves_have_a_go_registrations` (`child_full_name`, `age`, `parent_name`, `phone`, `email`, `created_at`). The service role key bypasses row level security, so it must only be used in server routes. Do not commit `.env.local` or any real key.

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the registration form.

```bash
npm run build
npm start
```

## Admin

`/admin` is a client-side PIN gate (PIN `1972`). After unlock it lists registrations and can export CSV of the five form fields plus `created_at`. The admin API reads with the service role key only.

## Deploy on Vercel

Import this GitHub repository in Vercel. In **Project Settings → Environment Variables**, set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

`SUPABASE_SERVICE_ROLE_KEY` is read only by `/api/register` and `/api/admin/registrations`. Leave it unprefixed so it is not exposed to the browser. Redeploy after saving the variables.
