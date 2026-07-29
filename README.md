# Aura AI - Your Executive Assistant for Modern Work 🚀

Hey there! Welcome to the repository for **Aura AI** (also known as PassEduAI). 

If you've ever felt overwhelmed by your inbox or felt like you're spending more time scheduling meetings than actually doing the work, you're in the right place. I built this project after noticing a massive gap in how business owners and professionals manage their time. The goal? To bridge that gap by offloading the friction of email triage and calendar Tetris to AI, while keeping *you* firmly in the driver's seat.

## ✨ What does it do?

Aura AI acts as a smart layer on top of your existing Gmail account. 

- **🧠 Smart Auto-Drafting:** The moment an email arrives, the AI reads the context and drafts a highly tailored response for you.
- **🛡️ Human-in-the-loop Control:** AI shouldn't run on autopilot. All AI-generated emails land in a beautifully designed "Drafts Hub". You review it, tweak it if needed, and hit "Approve & Dispatch" to send it securely via your Gmail.
- **📅 One-Click Calendar Scheduling:** Forget the "what time works for you" back-and-forth. You can generate a Google Meet link and book a calendar event directly from the dashboard while reviewing an email.
- **💬 Interactive AI Chat:** Talk to your inbox. Ask the AI to summarize recent threads, search for specific contacts, or manually draft new emails on the fly.
- **⚡ Seamless Integration:** Connects securely to your Google account using OAuth.



## 🛠️ Built With

I wanted the platform to feel premium, responsive, and incredibly fast. Here's what's under the hood:

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS & Framer Motion (for buttery smooth micro-animations and glassmorphism UI)
- **State & Data Fetching:** TanStack React Query
- **Database:** PostgreSQL with Prisma ORM
- **Auth & Integrations:** Better Auth, Google Gmail API, Google Calendar API

## 🚀 Getting Started

Want to spin this up locally? Here's how:

### 1. Clone & Install
```bash
cd AI_EMAIL_SUPPORT
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory. You'll need to set up a project in the Google Cloud Console to get your OAuth credentials.

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/aura_db"

# Google API Credentials (Requires Gmail & Calendar scopes)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Auth
BETTER_AUTH_SECRET="your-random-secret-string"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# AI Provider Key
AI_API_KEY="your-ai-api-key"
```

### 3. Database Setup
Sync your Prisma schema with your database:
```bash
npx prisma generate
npx prisma db push
```

### 4. Run the App
```bash
npm run dev
```
Open up `http://localhost:3000`, connect your Google account, and let the AI take the wheel on your inbox!

## 🤝 Contributing
Feel free to open issues, submit PRs, or just reach out if you have ideas on how to make this better. Let's make inbox anxiety a thing of the past.
