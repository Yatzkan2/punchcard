# Punchcard

A lightweight pass-tracking app for studios. Clients look up their remaining passes with a 6-character code. Admins sign in to add clients, adjust passes, and remove records.

**Stack:** React + Vite · Supabase (database + auth) · Tailwind CSS · Vercel

---

## Deploy to production

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Click **New project**, give it a name, choose a region, and set a database password.
3. Wait for the project to finish provisioning (~1 min).

### 2. Run the database setup

1. In the Supabase sidebar, go to **SQL Editor**.
2. Click **New query**, paste the entire contents of [`SUPABASE_SETUP.sql`](./SUPABASE_SETUP.sql), and click **Run**.
3. You should see a success message. The `clients` table is now created with Row Level Security enabled.

### 3. Create an admin user

1. In the Supabase sidebar, go to **Authentication → Users**.
2. Click **Add user → Create new user**.
3. Enter an email and password — these are the credentials used to sign in at `/admin`.

### 4. Copy your project credentials

1. In the Supabase sidebar, go to **Project Settings → API**.
2. Copy the **Project URL** — this is your `VITE_SUPABASE_URL`.
3. Copy the **anon / public** key — this is your `VITE_SUPABASE_ANON_KEY`.

### 5. Push to GitHub

```bash
git add .
git commit -m "initial commit"
git remote add origin https://github.com/your-username/punchcard.git
git push -u origin main
```

### 6. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and create a free account.
2. Click **Add New → Project**, then import your GitHub repository.
3. Under **Environment Variables**, add both variables:
   - `VITE_SUPABASE_URL` → your Project URL from step 4
   - `VITE_SUPABASE_ANON_KEY` → your anon key from step 4
4. Leave the build settings as-is (Vercel auto-detects Vite) and click **Deploy**.

The `vercel.json` in this repo already rewrites all routes to `index.html` so React Router works correctly on Vercel.

---

## Run locally

### Prerequisites

- Node.js 18+ (this project uses Vite 5; Node 22.12+ needed for Vite 8)

### Steps

1. **Clone the repo**

   ```bash
   git clone https://github.com/your-username/punchcard.git
   cd punchcard
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy the example file and fill in your Supabase credentials:

   ```bash
   cp .env.example .env
   ```

   Open `.env` and set:

   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Start the dev server**

   ```bash
   npm run dev
   ```

   The app runs at [http://localhost:5173](http://localhost:5173).

   - `/admin` — sign in and manage clients
   - `/client` — enter a 6-char code to check passes

---

## Routes

| Path | Description |
|------|-------------|
| `/` | Redirects to `/admin` |
| `/admin` | Admin login + dashboard (requires Supabase Auth) |
| `/client` | Public pass-lookup by code (no login required) |

## Project structure

```
src/
  pages/
    AdminPage.jsx   # Admin login + dashboard
    ClientPage.jsx  # Public code-lookup screen
  lib/
    clients.js      # Supabase data functions
  supabase.js       # Supabase client singleton
  main.jsx          # Router setup
  index.css         # Tailwind entry point
SUPABASE_SETUP.sql  # Run once in Supabase SQL Editor
vercel.json         # SPA rewrite rule for Vercel
.env.example        # Environment variable template
```
