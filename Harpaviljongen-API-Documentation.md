# Harpaviljongen API Documentation

## Base URL

```
https://harpaviljongen-db-api.onrender.com/api/menus
```

## Endpoints

### GET Requests

#### Get All Menus

```http
GET /
```

Returns all menus in the database.

**Response**

```json
{
	"status": 200,
	"message": "Request for all menus successful",
	"success": true,
	"data": [
		/* array of menu objects */
	]
}
```

#### Search Menu Items

```http
GET /search/items?query=skagen
```

Searches through all menu items' titles and descriptions.

**Response**

```json
{
	"status": 200,
	"message": "Found 1 items matching: \"skagen\"",
	"success": true,
	"data": [
		{
			"menuId": "menu-always",
			"menuTitle": "ALLTID PÅ MENYN",
			"items": [
				/* matching items */
			]
		}
	]
}
```

#### Get Menu by ID

```http
GET /:menuId
```

Returns a specific menu by its ID.

**Response**

```json
{
	"status": 200,
	"message": "Request for menu with id:menu-always successful",
	"success": true,
	"data": {
		/* menu object */
	}
}
```

#### Get Items in Menu

```http
GET /:menuId/items
```

Returns all items in a specific menu.

**Response**

```json
{
	"status": 200,
	"message": "Items in menu:menu-always retrieved successfully",
	"success": true,
	"data": [
		/* array of menu items */
	]
}
```

### POST Requests

#### Create New Menu

```http
POST /
Content-Type: application/json

{
    "id": "menu-new",
    "title": "NEW MENU",
    "type": "all",
    "items": []
}
```

Creates a new menu.

#### Bulk Insert Menus

```http
POST /bulk
Content-Type: application/json

[/* array of menu objects */]
```

Inserts multiple menus at once.

#### Add Menu Item

```http
POST /:menuId/items
Content-Type: application/json

{
    "title": "New Dish",
    "description": "Description",
    "price": 100
}
```

Adds a new item to a specific menu.

### PUT Requests

#### Update Menu Field

```http
PUT /:menuId/:field
Content-Type: application/json

{
    "value": "New Value"
}
```

Updates a specific field in a menu. Allowed fields: 'title', 'description', 'price', 'type'

#### Update Menu Item Field

```http
PUT /:menuId/items/:itemId/:field
Content-Type: application/json

{
    "value": "New Value"
}
```

Updates a specific field in a menu item. Allowed fields: 'title', 'description', 'price'

### PATCH Requests

#### Toggle Menu Item Active Status

```http
PATCH /:menuId/items/:itemId/toggle
```

Toggles the active status of a menu item.

### DELETE Requests

#### Delete Menu

```http
DELETE /:menuId
```

Deletes a specific menu.

#### Delete Menu Item

```http
DELETE /:menuId/items/:itemId
```

Deletes a specific item from a menu.

#### Delete All Menus

```http
DELETE /
```

Deletes all menus from the database.

## Error Responses

All endpoints return error responses in this format:

```json
{
    "status": <error_code>,
    "message": "<error_message>",
    "success": false,
    "data": null
}
```

Common error codes:

-   400: Bad Request
-   404: Not Found
-   500: Server Error

## Data Models

### Menu Object

```json
{
	"id": "menu-always",
	"title": "ALLTID PÅ MENYN",
	"description": "",
	"type": "all",
	"items": [
		/* array of menu items */
	]
}
```

### Menu Item Object

```json
{
	"id": "uuid",
	"active": true,
	"title": "Dish Name",
	"description": "Dish Description",
	"price": 100,
	"producer": "Producer Name" // Only for wine menu
}
```

## Notes

-   All IDs are generated automatically using UUID v4 (8 characters)
-   The wine menu items have an additional 'producer' field
-   Items are automatically set to active when created
-   All timestamps are in Swedish time format
