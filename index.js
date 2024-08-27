import { db } from "./firebase.js";
import {
	collection,
	doc,
	getDocs,
	getDoc,
	setDoc,
	query,
	where,
	updateDoc,
	deleteField,
} from "firebase/firestore";
import express from "express";

const app = express();
const PORT = 8080;

app.use(express.json());

app.listen(PORT, () =>
	console.log(`now listening on http://localhost:${PORT}`)
);

async function getRestaurantsByEndorsements(endorsements) {
	let q;

	if (endorsements && endorsements.length > 0) {
		const conditions = endorsements.map((endorsement) =>
			where(`endorsements.${endorsement}`, "==", true)
		);

		q = query(collection(db, "Restaurants"), ...conditions);
	} else {
		// If no endorsements are provided, retrieve all restaurants
		q = query(collection(db, "Restaurants"));
	}

	try {
		const restaurantDocs = await waitForDocsData(q);

		const data = [];
		restaurantDocs.forEach((doc) => {
			data.push(doc.data());
		});

		return data;
	} catch (error) {
		console.error("Error retrieving restaurants:", error);
		throw error;
	}
}

async function getAvailability(restaurantData, date, time, party) {
	const promises = restaurantData.map((data) =>
		processRestaurantData(data, date, time, party)
	);

	const results = await Promise.all(promises);
	console.log(results);
	return results.flat();
}

async function processRestaurantData(restaurantData, date, time, party) {
	const restaurantTimeSlotRef = doc(
		db,
		`Restaurants/${restaurantData.name}/${date}/${time}`
	);
	const availableRestaurants = await getAvailableTablesForRestaurant(
		restaurantTimeSlotRef
	);

	return availableRestaurants.map((data) => ({
		name: restaurantData.name,
		date: date,
		time: time,
		endorsements: restaurantData.endorsements,
		hours: restaurantData.hour,
		availableTables: filterAvailableTables(data, party.length),
		party: party,
	}));
}

async function getAvailableTablesForRestaurant(restaurantTimeSlotRef) {
	const restaurantTimeSlotDoc = await waitForData(restaurantTimeSlotRef);

	const availableRestaurants = [];
	Object.entries(restaurantTimeSlotDoc).forEach(([key, value]) => {
		if (key === "tables") {
			availableRestaurants.push({
				availableTables: value,
			});
		}
	});

	return availableRestaurants;
}

function filterAvailableTables(data, partySize) {
	const availableTables = [];

	if (partySize < 3) {
		if (data.availableTables.size2 > 0) {
			availableTables.push({
				tableSize: "size2",
				availability: data.availableTables.size2,
			});
		}
		if (data.availableTables.size4 > 0) {
			availableTables.push({
				tableSize: "size4",
				availability: data.availableTables.size4,
			});
		}
		if (data.availableTables.size6 > 0) {
			availableTables.push({
				tableSize: "size6",
				availability: data.availableTables.size6,
			});
		}
	} else if (partySize > 2 && partySize < 7) {
		if (data.availableTables.size4 > 0) {
			availableTables.push({
				tableSize: "size4",
				availability: data.availableTables.size4,
			});
		}
		if (data.availableTables.size6 > 0) {
			availableTables.push({
				tableSize: "size6",
				availability: data.availableTables.size6,
			});
		}
	} else if (partySize > 4 && partySize < 7) {
		if (data.availableTables.size6 > 0) {
			availableTables.push({
				tableSize: "size6",
				availability: data.availableTables.size6,
			});
		}
	}

	return availableTables;
}

async function waitForDocsData(ref, retries = 10, delay = 1000) {
	for (let i = 0; i < retries; i++) {
		try {
			const doc = await getDocs(ref);

			if (doc) return doc;
			console.warn(`Attempt ${i + 1}: Data not available yet.`);
		} catch (error) {
			console.error(`Error on attempt ${i + 1}:`, error);
		}
		await new Promise((resolve) => setTimeout(resolve, delay));
	}
	throw new Error("Max retries reached. Data still not available.");
}

async function waitForData(ref, retries = 10, delay = 1000) {
	for (let i = 0; i < retries; i++) {
		try {
			const doc = await getDoc(ref);
			const docData = doc.data();
			if (docData) return docData;
			console.warn(`Attempt ${i + 1}: Data not available yet.`);
		} catch (error) {
			console.error(`Error on attempt ${i + 1}:`, error);
		}
		await new Promise((resolve) => setTimeout(resolve, delay));
	}
	throw new Error("Max retries reached. Data still not available.");
}

app.get("/restaurants/available", async (req, res) => {
	// Destructure the request body to get the required parameters
	const { date, time, party } = req.body;

	try {
		async function getEndorsements() {
			const endorsements = new Set();
			// Create an array of promises for each diner
			for (const diner of party) {
				const dinerDoc = doc(db, `Diners/${diner}`);
				const dinerData = await waitForData(dinerDoc);

				// Add endorsements to the set
				if (dinerData["dietary-restrictions"].length > 0) {
					dinerData["dietary-restrictions"].forEach((endorsement) => {
						endorsements.add(endorsement);
					});
				}
			}

			return [...endorsements];
		}

		// Call the function to get endorsements
		const endorsements = await getEndorsements().catch((error) => {
			console.error("Error getting endorsements:", error);
		});

		const restaurantData = await getRestaurantsByEndorsements(endorsements);

		// Get the availability of tables in those restaurants
		const availableRestaurants = await getAvailability(
			restaurantData,
			date,
			time,
			party
		);

		// Send the response with the available restaurants
		res.status(200).send(availableRestaurants);
	} catch (error) {
		console.error(
			"Error occurred while retrieving restaurant availability:",
			error
		);
		res
			.status(500)
			.send({ error: "An error occurred while processing your request." });
	}
});

app.post("/reservations", async (req, res) => {
	// Destructure the request body to get the required parameters
	const { name, date, time, party, availableTables, hours } = req.body;
	const tableSize = availableTables[0]; // the first table size is used
	let id = null;

	let responseSent = false;
	let validationSuccessful = true;

	const sendResponse = (status, message) => {
		if (!responseSent) {
			responseSent = true;
			res.status(status).send(message);
		}
	};

	async function checkExistingReservations() {
		const partyPromises = party.map(async (diner) => {
			const dinerRef = doc(db, "Diners", diner);
			try {
				const dinerData = await waitForData(dinerRef);
				// console.log(Object.keys(dinerData.reservations).length);
				if (Object.keys(dinerData.reservations).length > 0) {
					for (const [reservationId, resData] of Object.entries(
						dinerData.reservations
					)) {
						if (resData.date === date) {
							const timeIndex = hours.indexOf(resData.time);
							let count = 4;
							let i = timeIndex;

							while (count > 0 && i >= 0) {
								if (hours[i] === time) {
									validationSuccessful = false;
									sendResponse(400, {
										error: "Reservation conflict",
										details:
											"The reservation time overlaps with an existing reservation.",
									});
									return;
								}
								count--;
								i--;
							}

							count = 4;
							i = timeIndex;

							while (count > 0 && i < hours.length) {
								if (hours[i] === time) {
									validationSuccessful = false;
									sendResponse(400, {
										error: "Reservation conflict",
										details:
											"The reservation time overlaps with an existing reservation.",
									});
									return;
								}
								count++;
								i++;
							}
						}
					}
				} else {
					return;
				}
			} catch (error) {
				console.error("Failed to get diner data:", error);
				validationSuccessful = false;
				if (!responseSent) {
					sendResponse(500, {
						error: "Internal server error",
						details: "Failed to retrieve diner data.",
					});
				}
			}
		});

		try {
			await Promise.all(partyPromises);
		} catch (error) {
			console.error("Error processing reservations:", error);
			validationSuccessful = false;
			if (!responseSent) {
				sendResponse(500, {
					error: "Internal server error",
					details: "An error occurred while checking reservations.",
				});
			}
		}
	}

	async function updateReservations() {
		if (!validationSuccessful) return;

		const restaurantRef = doc(db, "Restaurants", name, date, time);

		try {
			const restaurantData = await waitForData(restaurantRef);
			id = `${name}_${restaurantData.reservations.nextResId}`;

			const reservationData = {
				nextResId: restaurantData.reservations.nextResId + 1,
				[id]: {
					party,
					partySize: party.length,
					tableSize: tableSize.tableSize,
				},
			};

			await setDoc(
				restaurantRef,
				{ reservations: reservationData },
				{ merge: true }
			);

			const dinerPromises = party.map(async (diner) => {
				const dinerRef = doc(db, "Diners", diner);
				const dinerReservationData = {
					[id]: {
						date,
						id,
						restaurant: name,
						time,
					},
				};
				await setDoc(
					dinerRef,
					{ reservations: dinerReservationData },
					{ merge: true }
				);
			});

			await Promise.all(dinerPromises);

			return id;
		} catch (error) {
			console.error("Error updating reservations:", error);
			validationSuccessful = false;
			if (!responseSent) {
				sendResponse(500, {
					error: "Internal server error",
					details: "Failed to update reservations.",
				});
			}
		}
	}

	async function waitForTableData(restaurantRef, retries = 10, delay = 1000) {
		for (let i = 0; i < retries; i++) {
			try {
				const restaurantDoc = await getDoc(restaurantRef);
				const restaurantDocData = restaurantDoc.data();
				if (restaurantDocData && restaurantDocData.tables) {
					return restaurantDocData;
				}
				console.warn(`Attempt ${i + 1}: Data not available yet.`);
			} catch (error) {
				console.error(`Error on attempt ${i + 1}:`, error);
			}
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
		throw new Error("Max retries reached. Data still not available.");
	}

	async function updateTableSize(restaurantRef, tableSize) {
		if (!validationSuccessful) return;

		try {
			const restaurantData = await waitForTableData(restaurantRef);
			console.log(restaurantData);
			switch (tableSize) {
				case "size2":
					await setDoc(
						restaurantRef,
						{
							tables: { size2: restaurantData.tables.size2 - 1 },
							availableTables: restaurantData.availableTables - 1,
						},
						{ merge: true }
					);
					break;
				case "size4":
					await setDoc(
						restaurantRef,
						{
							tables: { size4: restaurantData.tables.size4 - 1 },
							availableTables: restaurantData.availableTables - 1,
						},
						{ merge: true }
					);
					break;
				case "size6":
					await setDoc(
						restaurantRef,
						{
							tables: { size6: restaurantData.tables.size6 - 1 },
							availableTables: restaurantData.availableTables - 1,
						},
						{ merge: true }
					);
					break;
				default:
					console.error("Unknown table size:", tableSize);
			}
		} catch (error) {
			console.error("Failed to update table size:", error);
			validationSuccessful = false;
			if (!responseSent) {
				sendResponse(500, {
					error: "Internal server error",
					details: "Failed to update table size.",
				});
			}
		}
	}

	async function updateOverlappingHours() {
		if (!validationSuccessful) return;

		const restaurantRef = doc(db, "Restaurants", name);
		const restaurantData = await waitForData(restaurantRef);

		const hours = restaurantData.hour;
		const startIndex = hours.indexOf(time);
		const overlapHours = hours.slice(startIndex);

		const updatePromises = overlapHours.slice(0, 4).map(async (hour) => {
			const hourRef = doc(db, "Restaurants", name, date, hour);
			await updateTableSize(hourRef, tableSize.tableSize);
		});

		try {
			await Promise.all(updatePromises);
		} catch (error) {
			console.error("Error updating overlapping hours:", error);
			validationSuccessful = false;
			if (!responseSent) {
				sendResponse(500, {
					error: "Internal server error",
					details: "Failed to update overlapping hours.",
				});
			}
		}
	}

	try {
		await checkExistingReservations();
		if (!validationSuccessful) return;

		const reservationId = await updateReservations();
		if (!validationSuccessful) return;

		await updateOverlappingHours();
		if (!validationSuccessful) return;

		if (!responseSent) {
			res.status(201).send({
				message: "Reservation created successfully",
				restaurant: name,
				date,
				time,
				party,
				reservationId, // Include reservationId in the response
			});
		}
	} catch (error) {
		console.error("Error processing reservation request:", error);
		if (!responseSent) {
			res.status(500).send({
				error: "Internal server error",
				details: "An unexpected error occurred.",
			});
		}
	}
});

app.delete("/reservations/:reservationId", async (req, res) => {
	const { name, date, time } = req.body;
	const { reservationId: resId } = req.params;

	let responseSent = false;
	const sendResponse = (status, message) => {
		if (!responseSent) {
			responseSent = true;
			res.status(status).send(message);
		}
	};

	async function updateTableSize(hourRef, restaurant, tableSize) {
		try {
			await setDoc(
				hourRef,
				{
					tables: { [tableSize]: restaurant.tables[tableSize] + 1 },
					availableTables: restaurant.availableTables + 1,
				},
				{ merge: true }
			);
		} catch (error) {
			console.error("Failed to update table size:", error);
			throw new Error("Failed to update table size.");
		}
	}

	async function updateOverlappingHours(
		restaurant,
		hours,
		time,
		name,
		date,
		tableSize
	) {
		const startIndex = hours.indexOf(time);
		const overlapHours = hours.slice(startIndex);

		const updatePromises = overlapHours.slice(0, 4).map(async (hour) => {
			const hourRef = doc(db, "Restaurants", name, date, hour);
			await updateTableSize(hourRef, restaurant, tableSize);
		});

		await Promise.all(updatePromises);
	}

	try {
		const restaurantRef = doc(db, "Restaurants", name, date, time);
		const restaurant = await waitForData(restaurantRef);
		const tableSize = restaurant.reservations[resId].tableSize;
		const party = restaurant.reservations[resId].party;

		// Update overlapping hours
		const restaurantData = await waitForData(doc(db, "Restaurants", name));
		await updateOverlappingHours(
			restaurant,
			restaurantData.hour,
			time,
			name,
			date,
			tableSize
		);

		// Delete reservation from restaurant
		const reservationFieldPath = `reservations.${resId}`;
		await updateDoc(
			restaurantRef,
			{ [reservationFieldPath]: deleteField() },
			{ merge: true }
		);

		// Delete reservation from diners
		const dinerPromises = party.map(async (diner) => {
			const dinerRef = doc(db, "Diners", diner);
			await updateDoc(
				dinerRef,
				{ [reservationFieldPath]: deleteField() },
				{ merge: true }
			);
		});
		await Promise.all(dinerPromises);

		if (!responseSent) {
			res.status(200).send({ message: "Reservation successfully deleted." });
		}
	} catch (error) {
		console.error("Error processing delete request:", error);
		if (!responseSent) {
			sendResponse(500, {
				error: "Internal server error",
				details: error.message,
			});
		}
	}
});

// app.get("/addData", (req, res) => {
// 	const rest = doc(db, "Restaurants/u.to.pi.a/2024-27-08/20:30");
// 	const data = {
// 		availableTables: 2,
// 		reservations: {
// 			nextResId: 0,
// 		},
// 		tables: {
// 			size2: 2,
// 			size4: 0,
// 			size6: 0,
// 		},
// 		time: "20:30",
// 	};

// 	// const data = {
// 	// 	endorsements: {
// 	// 		vegan: true,
// 	// 		vegetarian: true,
// 	// 	},
// 	// 	name: "u.to.pi.a",
// 	// 	hour: [
// 	// 		"17:00",
// 	// 		"17:30",
// 	// 		"18:00",
// 	// 		"18:30",
// 	// 		"19:00",
// 	// 		"19:30",
// 	// 		"20:00",
// 	// 		"20:30",
// 	// 	],
// 	// };

// 	setDoc(rest, data);

// 	res.send();
// });
