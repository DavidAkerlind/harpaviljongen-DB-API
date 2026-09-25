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

#### Your own profile

```http
PATCH  /api/auth/me       (needs token) { "username"?: string, "name"?: string | null }   // only what changes
PUT    /api/auth/avatar   (needs token) multipart "file": JPG, PNG or WebP, max 5 MB
DELETE /api/auth/avatar   (needs token)
Response: ApiResponse<{ user: { userId, username, name, avatarUrl, role, createdAt } }>
```

- `username`: same rules as for new users (409 if taken). You stay logged in; tokens belong to the account, not the name.
- `name`: display name shown in the admin instead of the username, max 50 characters. `null` or `""` removes it.
- The picture is stored as a square 512 px JPG in Cloudinary (`CLOUDINARY_AVATAR_FOLDER`, default `admin-avatars`). A new picture replaces and deletes the old one; deleting a user deletes their picture.

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

### Menus

Meny (`food`) and Vinlista (`wine`) always exist and can't be deleted. Staff can create more in the admin (e.g. *Lunchmeny*); each gets a `type` made from its name (`lunchmeny`). `navbar` / `home`: whether the website shows a button for it in the menu / on the homepage. Meny and Vinlista open the placeholder PDF when none is active; other menus only get a button when one of their PDFs is active.

```http
GET    /api/menu-lists                    All menus in order: [{ type, label, order, navbar, home, builtIn }]
POST   /api/menu-lists                    (token) { "label": "Lunchmeny", "navbar"?: true, "home"?: true }  409 if the name is taken
PATCH  /api/menu-lists/{type}             (token) { "label"?, "navbar"?, "home"? }
DELETE /api/menu-lists/{type}             (token) The menu and all its PDFs (also in Cloudinary). Not Meny/Vinlista.
```

At most 20 menus. On startup the API makes sure Meny and Vinlista exist (and gives any PDFs of an unknown type a hidden menu).

### Menu PDF Operations

`type` is the `type` of a menu, see above.

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
GET /api/site-config                      What the website reads: page switches, menuLists (buttons with the active PDF's url) and menus (active PDF per type, for older versions of the website)
GET /api/health                           API and database status
```

Pages: `chambre`, `events`, `gallery`. Placements: `navbar`, `home`. Only the values you send change.

### Change log (Senaste ändringar / Alla ändringar)

```http
GET /api/activity?limit=20&from=&to=&category=&userId=&before=   (token, any role)
Response: ApiResponse<{ items: Activity[], total: number, hasMore: boolean }>
GET /api/activity/users                                          (token) everyone in the log
DELETE /api/activity?olderThan=30d|3m|6m|1y|all                  (admin) delete older entries
```

- Newest first, max 100 per page. `before` = id of the last entry you have, for the next page.
- `from` / `to`: ISO dates (`to` is exclusive). The admin sends midnight in the browser's time zone.
- `category`: `menus` (PDFs and the menus themselves), `openingHours`, `pages`, `users`, `account`, `log`. `userId`: changes by one person.
- `total` counts everything matching the filters. Each entry has `user: { name, avatarUrl, deleted }` with the person's current name and picture.

Written automatically after each change made through the admin: menus created/changed/deleted, PDF upload/show/stop/rename/delete, opening hours (only the days that changed), page switches (only the ones that changed), users created/role/new password/deleted, and your own username, name, picture and password.

**Kept for 1 year.** MongoDB deletes entries automatically when they are 365 days old (a TTL index on `createdAt`, checked about once a minute; the API sets it up on startup). Admins can delete older entries sooner with `DELETE /api/activity?olderThan=…`: everything older than 30 days (`30d`), 3 months (`3m`), 6 months (`6m`), 1 year (`1y`), or everything (`all`). The response says how many were deleted, and the clearing itself is logged (`activity.clear`, category `log`) so you can see who did it.

### Statistics (Statistik in the admin)

```http
POST /api/analytics/hit                   (public) { "p": "/events", "r": "https://www.google.com/" } – sent by the website, always 204
GET  /api/analytics?range=7d|30d|90d      (token, any role) our own numbers and Cloudflare's side by side
PUT  /api/auth/dashboard                  (token) { "widgets": [{ "id": "visitors", "size": "medium" }] } your own Översikt layout, null = standard
```

The website counts every page view itself: only the path and the page the visitor came from are sent. No cookies, no IP addresses and nothing that identifies a visitor is stored, only counters per day (Stockholm time): page views and visits in total, per page, per referrer and per device type (`sitestats`, deleted after 400 days). A **visit** is a page view that didn't come from another page on the site, the same definition as Cloudflare Web Analytics. Bots are not counted, one IP address can count at most 100 page views per 10 minutes, and at most 60 different pages and 100 referrers are kept per day (the rest count as `(other)`), so made-up hits can't fill the database.

`GET /api/analytics` returns `series` (per day: `own` and `cloudflare` `{ views, visits }`), `totals` (with `ownPrevious` for the period before), `breakdown` (`pages`, `referrers`, `devices`: `[{ key, own, cloudflare }]`) and `sources` (`own.since`, `cloudflare.status`: `ok`, `off` or `error`). Cloudflare is optional, see *Environment Variables*; `cloudflare` is `null` when it isn't connected. Cloudflare's days are UTC days.

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
CLOUDINARY_AVATAR_FOLDER=admin-avatars
# Optional: Cloudflare Web Analytics next to our own numbers (see docs/GO_LIVE.md)
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_SITE_TAG=
```

Use a separate database (and `CLOUDINARY_FOLDER=menu-pdfs-dev`, `CLOUDINARY_AVATAR_FOLDER=admin-avatars-dev`) locally, see [docs/LOCAL_TESTING.md](docs/LOCAL_TESTING.md).

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
