# SUPABASE & GROQ AI SETUP GUIDE FOR REVISIONLY

This guide details the step-by-step instructions to connect **Revisionly** to a live **Supabase PostgreSQL database** and **Groq AI (Llama-3.3-70b)** engine.

---

## 1. Create a Supabase Project

1. Navigate to [Supabase](https://supabase.com/) and sign in to your dashboard.
2. Click **"New Project"**.
3. Fill in the project details:
   - **Name**: `Revisionly` (or your preferred name)
   - **Database Password**: Choose a strong password and save it securely.
   - **Region**: Choose the region closest to you or your target users.
4. Click **"Create new project"** and allow 1-2 minutes for the database to provision.

---

## 2. Obtain Supabase API Credentials

1. In your Supabase Project Dashboard, navigate to **Project Settings** (gear icon) -> **API**.
2. Locate the following values:
   - **Project URL** (e.g., `https://xyzcompany.supabase.co`)
   - **Project API Keys** -> `anon` / `public` key (safe for browser usage)

---

## 3. Obtain Groq AI API Key

1. Navigate to the [Groq Console](https://console.groq.com/).
2. Log in or create an account.
3. Go to **API Keys** -> **"Create API Key"**.
4. Copy the generated key. *(Important: Keep this secret; it is strictly used by the server-side proxy and never sent to the browser!)*

---

## 4. Configure Environment Variables

Create a file named `.env` in the root directory of the project (`c:\Revision.AI\.env`). You can duplicate `.env.example`:

```bash
cp .env.example .env
```

Populate the variables with your actual keys:

```env
# =====================================================================
# SUPABASE CONFIGURATION (Public Frontend Client)
# =====================================================================
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# =====================================================================
# GROQ AI SECRET CONFIGURATION (Server-Side ONLY)
# NEVER EXPOSE THIS IN CLIENT-SIDE CODE OR COMMIT TO VERSION CONTROL
# =====================================================================
GROQ_API_KEY=gsk_your_groq_api_key_here

# =====================================================================
# STANDALONE SERVER PORT (Optional, default: 3001)
# =====================================================================
PORT=3001
```

> [!IMPORTANT]
> - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are safe for frontend client execution with PostgreSQL Row Level Security (RLS).
> - `GROQ_API_KEY` is **never exposed to the frontend**. Both the Vite development server middleware (`groqDevApiPlugin`) and the production Express backend (`server/index.ts`) route `/api/ai/*` calls through secure Node processes.

---

## 5. Execute SQL Migrations

Run the SQL migration scripts in order using the **Supabase SQL Editor**:

1. In your Supabase Dashboard, click on **SQL Editor** in the left sidebar.
2. Open each migration file from the `supabase/migrations/` directory in this repository, paste the contents into the editor, and click **"Run"**:

### Migration Execution Order:

| Step | Migration File | Description |
|------|----------------|-------------|
| **1** | `supabase/migrations/001_initial_schema.sql` | Creates all 10 core relational tables (`profiles`, `subjects`, `exams`, `topics`, `topic_progress`, `study_sessions`, `user_preferences`, `study_history`, `ai_conversations`, `ai_messages`), foreign keys, constraints, and cascade delete rules. |
| **2** | `supabase/migrations/002_rls_policies.sql` | Enables PostgreSQL Row Level Security (RLS) across all user tables and establishes strict `auth.uid() = user_id` SELECT/INSERT/UPDATE/DELETE policies and the auto-profile trigger on user signup. |
| **3** | `supabase/migrations/003_indexes.sql` | Creates composite and single-column indexes for fast dashboard queries, date filtering, and topic lookups. |
| **4** | `supabase/migrations/004_seed_demo_data.sql` | Installs the `import_nxtwave_demo_for_user(target_user_id)` database procedure, powering the on-demand `"IMPORT NXTWAVE DEMO"` feature for authenticated users. |

*(Alternative: If you have the Supabase CLI installed, you can run `supabase db push` or `supabase migration up`)*

---

## 6. Authentication Setup

1. In the Supabase Dashboard, navigate to **Authentication** -> **Providers**.
2. **Email**:
   - Ensure the **Email** provider is toggled **ON**.
   - (Optional for development) In **Authentication** -> **URL Configuration**, adjust **Confirm email** settings if you want instant logins without email verification links during testing.
3. **Google OAuth (Optional)**:
   - Toggle **Google** to **ON**.
   - Create OAuth Credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
   - Enter your Client ID and Client Secret into Supabase.
   - Add the Supabase Callback URL to Authorized redirect URIs in Google Cloud Console.

---

## 7. Configure Redirect URLs

1. In Supabase Dashboard, navigate to **Authentication** -> **URL Configuration**.
2. Add your development URL to **Site URL**:
   - `http://localhost:5173` (or `http://127.0.0.1:5173`)
3. Add your production deployment domain to **Redirect URLs**:
   - `https://your-production-domain.com/**`

---

## 8. Run Locally

To start the development server with both frontend and integrated server-side Groq AI proxy:

```bash
npm run dev
```

Visit `http://localhost:5173` in your browser.

- **Guest Demo Mode**: Works immediately without login or Supabase configuration, saving data to LocalStorage.
- **Authenticated Cloud Mode**: Click **"LOGIN"** in the top navigation bar to create an account. When authenticated, your timetable, exams, topics, and preferences are synchronized to Supabase PostgreSQL with RLS isolation.
- **Import NxtWave Demo**: Authenticated users start with clean profiles and can click **"IMPORT NXTWAVE DEMO"** anytime in the Navbar or Dashboard to copy the complete NxtWave syllabus and exam schedule into their account.

---

## 9. Production Deployment

### Option A: Node Fullstack (Express + Vite static build)

1. Build frontend bundle:
   ```bash
   npm run build
   ```
2. Start the Express backend:
   ```bash
   npm run server
   ```
   *Express serves the `/api/ai/*` endpoints and static assets from `dist/`.*

### Option B: Vercel / Netlify Serverless Functions

- Map `/api/ai/*` to serverless function handlers invoking `groqService.ts`.
- Set environment variables in the host dashboard:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `GROQ_API_KEY`
