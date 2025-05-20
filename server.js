import express from 'express';
import menuRouter from './routes/menuRouter.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';

// Config
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.CONNECTION_STRING);
const database = mongoose.connection;
const allowedOrigins = [
	'https://www.davidakerlind.com', // Production URL
	'http://localhost:7000', // Local dev URL
];

// Middlewares
app.use(express.json());
app.use(
	cors({
		origin: function (origin, callback) {
			// Om det är en direkt curl / Postman / serveranrop utan origin, tillåt
			if (!origin) return callback(null, true);

			if (allowedOrigins.includes(origin)) {
				return callback(null, true);
			} else {
				return callback(new Error('Not allowed by CORS'));
			}
		},
	})
);

// Routes
app.use('/api/menus', menuRouter);

// Felhantering av databas
database.on('error', (error) => console.log(error));

// Start Sequence
database.once('connected', () => {
	console.log('DB Connected');
	app.listen(PORT, () => {
		console.log(`Server is running on port ${PORT}`);
	});
});
