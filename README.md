
# NEXUS // Developer Social Mesh — Full-Stack Social Platform

[![Node.js](https://img.shields.io/badge/Node.js-v18+-68a063?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?style=for-the-badge&logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47a248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38b2ac?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![CodeAlpha](https://img.shields.io/badge/Internship-CodeAlpha-007acc?style=for-the-badge)](https://www.codealpha.tech/)

A responsive, feature-dense full-stack social network engineered for the **CodeAlpha Full Stack Web Development Internship** (Task 2). **NEXUS** enables developers and creators to broadcast technical transmissions, attach rich media, interact through threaded discussions, curate profile identities with custom avatars and bios, manage their posts, and establish follower connections across a persistent MongoDB document mesh.

---

## ⚡ Key Architectural Features

- **Live Transmission Stream**: Public developer broadcast feed supporting formatted text and external media attachments.
- **Author Post Deletion**: Instant transmission cleanup allowing authors to permanently delete their posts from the feed and MongoDB in real time.
- **Profile Customization (Instagram-style)**: Clean monogram initial fallbacks on registration; users can update their display name, custom avatar image URL, and bio at any time.
- **Atomic Heart/Like Toggle**: Interactive post likes updating real-time counter arrays without page reloads.
- **Threaded Comment Drawers**: Collapsible discussion sections allowing authenticated users to append and inspect nested replies.
- **Relational Follower Network**: Dynamic follow/unfollow capability with live connection statistics that updates both target and initiator documents simultaneously.
- **Dedicated Node Profile Views**: Dedicated profile pages (`/profile.html?handle=...`) rendering user biography, connection counters, and author post history.
- **Cyberpunk Dark Interface**: High-contrast, dark-mode glassmorphic cards with responsive borders and backdrop blur.
- **Interactive Neural Canvas**: HTML5 Canvas particle system tracking dynamic distance-based vectors between nodes in the background.
- **Stateless Token Authentication**: Salted credential encryption using `bcryptjs` paired with JSON Web Tokens (JWT) for secure session headers.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | HTML5, Vanilla JavaScript (ES6+), Tailwind CSS CDN, Lucide Icons, HTML5 Canvas API |
| **Backend API** | Node.js, Express.js REST Framework |
| **Database** | MongoDB & Mongoose ODM |
| **Security & Auth** | JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, CORS, Dotenv |

---

## 🗄️ Database Design (MongoDB)

- **`User` Schema**:
  - `name`, `handle` (unique, lowercase), `email` (unique, lowercase), `password` (hashed)
  - `bio`, `avatar` (defaults to empty string for custom profile uploads)
  - `followers`: `[ObjectId -> User]`
  - `following`: `[ObjectId -> User]`
- **`Post` Schema**:
  - `author`: `ObjectId -> User`
  - `content`, `media`
  - `likes`: `[ObjectId -> User]`
  - `comments`: `[{ author, authorName, authorHandle, text, createdAt }]`

---

## 📁 Repository Structure

```text
CodeAlpha_SocialPlatform/
├── public/              # Static frontend client files
│   ├── css/             # Custom utility overrides
│   ├── js/              # Client-side scripts
│   ├── index.html       # Main live feed, post editor & broadcast stream
│   └── profile.html     # Dedicated node profile & follow view
├── .env                 # Environment configuration (git-ignored)
├── .gitignore           # Git ignore policy
├── package.json         # Scripts and project dependencies
├── seed.js              # Mock demographic & content seeder
├── server.js            # Express application entry point
└── README.md            # Comprehensive project documentation

```

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone [https://github.com/IamAbinashDas/CodeAlpha_SocialPlatform.git](https://github.com/IamAbinashDas/CodeAlpha_SocialPlatform.git)
cd CodeAlpha_SocialPlatform
npm install

```

### 2. Environment Configuration

Create a `.env` file in the project root:

```env
PORT=5001
JWT_SECRET=pulse_social_secret_key_2026
MONGO_URI=mongodb://127.0.0.1:27017/codealpha_social

```

### 3. Seed the Database

Populate initial demo users and posts:

```bash
node seed.js

```

### 4. Launch the Server

```bash
npm run dev
# or: node server.js

```

Open your browser and navigate to **`http://localhost:5001`**.

---

## 📡 RESTful API Reference

| Method | Endpoint | Description | Auth Required |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Register a new user handle & profile | No |
| `POST` | `/api/auth/login` | Authenticate credentials and retrieve JWT | No |
| `GET` | `/api/users/:handle` | Query profile details and author's posts | No |
| `PUT` | `/api/users/profile` | Update profile details (name, bio, avatar) | Yes (Bearer Token) |
| `POST` | `/api/users/:id/follow` | Connect or disconnect (follow/unfollow) | Yes (Bearer Token) |
| `GET` | `/api/posts` | Fetch all public feed transmissions | No |
| `POST` | `/api/posts` | Broadcast a new post to the feed | Yes (Bearer Token) |
| `DELETE` | `/api/posts/:id` | Permanently delete post (author only) | Yes (Bearer Token) |
| `POST` | `/api/posts/:id/like` | Toggle like/unlike state for a post | Yes (Bearer Token) |
| `POST` | `/api/posts/:id/comment` | Append a comment to a post discussion | Yes (Bearer Token) |

---

## 👨‍💻 Author

**Abinash Das**

* GitHub: [@IamAbinashDas](https://www.google.com/search?q=https://github.com/IamAbinashDas)
* Program: CodeAlpha Full Stack Web Development Internship (Task 2)

```

```
