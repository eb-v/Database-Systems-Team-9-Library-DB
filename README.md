# Team 9 Library Database

## Getting Started

### Prerequisites
- Node.js installed
- Access to the team database (get credentials from your team lead)

### Setup

1. Clone the repository
   ```bash
   git clone <repo-url>
   ```

2. Set up the server
   ```bash
   cd server
   npm install
   ```
   Copy `.env.example` to `.env` and fill in your database credentials and JWT secret:
   ```
   DB_HOST=
   DB_USER=
   DB_PASSWORD=
   DB_NAME=
   JWT_SECRET=
   ```

3. Set up the client
   ```bash
   cd client
   npm install
   ```

### Running the App

In one terminal, start the backend:
```bash
cd server
npm run dev
```

In another terminal, start the frontend:
```bash
cd client
npm run dev
```

- Backend runs on `http://localhost:3000`
- Frontend runs on `http://localhost:5173`

To verify everything is working:
- Frontend: visit `http://localhost:5173` — you should see the Vite + React page
- Backend + Database: visit `http://localhost:3000/api/test` — you should see `{"message":"Server and database are running"}`
