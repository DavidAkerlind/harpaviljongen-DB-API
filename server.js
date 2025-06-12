import express from 'express';
// Router import
import menuRouter from './routes/menuRouter.js';
import openingHoursRouter from './routes/openingHoursRouter.js';
import eventsRouter from './routes/eventRouter.js';
import authRouter from './routes/authRouter.js';
import wineListRouter from './routes/wineListRouter.js';
// Config import
import dotenv from 'dotenv';
import mongoose from 'mongoose';
// Middlewares import
import { corsMiddleware } from './middlewares/corsConfig.js';
import logger from './middlewares/logger.js';
import errorHandler from './middlewares/errorHandler.js';
// Swagger import
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

// Config
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.CONNECTION_STRING);
const database = mongoose.connection;
const swaggerDocs = YAML.load('./docs/docs.yml');

// Middlewares
app.use(express.json());
app.use(corsMiddleware);
app.use(logger);

// Swagger Documentation Route
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Routes
app.use('/api/menus', menuRouter);
app.use('/api/openingHours', openingHoursRouter);
app.use('/api/events', eventsRouter);
app.use('/api/auth', authRouter);
app.use('/api/wine-list', wineListRouter);

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

// ErrorHandler
app.use(errorHandler);
