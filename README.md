# Harpaviljongen API Documentation

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

-   Menus (food, drinks, wine)
-   Opening hours
-   Events and activities

### Base URLs

-   Production: `https://harpaviljongen-db-api.onrender.com/api`
-   Development: `http://localhost:7000/api`

## API Configuration

### CORS Configuration

```typescript
interface CorsConfig {
	allowedOrigins: string[]; // Allowed domains
	credentials: boolean; // Always false
}

const allowedOrigins = [
	'https://www.davidakerlind.com',
	'http://localhost:7000',
	'http://localhost:5173',
	'https://davidakerlind.github.io',
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
    "username": string,  // Minimum 6 characters
    "password": string   // Minimum 8 characters
}
Response: {
    "success": boolean,
    "message": string
}
```

#### Logout

```http
GET /api/auth/logout
Response: ApiResponse<null>
```

### User Model

```typescript
interface User {
	username: string; // Unique, min 6 chars
	password: string; // Min 8 chars
	userId: string; // Unique identifier
}
```

### Authentication Flow

1. User makes POST request to `/api/auth/login` with credentials
2. If credentials are valid, server sets global user state
3. User remains authenticated until:
    - Logout is called
    - Server restarts
    - Session expires

### Example Login Request

```bash
curl -X POST http://localhost:7000/api/auth/login ^
-H "Content-Type: application/json" ^
-d "{\"username\":\"adminuser\",\"password\":\"password123\"}"
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

#### Failed Login

```json
{
	"status": 400,
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

// ...existing code...

## Error Handling

### HTTP Status Codes

-   200: Success
-   201: Created
-   400: Bad Request
-   404: Not Found
-   500: Server Error

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

-   Node.js 18+
-   MongoDB 5+
-   npm or yarn
-   Valid user credentials for authenticated routes

### Environment Variables

Create a `.env` file:

```env
PORT=7000
CONNECTION_STRING=mongodb+srv://[username]:[password]@[cluster].mongodb.net/[database]
```

### Installation

```bash
git clone https://github.com/yourusername/harpaviljongen-DB-API.git
cd harpaviljongen-DB-API
npm install
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
