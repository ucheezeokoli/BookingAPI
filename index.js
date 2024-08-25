import { db } from "./firebase.js";
import {
	collection,
	doc,
	getDocs,
	setDoc,
	query,
	where,
} from "firebase/firestore";
import express from "express";

const app = express();
const PORT = 8080;

app.listen(PORT, () => console.log(`it's alive on http://localhost:${PORT}`));

app.get("/test", async (req, res) => {
	const q = query(
		collection(db, "Restaurants"),
		where(
			"endorsements.Gluten-Free",
			"==",
			true,
			"&&",
			"endorsements.Vegetarian",
			"==",
			false
		)
	);

	const q1 = await getDocs(q);

	var data = [];

	q1.forEach((doc) => {
		console.log(doc.id, " => ", doc.data());
		data.push(doc.data());
	});

	res.send(data);
});
