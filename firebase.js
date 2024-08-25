import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
	apiKey: "AIzaSyCfciyw1874dbq5ytX9JM_R11oy2RhcCEI",

	authDomain: "bookingapi-80697.firebaseapp.com",

	projectId: "bookingapi-80697",

	storageBucket: "bookingapi-80697.appspot.com",

	messagingSenderId: "910454834231",

	appId: "1:910454834231:web:18660665e2bcbfd1006bb2",

	measurementId: "G-YD4MGZSLKR",
};

const firebaseApp = initializeApp(firebaseConfig);

const db = getFirestore(firebaseApp);

export { db };
