import express from 'express';
import menuRouter from './routes/menuRouter.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Config
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.CONNECTION_STRING);
const database = mongoose.connection;

// Middlewares
app.use(express.json());

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
