# Revisionly (Revi.Ai)

> **"Stop planning. Start studying."**  
> An editorial, typography-first academic study planner and autonomous schedule engine built for students preparing for high-stakes exams.

---

## ✦ Key Features

- **Bold Typography Design System**: "Poster design translated to web" — high-contrast editorial hierarchy, tight tracking, and zero rounded corners (0px radius) across all components.
- **Full Dark & Light Themes**: Warm white and restrained vermillion (`#FF3D00`) light mode alongside a deep near-black (`#0A0A0A`) dark mode. Automatically matches system preference and persists user selection.
- **Autonomous Rescheduling Engine**: Missed a study session? The scheduler recalculates priorities, respects user daily study limits, and rebalances remaining topics without naively shifting tasks past their exam deadlines.
- **Syllabus & Exam Management**: Track subjects, chapters, and deadlines with structured editorial checklists and large typographic countdowns.
- **Zero-Fake Metrics State**: Clean, honest starting state (0% completion, 0 streak, 0 fake hours) with full progress analytics calculated strictly from user activity.
- **Groq AI Integration**: Fast, context-aware academic command assistant and study plan optimizer powered by Groq (`qwen/qwen3.8-27b`).
- **Cloud & Local Persistence**: Seamless guest mode with `localStorage` and full multi-tenant synchronization backed by Supabase.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide Icons, Canvas Confetti
- **Typography**: Inter Tight, Inter, JetBrains Mono, Playfair Display
- **Backend / Middleware**: Vite development server API routes & Node.js
- **AI Engine**: Groq SDK (`qwen/qwen3.8-27b`)
- **Database / Auth**: Supabase (PostgreSQL, Row Level Security)

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/sharathbk910/Revi.Ai.git
cd Revi.Ai
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
GROQ_API_KEY=gsk_your_groq_api_key
```

> **Note**: Never commit your `.env` file to version control. It is explicitly ignored in `.gitignore`.

### 4. Run the development server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Build for production
```bash
npm run build
```

---

## 📋 Database Setup (Supabase)

To enable cloud authentication and cross-device sync:
1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Run the migrations in `supabase/migrations/` (001 through 004) in the Supabase SQL Editor.
3. See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for full schema details and setup instructions.

---

## 📄 License

MIT License. Designed and built with precision.
>>>>>>> 55d4dc0 (feat: complete Revisionly refactor with Bold Typography design system, 0% initial demo state, full light/dark themes, and Groq/Supabase integration)
