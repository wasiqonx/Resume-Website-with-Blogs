# Wasiq Syed Personal Webpage & Blog Platform

A modern, secure, and privacy-focused personal website and blog platform for Wasiq Syed. Features a crypto donation system, blog management, email subscriptions, and more.

---

## Features
- **Personal Portfolio**: About, education, projects, skills, testimonials, and contact form.
- **Blog System**: Admin-authenticated blog creation, editing, and publishing.
- **Crypto Donations**: Accepts XMR directly or any crypto via Trocador widget.
- **Email Subscriptions**: Users can subscribe for blog updates.
- **Anonymous Messaging**: Users can send anonymous feedback.
- **SEO Optimized**: Sitemap, RSS, Open Graph, and structured data.

---

## Folder Structure

```
Modern/
├── database/           # SQLite DB and migrations
├── scripts/            # Utility scripts (init DB, auth, etc.)
├── src/                # (If present) Modular backend code (controllers, routes, services)
├── styles/             # CSS files
├── index.html          # Main frontend
├── server.js           # Main backend (Express)
├── package.json        # Node dependencies
├── README.md           # This file
└── ...                 # Other HTML pages, assets, etc.
```

---

## Setup & Installation

1. **Clone the repo:**
   ```sh
   git clone <repo-url>
   cd Modern
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Configure environment variables:**
   - Copy `.env.example` to `.env` and fill in the values.
4. **Initialize the database:**
   ```sh
   npm run init-db
   ```
5. **Start the server:**
   ```sh
   npm start
   # or
   node server.js
   ```
6. **Open in browser:**
   - Visit [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

See `.env.example` for all required variables. Common ones:
- `PORT` - Port to run the server (default: 3000)
- `JWT_SECRET` - Secret for JWT auth
- `EMAIL_USER` - SMTP user for sending emails
- `EMAIL_PASS` - SMTP password
- `EMAIL_FROM` - From address for emails
- `BASE_URL` - Public URL of your site

---

## Development
- **Backend:** Node.js + Express (see `server.js`)
- **Frontend:** Static HTML/CSS/JS (see `index.html`)
- **Database:** SQLite (see `database/`)
- **Scripts:** Utility scripts in `scripts/`

### Running in Dev Mode
- Use `nodemon` for auto-reload:
  ```sh
  npx nodemon server.js
  ```

---

## Contribution Guidelines
- Write clear, descriptive commit messages.
- Use consistent code style (2 spaces, camelCase for JS).
- Add comments for non-obvious logic.
- Test your changes before pushing.
- Open a pull request with a clear description.

---

## Troubleshooting & FAQ

**Q: The server won’t start?**
- Check your `.env` file and DB path.
- Make sure all dependencies are installed.

**Q: Email not sending?**
- Check SMTP credentials in `.env`.
- Some free SMTP providers block bulk or automated emails.

**Q: How do I reset the admin password?**
- Use the `scripts/auth-manager.js` or update the DB directly.

**Q: How do I add a new blog post?**
- Log in as admin at `/login.html` and use the admin dashboard.

---

## License
MIT (see LICENSE)

---

## Contact
- [wasiq@wasiq.in](mailto:wasiq@wasiq.in)
- [Telegram](https://t.me/wasiqtg) 