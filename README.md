# Harpaviljongen API Documentation

## You can find the docs [here](https://harpaviljongen-db-api.onrender.com/api/docs/)

- **Testing locally (API + admin + website, Postman):** [docs/LOCAL_TESTING.md](docs/LOCAL_TESTING.md)
- **Going live with the new admin (Render, Cloudflare, Loopia, Cloudinary):** [docs/GO_LIVE.md](docs/GO_LIVE.md)
- **Postman:** import the collection and environments in [docs/](docs/)

## Table of Contents

1. [Overview](#overview)
2. [API Configuration](#api-configuration)
3. [Data Models](#data-models)
4. [Authentication](#authentication)
    - [Login/Logout](#auth-operations)
    - [User Model](#user-model)
    - [Auth Flow](#authentication-flow)
5. [API Endpoints](#api-endpoints)
    - [Menu Operations](#menu-operations)
    - [Opening Hours Operations](#opening-hours-operations)
    - [Event Operations](#event-operations)
    - [Auth Operations](#auth-operations)
6. [Error Handling](#error-handling)
7. [Development Setup](#development-setup)

## Overview

Backend API for Harpaviljongen restaurant managing:

- Menus (food, drinks, wine)
- Opening hours
- Events and activities
- Menu PDFs (Meny and Vinlista shown on the website)
- Site settings (which pages are shown in the navbar and on the homepage)
- Admin users with the roles `admin` and `employee`

### Base URLs

- Production: `https://harpaviljongen-db-api.onrender.com/api`
- Development: `http://localhost:7000/api`

### IP Adresses

- changes via Render

## API Configuration

### CORS Configuration

```typescript
interface CorsConfig {
	allowedOrigins: string[]; // Allowed domains
	credentials: boolean; // Always false
}

const allowedOrigins = [
	'https://harpaviljongen.com',
	'https://www.harpaviljongen.com',
	'https://harpaviljongen.pages.dev',
	'https://admin.harpaviljongen.com',
	'https://davidakerlind.github.io', // old admin
	'http://localhost:5173', // website (npm run dev)
	'http://localhost:5174', // admin (npm run dev)
	// + other local ports, and Cloudflare Pages previews:
	'https://*.harpaviljongen.pages.dev',
	'https://*.harpaviljongen-admin-service.pages.dev',
];
```

### Response Format

All API responses follow this structure:

```typescript
interface ApiResponse<T> {
	status: number; // HTTP status code
	message: string; // Human readable message
	success: boolean; // Operation success status
	data?: T; // Optional response data
}
```

## Data Models

### Menu Model

```typescript
interface MenuItem {
	id: string;
	active: boolean;
	title: string;
	description?: string;
	price: number | string;
	producer?: string; // Only for wine menu
	createdAt: string; // ISO timestamp
	updatedAt: string; // ISO timestamp
}

interface Menu {
	id: string; // e.g., "menu-wine", "menu-food"
	title: string; // e.g., "Wine Menu", "Food Menu"
	description?: string;
	type: string; // "food" | "wine" | "drinks"
	items: MenuItem[];
	createdAt: string; // ISO timestamp
	updatedAt: string; // ISO timestamp
}
```

### Opening Hours Model

```typescript
interface OpeningHours {
	day: WeekDay; // One of valid Swedish weekdays
	hours: {
		from: string; // Format: "HH:mm"
		to: string; // Format: "HH:mm"
	};
	createdAt: string; // ISO timestamp
	updatedAt: string; // ISO timestamp
}

type WeekDay =
	| 'Måndag'
	| 'Tisdag'
	| 'Onsdag'
	| 'Torsdag'
	| 'Fredag'
	| 'Lördag'
	| 'Söndag';
```

### Event Model

```typescript
interface Event {
	eventId: string;
	title: string;
	shortDescription: string; // Max 100 characters
	longDescription: string;
	date: string; // Format: "YYYY-MM-DD"
	startTime: string; // Format: "HH:mm"
	endTime: string; // Format: "HH:mm"
	type: EventType;
	image: string; // Default: "/src/assets/pictures/event.png"
	createdAt: string; // ISO timestamp
	updatedAt: string; // ISO timestamp
}

type EventType = 'dj' | 'wine' | 'private' | 'other';
```

## API Endpoints

### Menu Operations

#### Get All Menus

```http
GET /api/menus
Response: ApiResponse<Menu[]>
```

#### Get Menu by ID

```http
GET /api/menus/{menuId}
Response: ApiResponse<Menu>
```

#### Create Menu

```http
POST /api/menus
Body: Omit<Menu, "id" | "createdAt" | "updatedAt">
Response: ApiResponse<Menu>
```

#### Add Menu Item

```http
POST /api/menus/{menuId}/items
Body: Omit<MenuItem, "id" | "active" | "createdAt" | "updatedAt">
Response: ApiResponse<MenuItem>
```

#### Update Menu Item

```http
PUT /api/menus/{menuId}/items/{itemId}/{field}
Body: { value: any }
Allowed fields: ["title", "description", "price", "active"]
Response: ApiResponse<MenuItem>
```

#### Toggle Menu Item

```http
PATCH /api/menus/{menuId}/items/{itemId}/toggle
Response: ApiResponse<MenuItem>
```

### Opening Hours Operations

#### Get All Opening Hours

```http
GET /api/openingHours
Response: ApiResponse<OpeningHours[]>
```

#### Create Opening Hours

```http
POST /api/openingHours
Body: Omit<OpeningHours, "createdAt" | "updatedAt">
Response: ApiResponse<OpeningHours>
```

#### Update Opening Hours

```http
PUT /api/openingHours/day/{day}
Body: { hours: { from: string, to: string } }
Response: ApiResponse<OpeningHours>
```

### Event Operations

#### Get All Events

```http
GET /api/events
Response: ApiResponse<Event[]>
```

#### Get Future Events

```http
GET /api/events/future
Response: ApiResponse<Event[]>
```

#### Create Event

```http
POST /api/events
Body: Omit<Event, "eventId" | "createdAt" | "updatedAt">
Response: ApiResponse<Event>
```

#### Update Event

```http
PUT /api/events/{eventId}
Body: Partial<Event>
Response: ApiResponse<Event>
```

#### Delete Event

```http
DELETE /api/events/{eventId}
Response: ApiResponse<Event>
```

### Auth Operations

#### Login

```http
POST /api/auth/login
Body: {
    "username": string,  // Not case sensitive
    "password": string
}
Response: ApiResponse<{ token: string, user: { userId: string, username: string, role: "admin" | "employee" } }>
```

Send the token on every POST/PUT/PATCH/DELETE:

```http
Authorization: Bearer <token>
```

#### Check token

```http
GET /api/auth/me          (needs token)
Response: ApiResponse<{ user: { userId: string, username: string, role: "admin" | "employee" } }>
```

#### Change your own password

```http
PUT /api/auth/password    (needs token)
Body: { "currentPassword": string, "newPassword": string }   // new: 8–72 characters
Response: ApiResponse<{ token: string, user: {...} }>
```

The response has a new token for this device; all other tokens for the account stop working. A wrong current password gives 400 and counts towards the login limit.

#### Logout

```http
GET /api/auth/logout
Response: ApiResponse<null>
```

### Users (admins only)

```http
GET    /api/users                  (admin) List users, admins first. Never includes passwords.
POST   /api/users                  (admin) { "username": "anna", "password": "min-8-chars", "role": "employee" }
PATCH  /api/users/{userId}         (admin) { "role": "admin" }  – not your own role
PUT    /api/users/{userId}/password (admin) { "password": "min-8-chars" } – not your own; they are logged out everywhere
DELETE /api/users/{userId}         (admin) Only employees, not yourself
```

| Role       | Can do                                                        |
| ---------- | ------------------------------------------------------------- |
| `admin`    | Everything, including `/api/users`                            |
| `employee` | Menus, opening hours, pages (all writes except `/api/users`) |

- Usernames: 3–30 characters (letters incl. å ä ö, numbers, `. _ -`), unique and not case sensitive. Passwords: 8–72 characters.
- You can't change your own role or delete yourself, so there is always at least one admin.
- To remove an admin, change the role to `employee` first.
- Every token is checked against the database, so a deleted user is locked out right away and a role change applies immediately.
- A token carries a version number that goes up on every password change, so old tokens stop working as soon as a password is changed.
- Users from before roles existed get `admin` when the API starts.

### User Model

```typescript
interface User {
	userId: string; // Unique identifier, used in /api/users/{userId}
	username: string; // Unique (not case sensitive), 3–30 chars
	password: string; // bcrypt hash, never returned
	role: 'admin' | 'employee';
	tokenVersion: number; // +1 on every password change
	createdAt: Date; // null for users created before roles existed
}
```

### Authentication Flow

1. The admin sends `POST /api/auth/login` with username and password
2. If they are correct, the API returns a signed JWT (valid `JWT_EXPIRES_IN`, default 12 h)
3. The admin sends `Authorization: Bearer <token>` on every change
4. **All GET endpoints are public. Every POST, PUT, PATCH and DELETE returns 401 without a valid token.**
5. `/api/users` (and `POST /api/auth/register`, which does the same as `POST /api/users`) also needs the role `admin` (403 otherwise). The first admin is created from the command line:
   `npm run create-user -- <username> <password>`
6. Login is limited to 10 **failed** attempts per 15 minutes per IP (429 after that)

### Example Login Request

```bash
curl -X POST http://localhost:7000/api/auth/login ^
-H "Content-Type: application/json" ^
-d "{\"username\":\"adminuser\",\"password\":\"password123\"}"
```

### Example protected request

```bash
curl -X PUT http://localhost:7000/api/site-settings ^
-H "Content-Type: application/json" ^
-H "Authorization: Bearer <token>" ^
-d "{\"pages\":{\"chambre\":{\"navbar\":true}}}"
```

### Example Logout Request

```bash
curl http://localhost:7000/api/auth/logout
```

### Authentication Responses

#### Successful Login

```json
{
	"success": true,
	"message": "User logged in successfully"
}
```

#### Failed Login (401)

```json
{
	"message": "Username or password are incorrect",
	"success": false
}
```

#### Missing Credentials

```json
{
	"status": 400,
	"message": "Both username and password are required",
	"success": false
}
```

### Menu PDF Operations

`type` is `food` (Meny) or `wine` (Vinlista) on the website; `lunch` and `drinks` also exist.

```http
GET    /api/menu-pdfs?type=food           List PDFs, newest first
GET    /api/menu-pdfs/active?type=food    The active PDF (404 if none)
POST   /api/menu-pdfs/upload              (token) multipart: file, type, title?, activate?
PATCH  /api/menu-pdfs/{id}/activate       (token) Show on the website; the previous one of that type is turned off
PATCH  /api/menu-pdfs/{id}/deactivate     (token) Website falls back to its placeholder PDF
PATCH  /api/menu-pdfs/{id}                (token) { "title": "Höstmeny 2026" } rename (1–100 characters)
DELETE /api/menu-pdfs/{id}                (token) Also deletes the file in Cloudinary
```

### Site Operations

```http
GET /api/site-settings                    Which pages show in the navbar / on the homepage
PUT /api/site-settings                    (token) { "pages": { "chambre": { "navbar": true, "home": false } } }
GET /api/site-config                      What the website reads: page switches + active Meny/Vinlista PDF
GET /api/health                           API and database status
```

Pages: `chambre`, `events`, `gallery`. Placements: `navbar`, `home`. Only the values you send change.

### Latest changes (Senaste ändringar)

```http
GET /api/activity?limit=20                (token, any role) newest first, max 100
Response: ApiResponse<Array<{ id, type, username, details, createdAt }>>
```

Written automatically after each change made through the admin: PDF upload/show/stop/rename/delete, opening hours (only the days that changed), page switches (only the ones that changed), and users created, role changed, new password, deleted. Entries are removed after 180 days.

### Opening Hours: whole week

```http
PUT /api/openingHours                     (token) { "days": [{ "day": "Måndag", "hours": { "from": "", "to": "" } }, ...] }
```

Empty `from` and `to` = closed.

## Error Handling

### HTTP Status Codes

- 200: Success
- 201: Created
- 400: Bad Request
- 401: Missing, invalid or expired token / wrong login / deleted account
- 401 also when the password was changed after the token was issued
- 403: Logged in, but the role isn't allowed (e.g. an employee on `/api/users`)
- 404: Not Found
- 409: Username already exists
- 413: PDF larger than 10 MB
- 429: Too many login attempts
- 500: Server Error

### Error Response Example

```json
{
	"status": 400,
	"message": "Invalid input data",
	"success": false
}
```

## Development Setup

### What you need

- Node.js 18+
- MongoDB 5+
- npm or yarn
- Valid user credentials for authenticated routes

### Environment Variables

Copy `.env.example` to `.env`:

```env
PORT=7000
CONNECTION_STRING=mongodb+srv://[username]:[password]@[cluster].mongodb.net/[database]
JWT_SECRET=long-random-string
JWT_EXPIRES_IN=12h
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=menu-pdfs
```

Use a separate database (and `CLOUDINARY_FOLDER=menu-pdfs-dev`) locally, see [docs/LOCAL_TESTING.md](docs/LOCAL_TESTING.md).

### Installation

```bash
git clone https://github.com/DavidAkerlind/harpaviljongen-DB-API.git
cd harpaviljongen-DB-API
npm install
npm run seed                                     # empty database: opening hours + page settings
npm run create-user -- <username> <password>     # an admin login (add "employee" for a staff login)
npm run dev
```

### Database Schema Validation

The API uses Mongoose schemas with strict validation. All timestamps are automatically converted to Swedish time format.

### Testing Examples

```bash
# Create new menu
curl -X POST http://localhost:7000/api/menus ^
-H "Content-Type: application/json" ^
-d "{\"id\":\"menu-food\",\"title\":\"Food Menu\",\"type\":\"food\",\"items\":[]}"

# Add menu item
curl -X POST http://localhost:7000/api/menus/menu-food/items ^
-H "Content-Type: application/json" ^
-d "{\"title\":\"Pasta\",\"description\":\"Fresh pasta\",\"price\":159}"

# Create event
curl -X POST http://localhost:7000/api/events ^
-H "Content-Type: application/json" ^
-d "{\"title\":\"Wine Tasting\",\"shortDescription\":\"Exclusive wine tasting\",\"longDescription\":\"Join us for an evening of fine wines\",\"date\":\"2025-06-14\",\"startTime\":\"18:00\",\"endTime\":\"21:00\",\"type\":\"wine\"}"
```

---

🧑‍💻 Byggt av [David Åkerlind](https://github.com/DavidAkerlind)
