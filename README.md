# 🔑 API Key Management System

A full-stack web application to manage, monitor, and track real-time usage for all your AI API keys — inspired by [CodexBar](https://github.com/steipete/codexbar)

![Stack](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-green)
![Stack](https://img.shields.io/badge/Frontend-React-blue)
![Stack](https://img.shields.io/badge/Database-MySQL-orange)

---

## ✨ Features

- **Real-time usage sync** — fetches live data from provider APIs
- **Credits & requests tracking** — see exactly how many credits/tokens are used vs. remaining
- **Visual progress meters** — color-coded usage bars (green → yellow → red)
- **Multi-provider support** — Anthropic, OpenAI, Gemini, Mistral, Groq, Cohere, HuggingFace
- **MySQL Workbench** — all data stored locally in your own MySQL instance
- **Auto-sync** — background cron job syncs all keys every 30 minutes
- **Usage history charts** — 14-day token/request/cost trend charts
- **Sync logs** — full history of every sync attempt with response times
- **Model breakdown** — per-model token/cost breakdown via pie chart
- **Key management** — add, edit, enable/disable, delete keys with tags and notes

---

## 🗂 Project Structure

```
api-key-management/
├── backend/
│   ├── config/
│   │   ├── database.js      # MySQL connection pool + schema init
│   │   └── providers.js     # Real API fetchers per provider
│   ├── controllers/
│   │   └── apiKeyController.js
│   ├── routes/
│   │   └── apiKeys.js
│   ├── server.js            # Express app + cron auto-sync
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── public/index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.js
│   │   │   ├── UsageMeter.js
│   │   │   └── AddKeyModal.js
│   │   ├── pages/
│   │   │   ├── Dashboard.js
│   │   │   ├── KeysList.js
│   │   │   └── KeyDetail.js
│   │   ├── utils/
│   │   │   ├── api.js
│   │   │   └── providers.js
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
├── setup.js                 # Interactive config setup
└── README.md
```

---

## 🚀 Setup Instructions

### Prerequisites

- **Node.js** v18+ → https://nodejs.org
- **MySQL Server** (MySQL Workbench installed) → https://dev.mysql.com/downloads/workbench/
- **npm** (comes with Node.js)

---

### Step 1 — Clone / Extract the project

Place the `api-key-management` folder anywhere on your machine.

---

### Step 2 — Configure the database

#### Option A — Interactive setup (recommended)
```bash
cd api-key-management
node setup.js
```
Follow the prompts to enter your MySQL credentials.

#### Option B — Manual setup
```bash
cp backend/.env.example backend/.env
```
Edit `backend/.env`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=api_key_management
PORT=5000
FRONTEND_URL=http://localhost:3000
```

> **Note:** The app automatically creates the `api_key_management` database and all tables on first run. You do NOT need to create them manually.

---

### Step 3 — Install dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd ../frontend
npm install
```

---

### Step 4 — Start the backend

```bash
cd backend
node server.js
```

You should see:
```
✅ Database initialized successfully

🚀 API Key Management System
   Backend: http://localhost:5000
   Health:  http://localhost:5000/health
   Auto-sync: every 30 minutes
```

---

### Step 5 — Start the frontend

Open a **new terminal**:
```bash
cd frontend
npm start
```

The app opens at **http://localhost:3000** 🎉

---

## 🔑 Adding Your First API Key

1. Click **"Add Key"** in the top right
2. Select your provider (e.g., Anthropic)
3. Enter a name and paste your real API key
4. Click **"Add & Sync"** — it immediately fetches live data

The system shows:
- **Credits Used** vs **Credits Remaining**
- **Tokens Used** vs **Rate Limit**
- **Requests** used vs remaining
- Color bars: 🟢 Green (healthy) → 🟡 Yellow (70%+) → 🔴 Red (90%+)

---

## 📡 Supported Providers & What Data Is Fetched

| Provider | Tokens | Credits | Rate Limits | Model Breakdown |
|----------|--------|---------|-------------|-----------------|
| **Anthropic/Claude** | ✅ | ✅ | ✅ | ✅ |
| **OpenAI/GPT** | ✅ | ✅ (billing) | ✅ | ✅ |
| **Google Gemini** | — | — | ✅ | ✅ (model list) |
| **Mistral** | — | — | ✅ | ✅ (model list) |
| **Groq** | — | — | ✅ | ✅ (model list) |
| **Cohere** | — | — | — | — (validates key) |
| **HuggingFace** | — | — | — | — (validates key) |

> **Note on Anthropic:** Full usage stats (tokens + costs) require an **Admin API key**. Regular keys still validate and return rate limits. Get an admin key at: https://console.anthropic.com/settings/keys

---

## 🗄 MySQL Tables Created

| Table | Purpose |
|-------|---------|
| `api_keys` | Stores all API keys (encrypted at rest in your own DB) |
| `usage_stats` | Latest fetched stats per key |
| `usage_history` | Daily usage snapshots (for charts) |
| `sync_logs` | Full log of every sync attempt |

---

## 🔌 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard` | Dashboard summary stats |
| GET | `/api/keys` | All keys with latest stats |
| GET | `/api/keys/:id` | Single key with full history |
| POST | `/api/keys` | Add new key + immediate sync |
| PUT | `/api/keys/:id` | Update name/notes/tags/status |
| DELETE | `/api/keys/:id` | Delete key and all its data |
| POST | `/api/keys/:id/sync` | Sync single key now |
| POST | `/api/sync-all` | Sync all active keys |
| GET | `/api/keys/:id/reveal` | Get raw API key value |
| GET | `/health` | Server health check |

---

## 🔧 Troubleshooting

**MySQL connection error:**
- Make sure MySQL is running (check MySQL Workbench or `brew services start mysql`)
- Verify DB_PASSWORD in `backend/.env`
- Try connecting with: `mysql -u root -p`

**CORS error in browser:**
- Make sure backend is running on port 5000
- `FRONTEND_URL` in `.env` must match your React app URL

**Provider API errors:**
- Anthropic: Admin keys start with `sk-ant-admin...`, regular with `sk-ant-api03...`
- OpenAI: Project keys (`sk-proj-...`) may not have billing access
- Gemini: Keys from AI Studio start with `AIza...`

---

## 🔒 Security Notes

- API keys are stored **in your local MySQL database only** — nothing leaves your machine
- The reveal endpoint is local-only — never expose this backend to the internet
- All API calls are made server-side (backend), not from the browser

---
