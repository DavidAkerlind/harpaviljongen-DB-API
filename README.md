# Harpaviljongen API Documentation

## Table of Contents

1. [Base URL](#base-url)
2. [Authentication](#authentication)
3. [Common Response Format](#common-response-format)
4. [Endpoints](#endpoints)
    - [Menus](#menus)
    - [Opening Hours](#opening-hours)
    - [Events](#events)
5. [Models](#models)
6. [Error Handling](#error-handling)
7. [CORS](#cors)
8. [Utils](#utils)

## Base URL

Production: `https://harpaviljongen-db-api.onrender.com/api`
Development: `http://localhost:7000/api`

## Authentication

Currently no authentication required.

## Common Response Format

```json
{
    "status": number,    // HTTP status code
    "message": string,   // Response message
    "success": boolean,  // Operation success status
    "data": any         // Response data (optional)
}
```

## Endpoints

### Menus

#### Get All Menus

```http
GET /menus
```

#### Search Menu Items

```http
GET /menus/search/items?query={searchTerm}
```

#### Get Menu by ID

```http
GET /menus/{menuId}
```

#### Create Menu

```http
POST /menus
Content-Type: application/json

{
    "id": "menu-new",
    "title": "NEW MENU",
    "type": "all",
    "items": []
}
```

#### Add Menu Item

```http
POST /menus/{menuId}/items
Content-Type: application/json

{
    "title": "New Dish",
    "description": "Description",
    "price": 100,
    "producer": "Producer Name" // Only for wine menu
}
```

### Opening Hours

#### Get All Opening Hours

```http
GET /openingHours
```

#### Create Opening Hours

```http
POST /openingHours
Content-Type: application/json

{
    "day": "Måndag",
    "hours": {
        "from": "11:00",
        "to": "22:00"
    }
}
```

#### Update Opening Hours

```http
PUT /openingHours/day/{day}
Content-Type: application/json

{
    "hours": {
        "from": "10:00",
        "to": "23:00"
    }
}
```

Valid days: `["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag", "Söndag"]`

### Events

#### Get All Events

```http
GET /events
```

#### Get Future Events

```http
GET /events/future
```

#### Create Event

```http
POST /events
Content-Type: application/json

{
    "title": "Event Title",
    "shortDescription": "Brief description (max 100 chars)",
    "longDescription": "Detailed description",
    "date": "2025-06-14",
    "startTime": "20:00",
    "endTime": "01:00",
    "type": "dj",
    "image": "/src/assets/pictures/event.png"
}
```

Valid event types: `["dj", "wine", "private", "other"]`

## Models

### Menu Model

```typescript
{
    id: string;
    title: string;
    description?: string;
    type: string;
    items: {
        id: string;
        active: boolean;
        title: string;
        description?: string;
        price: number | string;
        producer?: string; // Only for wine menu
    }[];
    createdAt: string;
    updatedAt: string;
}
```

### OpeningHours Model

```typescript
{
	day: string; // One of valid Swedish weekdays
	hours: {
		from: string; // Format: "HH:mm"
		to: string; // Format: "HH:mm"
	}
	createdAt: string;
	updatedAt: string;
}
```

### Event Model

```typescript
{
	title: string;
	shortDescription: string; // Max 100 characters
	longDescription: string;
	date: string; // Format: "YYYY-MM-DD"
	startTime: string; // Format: "HH:mm"
	endTime: string; // Format: "HH:mm"
	type: 'dj' | 'wine' | 'private' | 'other';
	image: string;
	createdAt: string;
	updatedAt: string;
}
```

## Error Handling

All endpoints return appropriate HTTP status codes:

-   200: Success
-   201: Created
-   400: Bad Request
-   404: Not Found
-   500: Server Error

Error response format:

```json
{
    "status": number,
    "message": string,
    "success": false
}
```

## CORS

Allowed origins:

-   https://www.davidakerlind.com
-   http://localhost:7000
-   http://localhost:5173
-   https://davidakerlind.github.io

## Utils

### Time Formatting

All timestamps are automatically converted to Swedish time format using the `formatSwedishTime` utility.

### Response Construction

All responses are constructed using the `constructResObj` utility to ensure consistent response format.

## Development

### Environment Variables

Required variables in `.env`:

```
PORT=7000
CONNECTION_STRING=mongodb+srv://[username]:[password]@[cluster].mongodb.net/[database]
```

### Running Locally

1. Clone repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Start server: `npm run dev`

### Testing API

You can test endpoints using tools like Postman or cURL. Example:

```bash
# Get all menus
curl http://localhost:7000/api/menus

# Create new event
curl -X POST http://localhost:7000/api/events ^
-H "Content-Type: application/json" ^
-d "{\"title\":\"Test Event\",\"shortDescription\":\"Short desc\",\"longDescription\":\"Long desc\",\"date\":\"2025-06-14\",\"startTime\":\"20:00\",\"endTime\":\"01:00\",\"type\":\"dj\"}"
```
