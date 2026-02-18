# Sara Peso

A multi-user weight tracking web application. Log your weight daily and visualize your progress over time with interactive charts.

## Features

- **User authentication** — Sign up and sign in with email/password (JWT-based)
- **Daily weight logging** — Log your weight once per day (overwrites if you correct it)
- **Interactive chart** — D3.js line chart with date range filters (7D, 30D, 90D, All)
- **Stats dashboard** — Current weight, change over time, lowest weight
- **Multi-user** — Each user's data is isolated and private

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express 5 |
| Frontend | Vanilla HTML/CSS/JS, D3.js v7 |
| Database | AWS DynamoDB |
| Auth | JWT (Bearer tokens, 24h expiry) |
| Deployment | GitHub Actions CI/CD → EC2 (Amazon Linux 2) |
| Process Manager | PM2 |
| Reverse Proxy | nginx |

## Project Structure

```
SaraPesoApp/
├── back/
│   ├── server.js              # Express app entry point
│   ├── lib/db.js              # Shared DynamoDB client
│   ├── middleware/auth.js     # JWT verification middleware
│   ├── routes/auth.js         # POST /api/signup, POST /api/signin
│   ├── routes/weight.js       # Weight CRUD endpoints
│   ├── .env.example           # Environment variable template
│   └── package.json
├── front/
│   ├── index.html             # SPA with auth + dashboard views
│   ├── css/styles.css         # All styles
│   └── js/
│       ├── api.js             # Fetch wrapper with auth headers
│       ├── app.js             # View routing, session management
│       ├── auth.js            # Login/signup form handlers
│       ├── chart.js           # D3.js chart rendering
│       └── dashboard.js       # Weight form, stats, data loading
├── .github/workflows/
│   └── deploy.yml             # CI/CD pipeline
├── ec2-setup.sh               # One-time EC2 server setup
└── .gitignore
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/signup` | No | Create account |
| POST | `/api/signin` | No | Sign in |
| POST | `/api/weight` | Yes | Log weight `{ weight, date? }` |
| GET | `/api/weight` | Yes | Get history `?from=&to=` |
| GET | `/api/weight/latest` | Yes | Get most recent entry |
| DELETE | `/api/weight/:date` | Yes | Delete entry by date |

## Local Development

```bash
# 1. Clone the repo
git clone https://github.com/sebastianremar/TrackWeightApp.git
cd TrackWeightApp

# 2. Set up environment variables
cp back/.env.example back/.env
# Edit back/.env with your JWT_SECRET and AWS credentials

# 3. Install dependencies
cd back && npm install

# 4. Start the server
npm run dev
# App runs at http://localhost:3000
```

## Deployment

Pushing to `main` triggers automatic deployment via GitHub Actions.

**GitHub Secrets required:**
- `EC2_HOST` — EC2 public IP or DNS
- `EC2_SSH_KEY` — SSH private key (PEM contents)

**First-time EC2 setup:**
```bash
ssh -i your-key.pem ec2-user@your-ec2-host 'bash -s' < ec2-setup.sh
```
