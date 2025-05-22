import express from 'express';
import menuRouter from './routes/menuRouter.js';
import openingHoursRouter from './routes/openingHoursRouter.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
// Middlewares Import
import { corsMiddleware } from './middlewares/corsConfig.js';
import logger from './middlewares/logger.js';
import errorHandler from './middlewares/errorHandler.js';
// Config
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.CONNECTION_STRING);
const database = mongoose.connection;

// Middlewares
app.use(express.json());
app.use(corsMiddleware);
app.use(logger);

// Routes
app.use('/api/menus', menuRouter);
app.use('/api/openingHours', openingHoursRouter);

// Felhantering av databas
database.on('error', (error) => console.log(error));

// DB EmitEvents
database.once('connected', () => {
	console.log('DB Connected');
	// Start server
	app.listen(PORT, () => {
		console.log(`Server is running on port ${PORT}`);
	});
});
