# Nexus — Investor & Entrepreneur Collaboration Platform

Nexus is a full-stack MERN platform that connects entrepreneurs raising funding with investors looking for startups to back — combining discovery, messaging, meeting scheduling, video calls, document e-signing, deal tracking, and payments into a single product.

**Live demo (frontend):** https://nexus-alpha-vert-18.vercel.app

---

## Features

- **Authentication** — JWT-based register/login, role-based accounts (Entrepreneur / Investor), optional 2FA (sandbox OTP)
- **Profiles** — role-specific profiles (startup info for entrepreneurs, investment criteria for investors)
- **Discovery** — searchable, filterable listings of investors and entrepreneurs
- **Collaboration Requests** — investors send requests to entrepreneurs; accept/reject flow
- **Messaging** — real-time-style 1:1 chat with conversation history
- **Meetings** — schedule, accept/decline, and cancel meetings, with automatic conflict/double-booking detection
- **Video Calls** — real peer-to-peer WebRTC video calls (Socket.IO signaling server), launched from chat or an accepted meeting
- **Documents** — upload, download, delete, share, and e-sign documents (PDF/Word/Excel/images)
- **Deals** — investor-created deal pipeline (amount, equity, stage, status) tied to real startups
- **Payments (sandbox)** — simulated wallet with deposit/withdraw/transfer and transaction history
- **Notifications** — generated automatically from real activity (new message, collaboration request, meeting update, new deal)
- **Security** — bcrypt password hashing, JWT auth, input validation & sanitization (XSS/NoSQL injection), rate limiting on auth routes, HTTP security headers (Helmet), role-based route authorization

---

## Tech Stack

**Frontend**
- React + TypeScript + Vite
- Tailwind CSS
- React Router
- Socket.IO client (video call signaling)

**Backend**
- Node.js + Express
- MongoDB Atlas + Mongoose (with discriminators for Entrepreneur/Investor user types)
- JWT authentication + bcrypt password hashing
- Socket.IO (WebRTC signaling server)
- Multer (file uploads)
- express-validator, express-mongo-sanitize, helmet, express-rate-limit (security)

---

## Project Structure

```
Nexus/
├── Client/                 # React frontend
│   └── src/
│       ├── components/     # Reusable UI + feature components
│       ├── context/        # AuthContext (global auth state)
│       ├── lib/            # api.ts (REST client), socket.ts (Socket.IO client)
│       ├── pages/          # Route-level pages, grouped by feature
│       └── types/          # Shared TypeScript types
│
└── server/                 # Express backend
    ├── config/             # Database connection
    ├── controllers/        # Route handlers / business logic
    ├── middleware/         # Auth, validation, file upload, rate limiting
    ├── models/             # Mongoose schemas
    ├── routes/             # Express route definitions
    ├── scripts/             # DB seed script
    ├── uploads/             # Uploaded documents (gitignored)
    ├── signaling.js         # WebRTC signaling (Socket.IO)
    └── server.js            # App entry point
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- A MongoDB Atlas cluster (free tier works)

### 1. Clone the repo
```bash
git clone https://github.com/Muhammad-Shoaib-1/Nexus.git
cd Nexus
```

### 2. Backend setup
```bash
cd server
npm install
cp .env.example .env   # then fill in your own values, see below
npm run dev
```

**`server/.env` variables:**
```
PORT=5000
MONGO_URI=<your MongoDB Atlas connection string>
JWT_SECRET=<a long random string>
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

### 3. Frontend setup
```bash
cd Client
npm install
```

Create `Client/.env`:
```
VITE_API_URL=http://localhost:5000/api
```

```bash
npm run dev
```

The app will be running at `https://nexus-alpha-vert-18.vercel.app`, with the API at `https://nexus-255d.onrender.com/api`.

---

## API Overview

All endpoints are prefixed with `/api` and JWT-protected unless noted otherwise.

| Group | Base route | Notes |
|---|---|---|
| Auth | `/auth` | register, login, me, forgot/reset password, 2FA |
| Users | `/users` | list/get/update profiles |
| Collaboration Requests | `/requests` | send, list, accept/reject |
| Messages | `/messages` | conversations, thread, send |
| Meetings | `/meetings` | create (with conflict check), list, accept/decline/cancel |
| Deals | `/deals` | create, list, update |
| Documents | `/documents` | upload, list, download, delete, sign |
| Transactions | `/transactions` | deposit, withdraw, transfer, history |
| Notifications | `/notifications` | list, mark read |

WebRTC signaling runs over a Socket.IO connection on the same server/port as the REST API (JWT-authenticated via the socket handshake).

---

## Author

Muhammad Shoaib
