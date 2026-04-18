# ReadMore Library — Database Management System

A full-stack library management system built for COSC 3380 (Database Systems). It supports patron registration, item borrowing, hold queues, room reservations, device rentals, fee management, and an admin reporting dashboard.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [User Roles](#user-roles)
- [API Routes](#api-routes)
- [Features Overview](#features-overview)
- [Database Triggers](#database-triggers)
- [Fee Policy](#fee-policy)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Backend | Node.js |
| Database | MySQL |

---

## Deployment

| Service | Purpose |
|---|---|
| Vercel | Frontend hosting |
| Render | Backend hosting |
| Azure | Database hosting |

**Live Site:** https://t9-library-db.vercel.app/

---

## Project Structure

```
Database-Systems-Team-9-Library-DB/
├── client/                          # React frontend
│   ├── src/
│   │   ├── pages/                   # All page components
│   │   ├── components/              # Shared components (Navbar, Footer, Banner, etc.)
│   │   ├── App.jsx                  # Route definitions
│   │   ├── main.jsx                 # React entry point
│   │   ├── api.js                   # Fetch wrapper with base URL
│   │   └── auth.js                  # Auth helper (role checks, token parsing)
│   ├── vite.config.js               # Vite config with /api proxy to port 3000
│   └── package.json
├── server/                          # Node.js backend
│   ├── routes/                      # Route handler modules
│   │   ├── auth.js                  # Login, registration
│   │   ├── items.js                 # Item catalog CRUD
│   │   ├── borrow.js                # Borrow and return logic
│   │   ├── holds.js                 # Hold queue management
│   │   ├── fees.js                  # Fee viewing and payment
│   │   ├── rooms.js                 # Room and reservation management
│   │   ├── users.js                 # Patron profile management
│   │   ├── staff.js                 # Staff management (admin only)
│   │   ├── notifications.js         # Notification read/unread
│   │   └── reports.js               # Admin analytics reports
│   ├── middleware/
│   │   └── auth.js                  # JWT verification, role enforcement
│   ├── config/
│   │   └── itemFeePolicy.js         # Late/damage/loss fee amounts by item type
│   ├── server.js                    # HTTP server and route dispatch
│   ├── db.js                        # MySQL connection pool
│   └── package.json
├── COSC3380_LIBRARYDB.sql           # Full database schema with triggers
└── README.md
```

---

## Database Schema

The database is named `library_db` and contains the following tables:

| Table | Description |
|---|---|
| `Person` | Base user table for all roles. Stores name, email, username, hashed password, role, address, borrow status |
| `Staff` | Extends Person for staff. Stores permissions (1=staff, 2=admin) |
| `User` | Extends Person for patrons |
| `Item` | Base item table. Type: 1=Book, 2=CD, 3=Device |
| `Book` | Book-specific metadata (author, publisher, genre, year, fines) |
| `CD` | CD-specific metadata (type, rating, release date, fines) |
| `Device` | Device-specific metadata (type, fines) |
| `Copy` | Physical copy of an item. Status: 1=available, 2=borrowed, 0=removed |
| `BorrowedItem` | Active and past borrow records with return due dates |
| `HoldItem` | Hold queue entries. Status: 1=waiting, 2=ready, 0=cancelled |
| `Room` | Study rooms. Status: 1=available, 0=unavailable |
| `RoomReservation` | Room bookings with start time and duration |
| `FeeOwed` | Fee records. Status: 1=unpaid, 2=paid. Type: 1=late, 2=damage, 3=loss |
| `FeePayment` | Payment records for resolved fees |
| `notification` | User notifications. Type: 1=hold ready, 2=fee update, 3=hold reminder, 4=room cancellation |

---

## Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **MySQL** 8.0 or higher
- **npm** v9 or higher

### 1. Clone the repository

```bash
git clone https://github.com/eb-v/Database-Systems-Team-9-Library-DB.git
cd Database-Systems-Team-9-Library-DB
```

### 2. Set up the database

Open MySQL Workbench (or any MySQL client) and run the full schema file:

```sql
SOURCE /path/to/COSC3380_LIBRARYDB.sql;
```

Or import it via MySQL Workbench: **Server → Data Import → Import from Self-Contained File** → select `COSC3380_LIBRARYDB.sql`.

This will create the `library_db` database, all tables, and all triggers.

### 3. Install server dependencies

```bash
cd server
npm install
```

### 4. Install client dependencies

```bash
cd ../client
npm install
```

---

## Environment Variables

Create a `.env` file inside the `server/` directory with the following values:

```env
DB_HOST=your_database_host
DB_USER=your_database_username
DB_PASSWORD=your_database_password
DB_NAME=library_db
JWT_SECRET=your_jwt_secret_key
```

| Variable | Description |
|---|---|
| `DB_HOST` | MySQL server host (e.g. `localhost` or a remote host) |
| `DB_USER` | MySQL username |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | Database name — should be `library_db` |
| `JWT_SECRET` | Secret key used to sign and verify JWT tokens. Use a long, random string |


---

## Running the Project

Both the client and server must be running at the same time.

### Start the backend server

```bash
cd server
npm run dev
```

The server runs on **http://localhost:3000**.

### Start the frontend client

In a separate terminal:

```bash
cd client
npm run dev
```

The client runs on **http://localhost:5173** and proxies all `/api` requests to `http://localhost:3000`.

### Verify everything is working

- Frontend: visit `http://localhost:5173` — you should see the ReadMore Library homepage
- Backend + Database: visit `http://localhost:3000/api/test` — you should see `{"message":"Server and database are running"}`

---

## User Roles

The system has three roles:

| Role | Access |
|---|---|
| **Guest** | View homepage, browse catalog, register |
| **Patron** | Borrow items, place holds, pay fees, reserve rooms, manage profile, view notifications |
| **Staff** | All patron features + manage items, process returns, manage holds, look up users |
| **Admin** | All staff features + manage staff accounts, view analytics reports |

### Role values in the database

| `role` | `staff_permissions` | Description |
|---|---|---|
| 2 | — | Patron |
| 1 | 1 | Staff |
| 1 | 2 | Admin |

---

## API Routes

All routes are prefixed with `/api` and the server runs on port 3000.

### Auth

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register a new patron |
| POST | `/api/auth/login` | Public | Login and receive JWT token |
| POST | `/api/auth/register-staff` | Admin | Register a new staff or admin account |

### Items

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/items` | Any | Browse catalog |
| GET | `/api/items/:id` | Any | Get item details with copies |
| POST | `/api/items` | Staff | Add a new item |
| PUT | `/api/items/:id` | Staff | Update item details |
| DELETE | `/api/items/:id` | Staff | Soft-remove a copy |

### Borrowing

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/borrow` | Staff | View all borrow records |
| GET | `/api/borrow/:person_id` | Any (self) | View borrow history for a person |
| POST | `/api/borrow` | Any | Borrow an item |
| POST | `/api/borrow/return` | Any | Return a borrowed item |

### Holds

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/holds` | Staff | View all holds |
| GET | `/api/holds/:person_id` | Any (self) | View holds for a person |
| POST | `/api/holds` | Any | Place a hold |
| DELETE | `/api/holds/:hold_id` | Any (self or staff) | Cancel a hold |

### Fees

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/fees` | Staff | View all fees |
| GET | `/api/fees/:person_id` | Any (self) | View fees for a person |
| POST | `/api/fees/pay` | Any | Pay a fee |

### Rooms & Reservations

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/rooms` | Staff | List all rooms |
| POST | `/api/rooms` | Staff | Add a room |
| PATCH | `/api/rooms/:room_id` | Staff | Update room status |
| GET | `/api/reservations` | Staff | View all reservations |
| GET | `/api/reservations/:person_id` | Any (self) | View reservations for a person |
| GET | `/api/reservations/available` | Any | Query available time slots |
| POST | `/api/reservations` | Any | Make a reservation |
| DELETE | `/api/reservations/:reservation_id` | Any (self or staff) | Cancel a reservation |

### Notifications

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/notifications` | Any | Get all notifications for logged-in user |
| GET | `/api/notifications/summary` | Any | Get unread notification count |
| PUT | `/api/notifications/:id` | Any | Mark notification as read |
| PUT | `/api/notifications/:id/unread` | Any | Mark notification as unread |
| PUT | `/api/notifications/read-all` | Any | Mark all notifications as read |

### Users & Staff

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/users` | Staff | List all patrons |
| GET | `/api/users/lookup` | Staff | Look up a specific user |
| PUT | `/api/users/profile` | Any | Update own profile |
| PUT | `/api/users/deactivate` | Any | Deactivate own account |
| GET | `/api/staff` | Admin | List all staff |
| PUT | `/api/staff/:person_id` | Admin | Update staff permissions |
| DELETE | `/api/staff/:person_id` | Admin | Deactivate a staff account |

### Reports (Admin Only)

| Method | Route | Description |
|---|---|---|
| GET | `/api/reports/overview` | General KPIs |
| GET | `/api/reports/popularity` | Item popularity report |
| GET | `/api/reports/patrons` | Patron activity report |
| GET | `/api/reports/fees` | Fee and fine report |
| GET | `/api/reports/revenue` | Revenue report |

---

## Features Overview

### Borrowing System
- Patrons can borrow available copies of books, CDs, and devices
- Each item type has a configurable borrow period
- Late, damage, and loss fees are automatically applied on return
- A patron with unpaid fees has their borrowing privileges suspended (enforced by DB trigger)

### Hold Queue
- Patrons can place holds on items that are currently checked out
- Holds are queued by placement time
- When a copy becomes available, the next patron in the queue is automatically promoted to "Ready" status via a database trigger
- Ready holds expire after 2 days if not picked up
- Patrons are limited to 2 active holds at a time

### Room Reservations
- Patrons can reserve study rooms in hourly slots between 8 AM and 9 PM
- Maximum reservation length is 4 hours per booking
- If a room is taken offline by staff, all active reservations are cancelled and patrons are notified

### Notifications
- Patrons receive in-app notifications for:
  - Fee added to account (type 2)
  - Fee resolved / borrowing restored (type 2)
  - Hold promoted to ready (type 1)
  - Room reservation cancelled (type 4)
- Notifications can be individually marked read or unread, or all marked read at once

### Reports (Admin)
- **Popularity Report** — most borrowed items, borrow counts, genre breakdowns
- **Patron Activity Report** — most active patrons, borrow history
- **Fee Report** — fee totals, outstanding balances, payment history
- **Revenue Report** — income over time from fee payments
- All reports can be exported to PDF

---

## Database Triggers

Three triggers are defined in `COSC3380_LIBRARYDB.sql`:

### `restrict_borrow_on_fee`
- **Fires:** `AFTER INSERT ON FeeOwed`
- **Action:** When a new unpaid fee (status=1) is created, sets the patron's `borrow_status = 0`, preventing them from checking out items

### `unrestrict_borrow_on_paid`
- **Fires:** `AFTER UPDATE ON FeeOwed`
- **Action:** When a fee is marked paid (status changes from 1 to 2), checks if the patron has any remaining unpaid fees. If none remain, restores `borrow_status = 1`

### `promote_next_hold`
- **Fires:** `AFTER UPDATE ON Copy`
- **Action:** When a copy's status changes to 1 (available), finds the next waiting hold in the queue, promotes it to ready (status=2), sets a 2-day expiry, and inserts a hold-ready notification for the patron


---

## Fee Policy

Defined in `server/config/itemFeePolicy.js`:

| Item Type | Late Fee (per day) | Damage Fee | Loss Fee |
|---|---|---|---|
| Book | $5.00 | $25.00 | $30.00 |
| CD | $10.00 | $15.00 | $20.00 |
| Device | $20.00 | $50.00 | $100.00 |
