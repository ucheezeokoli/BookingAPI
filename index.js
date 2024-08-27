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

app.listen(PORT, () => console.log(`it's alive on http://localhost:${PORT}`));

app.get("/test", async (req, res) => {
	const endo = ["test"];
	const date = "2024-08-26";
	const time = "17:00";
	const group = ["juan", "mike"];

	var q = null;

	switch (endo.length) {
		case 1:
			q = query(
				collection(db, "Restaurants"),
				where(`endorsements.${endo[0]}`, "==", true)
				// where(`time-slots.${date}`, "==", date),
				// where(`time-slots.${time}`, "==", "17:30"),
				// where(`time-slots.${tableSize}`, ">=", 6),
				// where(`time-slots.${available}`, ">", 0)
			);
			break;
		case 2:
			// console.log(group.length);
			q = query(
				collection(db, "Restaurants"),
				where(`endorsements.${endo[0]}`, "==", true),
				where(`endorsements.${endo[1]}`, "==", true)
				// where("time-slots.date", "==", date)
				// where("time-slots.time", "==", time),
				// where("time-slots.tableSize", ">=", group.length),
				// where("time-slots.available", ">", 0)
			);
			break;
		case 3:
			q = query(
				collection(db, "Restaurants"),
				where(`endorsements.${endo[0]}`, "==", true),
				where(`endorsements.${endo[1]}`, "==", true),
				where(`endorsements.${endo[2]}`, "==", true)
			);
			break;
		case 4:
			q = query(
				collection(db, "Restaurants"),
				where(`endorsements.${endo[0]}`, "==", true),
				where(`endorsements.${endo[1]}`, "==", true),
				where(`endorsements.${endo[2]}`, "==", true),
				where(`endorsements.${endo[3]}`, "==", true)
			);
		default:
	}

	const restaurants = await getDocs(q);

	var data = [];
	var restIds = [];

	restaurants.forEach((doc) => {
		// console.log(doc.id, " => ", doc.data());
		data.push(doc.data());
		restIds.push(doc.id);
	});

	const endorsements = data.endorsements;
	// console.log(data);

	const newAvail = [];

	const promises = data.map(async (data) => {
		const restIdRef = collection(db, `Restaurants/${data.name}/${date}`); // check if collection exists

		const availability = query(
			restIdRef,
			where("availableTables", ">", 0),
			where("time", "==", time)
		);

		const tables = await getDocs(availability);
		const availRests = [];
		tables.forEach((doc) => {
			// console.log("tables", "=>", doc.data());
			const availTables = doc.data().tables;
			const time = doc.data().time;
			const restData = {
				name: data.name,
				date: date,
				time: time,
				endorsements: data.endorsements,
				hours: data.hours,
				availTables,
			};
			availRests.push(restData);
		});

		// console.log("availRests", "=>", availRests);

		availRests.forEach((data) => {
			console.log(availRests);
			const availableTables = [];
			if (group.length < 3) {
				if (data.availTables.size2 > 0) {
					availableTables.push({
						tableSize: "size2",
						availability: data.availTables.size2,
					});
				}
				if (data.availTables.size4 > 0) {
					availableTables.push({
						tableSize: "size4",
						availability: data.availTables.size4,
					});
				}
				if (data.availTables.size6 > 0) {
					availableTables.push({
						tableSize: "size6",
						availability: data.availTables.size6,
					});
				}
			}
			if (group.length > 2 && group.length < 7) {
				if (data.availTables.size4 > 0) {
					availableTables.push({
						tableSize: "size4",
						availability: data.availTables.size4,
					});
				}
				if (data.availTables.size6 > 0) {
					availableTables.push({
						tableSize: "size6",
						availability: data.availTables.size6,
					});
				}
			}
			if (group.length > 4 && group.length < 7) {
				if (data.availTables.size6 > 0) {
					availableTables.push({
						tableSize: "size6",
						availability: data.availTables.size6,
					});
				}
			}
			newAvail.push({
				name: data.name,
				date: data.date,
				time: data.time,
				endorsements: data.endorsements,
				hours: data.hours,
				availableTables: availableTables,
			});
			// console.log(newAvail);
		});
	});

	await Promise.all(promises);
	res.send(newAvail);
	// console.log(availRests);
});

app.post("/createRes", async (req, res) => {
	// set Data
	const data = {
		name: req.body.name,
		date: req.body.date,
		time: req.body.time,
		party: req.body.party,
		tableSize: req.body.availableTables[0],
		hours: req.body.hours,
	};

	data.party.map((diner) => {
		var dinerRef = doc(db, "Diners", diner);

		// Verify that the Diners do not have overlapping reservations
		getDoc(dinerRef).then(async (diner) => {
			if (Object.keys(diner.data().reservations).length > 0) {
				// console.log(diner.data());
				Object.entries(diner.data().reservations).map(([id, resData]) => {
					console.log(id, "=>", resData);
					if (resData.date == data.date) {
						const timeIndex = data.hours.indexOf(resData.time);
						var count = 4;
						var i = timeIndex;
						console.log(data.hours[i], data.time);
						while (count > 0 && i >= 0) {
							// console.log(data.hours[i], data.time);
							if (data.hours[i] == data.time) {
								res
									.status(400)
									.send("Can only book on reservation every 2 hours");
							}
							count--;
							i--;
						}
						count = 4;
						i = timeIndex;
						// console.log(timeIndex);
						while (count > 0 && i <= data.hours.length) {
							// console.log(data.hours[i], data.time);
							if (data.hours[i] == data.time) {
								console.log(data.hours[i], data.time);
								res
									.status(400)
									.send("Can only book on reservation every 2 hours");
							}
							count++;
							i++;
						}
					}
				});
			}
		});
	});

	// retrieve table at time
	var restaurantRef = doc(db, "Restaurants", data.name, data.date, data.time);

	var restaurantDoc = await getDoc(restaurantRef);

	if (restaurantDoc.exists()) {
		// console.log(restaurantDoc.data());
	} else {
		console.log("no such document");
	}

	const id = restaurantDoc.data().reservations.nextResId;

	const reservationData = {
		nextResId: id + 1,
		[id]: {
			party: data.party,
			partySize: data.party.length,
			tableSize: data.tableSize.tableSize,
		},
	};

	// update reservation
	setDoc(restaurantRef, { reservations: reservationData }, { merge: true });

	// update diners reservations
	data.party.map((diner) => {
		var dinerRef = doc(db, "Diners", diner);

		const dinerReservationData = {
			[id]: {
				date: data.date,
				id: id,
				restaurant: data.name,
				time: data.time,
			},
		};

		setDoc(dinerRef, { reservations: dinerReservationData }, { merge: true });
		// getDoc(dinerRef).then((diner) => {
		// 	diner.data().reservations.push({
		// 		date: data.date,
		// 		id: id,
		// 		restaurant: data.name,
		// 		time: data.time,
		// 	});
		// });
	});

	// UPDATE THE OTHER HOURS

	//GET RESTAURANT DOC
	restaurantRef = doc(db, "Restaurants", data.name);
	restaurantDoc = await getDoc(restaurantRef);

	if (restaurantDoc.exists()) {
		// console.log(restaurantDoc.data());
	} else {
		console.log("no such document");
	}

	const hours = restaurantDoc.data().hours;
	const startIndex = hours.indexOf(data.time);
	const overlapHours = hours.slice(startIndex);

	for (var i = 0; i < 4; i++) {
		const restaurantRef = doc(
			db,
			"Restaurants",
			data.name,
			data.date,
			overlapHours[i]
		);
		getDoc(restaurantRef).then(async (restaurantDoc) => {
			// console.log(restaurantDoc.data());
			console.log(data.tableSize.tableSize);

			switch (data.tableSize.tableSize) {
				case "size2":
					await setDoc(
						restaurantRef,
						{ tables: { size2: restaurantDoc.data().tables.size2 - 1 } },
						{ merge: true }
					);
					break;
				case "size4":
					await setDoc(
						restaurantRef,
						{ tables: { size4: restaurantDoc.data().tables.size4 - 1 } },
						{ merge: true }
					);
					break;
				case "size6":
					await setDoc(
						restaurantRef,
						{ tables: { size6: restaurantDoc.data().tables.size6 - 1 } },
						{ merge: true }
					);
					break;
			}
		});
	}

	res.send(req.body);
});

app.post("/deleteRes", async (req, res) => {
	// set Data
	const data = {
		name: req.body.name,
		date: req.body.date,
		time: req.body.time,
		resId: req.body.resId,
	};

	// retrieve table at time
	const restaurantRef = doc(db, "Restaurants", data.name, data.date, data.time);

	const party = await getDoc(restaurantRef).then((restaurant) => {
		console.log(restaurant.data().reservations[data.resId].party);
		return restaurant.data().reservations[data.resId].party;
	});

	const reservationFieldPath = `reservations.${data.resId}`;
	updateDoc(
		restaurantRef,
		{ [reservationFieldPath]: deleteField() },
		{ merge: true }
	);

	party.map((diner) => {
		const dinerRef = doc(db, "Diners", diner);

		const reservationFieldPath = `reservations.${data.resId}`;
		updateDoc(
			dinerRef,
			{ [reservationFieldPath]: deleteField() },
			{ merge: true }
		);
	});

	res.send();

	// getDoc(restaurantRef).then((restaurant) => {
	// 	restaurant.data().reservations;
	// });
});

app.get("/time", (req, res) => {
	const rest = doc(db, "Restaurants/template2/2024-08-26/17:00");
	const data = {
		availableTables: 5,
		reservations: {
			nextResId: 0,
		},
		tables: {
			size2: 1,
			size4: 2,
			size6: 2,
		},
		time: "17:00",
	};
	setDoc(rest, data);

	// const data = {
	// 	"time-slots": {
	// 		"2024-08-26": {
	// 			"17:00": {
	// 				date: "2024-08-26",
	// 				time: "17:00",
	// 				tables: [
	// 					{
	// 						tableSize: 2,
	// 						available: 4,
	// 					},
	// 					{
	// 						tableSize: 4,
	// 						available: 2,
	// 					},
	// 					{
	// 						tableSize: 6,
	// 						available: 1,
	// 					},
	// 				],
	// 			},
	// 			"17:30": {
	// 				date: "2024-08-26",
	// 				time: "17:30",
	// 				tables: [
	// 					{
	// 						tableSize: 2,
	// 						available: 4,
	// 					},
	// 					{
	// 						tableSize: 4,
	// 						available: 2,
	// 					},
	// 					{
	// 						tableSize: 6,
	// 						available: 1,
	// 					},
	// 				],
	// 			},
	// 			"18:00": {
	// 				date: "2024-08-26",
	// 				time: "18:00",
	// 				tables: [
	// 					{
	// 						tableSize: 2,
	// 						available: 4,
	// 					},
	// 					{
	// 						tableSize: 4,
	// 						available: 2,
	// 					},
	// 					{
	// 						tableSize: 6,
	// 						available: 1,
	// 					},
	// 				],
	// 			},
	// 			"18:30": {
	// 				date: "2024-08-26",
	// 				time: "18:30",
	// 				tables: [
	// 					{
	// 						tableSize: 2,
	// 						available: 4,
	// 					},
	// 					{
	// 						tableSize: 4,
	// 						available: 2,
	// 					},
	// 					{
	// 						tableSize: 6,
	// 						available: 1,
	// 					},
	// 				],
	// 			},
	// 			"19:00": {
	// 				date: "2024-08-26",
	// 				time: "19:00",
	// 				tables: [
	// 					{
	// 						tableSize: 2,
	// 						available: 4,
	// 					},
	// 					{
	// 						tableSize: 4,
	// 						available: 2,
	// 					},
	// 					{
	// 						tableSize: 6,
	// 						available: 1,
	// 					},
	// 				],
	// 			},
	// 			"19:30": {
	// 				date: "2024-08-26",
	// 				time: "19:30",
	// 				tables: [
	// 					{
	// 						tableSize: 2,
	// 						available: 4,
	// 					},
	// 					{
	// 						tableSize: 4,
	// 						available: 2,
	// 					},
	// 					{
	// 						tableSize: 6,
	// 						available: 1,
	// 					},
	// 				],
	// 			},
	// 			"20:00": {
	// 				date: "2024-08-26",
	// 				time: "20:00",
	// 				tables: [
	// 					{
	// 						tableSize: 2,
	// 						available: 4,
	// 					},
	// 					{
	// 						tableSize: 4,
	// 						available: 2,
	// 					},
	// 					{
	// 						tableSize: 6,
	// 						available: 1,
	// 					},
	// 				],
	// 			},
	// 			"20:30": {
	// 				date: "2024-08-26",
	// 				time: "20:30",
	// 				tables: [
	// 					{
	// 						tableSize: 2,
	// 						available: 4,
	// 					},
	// 					{
	// 						tableSize: 4,
	// 						available: 2,
	// 					},
	// 					{
	// 						tableSize: 6,
	// 						available: 1,
	// 					},
	// 				],
	// 			},
	// 		},
	// 	},
	// };

	res.send();
});

app.get("/resy", (req, res) => {
	const diners = getDocs;
});

// DELETE RESERVATION
// updateDoc(rest, { "reservations.0": deleteField() }, { merge: true });

// // 0: {
//     party: ["John", "Jane"],
//     partySize: 2,
//     tableSize: 2,
// },
