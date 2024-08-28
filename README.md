# Restaurant Booking API Documentation

## Overview

The BookingAPI is a Node.js-based API designed to manage restaurant reservations. It allows users to check the availability of restaurants, create reservations, and delete existing reservations.

## Endpoints

### 1. Get Available Restaurants

**Endpoint:** `GET /restaurants/available`

**Description:** Retrieves available restaurants based on the specified date, time, and party size.

**Request Body:**

```json
{
	"date" : "2024-27-08",
	"time" : "17:00",
	"party": [ "Gob", "Lucile"]
}
```

**Response:**

```json
[
	{
		"name": "Tetetlán",
		"date": "2024-27-08",
		"time": "17:00",
		"endorsements": {
			"gluten-free": true,
			"paleo": true
		},
		"hours": [
			"17:00",
			"17:30",
			"18:00",
			"18:30",
			"19:00",
			"19:30",
			"20:00",
			"20:30"
		],
		"availableTables": [
			{
				"tableSize": "size2",
				"availability": 4
			},
			{
				"tableSize": "size4",
				"availability": 2
			},
			{
				"tableSize": "size6",
				"availability": 1
			}
		],
		"party": [
			"Gob",
			"Lucile"
		]
	}
]
```

### 2. Create a Reservation

**Endpoint:** `POST /reservations`

**Description:** Creates a reservation for a specified restaurant.

**Request Body:**

```json
{
	"name": "Tetetlán",
	"date": "2024-27-08",
	"time": "17:00",
	"endorsements": {
		"gluten-free": true,
		"paleo": true
	},
	"hours": [
		"17:00",
		"17:30",
		"18:00",
		"18:30",
		"19:00",
		"19:30",
		"20:00",
		"20:30"
	],
	"availableTables": [
		{
			"tableSize": "size2",
			"availability": 4
		},
		{
			"tableSize": "size4",
			"availability": 2
		},
		{
			"tableSize": "size6",
			"availability": 1
		}
	],
	"party": [
		"Gob",
		"Lucile"
	]
}
```

**Response:**

```json
{
	"message": "Reservation created successfully",
	"restaurant": "Tetetlán",
	"date": "2024-27-08",
	"time": "17:00",
	"party": [
		"Gob",
		"Lucile"
	],
	"reservationId": "Tetetlán_0"
}
```

### 3. Delete a Reservation

**Endpoint:** `DELETE /reservations/:reservationId`

**Description:** Deletes a specified reservation.

**Request Body:**

```json
{
	"name": "Tetetlán",
	"date": "2024-27-08",
	"time": "17:00"
}
```

**Response:**

```json
{
	"message": "Reservation successfully deleted."
}
```

## Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/ucheezeokoli/BookingAPI.git
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Start the server:

    ```bash
    npm start
    ```

## Environment Variables

- `PORT`: The port on which the API server will run (default is 3000).
- `DATABASE_URL`: The connection string for the Firestore database.

## License

This project is licensed under the MIT License.

---

This documentation provides clear guidance on how to interact with the API, including example requests and responses for the main endpoints.
