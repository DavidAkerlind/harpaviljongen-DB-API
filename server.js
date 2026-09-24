import express from 'express';
// Router import
import menuRouter from './routes/menuRouter.js';
import openingHoursRouter from './routes/openingHoursRouter.js';
import eventsRouter from './routes/eventRouter.js';
import authRouter from './routes/authRouter.js';
import wineListRouter from './routes/wineListRouter.js';
import menuPdfRouter from './routes/menuPdfRoutes.js';
import siteSettingsRouter from './routes/siteSettingsRouter.js';
import siteConfigRouter from './routes/siteConfigRouter.js';
import userRouter from './routes/userRouter.js';
import activityRouter from './routes/activityRouter.js';
// Config import
import dotenv from 'dotenv';
import mongoose from 'mongoose';
// Middlewares import
import { corsMiddleware } from './middlewares/corsConfig.js';
import logger from './middlewares/logger.js';
import errorHandler from './middlewares/errorHandler.js';
import { ensureUserRoles } from './services/userService.js';
import { ensureActivityIndexes } from './services/activityService.js';
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

// Render sits behind a proxy; needed so req.ip is the visitor (used by the login limiter)
app.set('trust proxy', 1);

// Middlewares
app.use(corsMiddleware);
app.options('/{*path}', corsMiddleware); // handle preflight for all routes (Express 5 syntax)
app.use(express.json());
app.use(logger);

// Swagger Documentation Route
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Routes
app.use('/api/menus', menuRouter);
app.use('/api/openingHours', openingHoursRouter);
app.use('/api/events', eventsRouter);
app.use('/api/auth', authRouter);
app.use('/api/wine-list', wineListRouter);
app.use('/api/menu-pdfs', menuPdfRouter);
app.use('/api/site-settings', siteSettingsRouter);
app.use('/api/site-config', siteConfigRouter);
app.use('/api/users', userRouter);
app.use('/api/activity', activityRouter);

// Health check for the admin's status view
app.get('/api/health', (req, res) => {
	const databaseUp = database.readyState === 1;
	res.status(databaseUp ? 200 : 503).json({
		status: databaseUp ? 200 : 503,
		success: databaseUp,
		message: databaseUp ? 'API and database are up' : 'Database is not connected',
		data: {
			api: 'up',
			database: databaseUp ? 'up' : 'down',
			uptimeSeconds: Math.round(process.uptime()),
		},
	});
});

// Felhantering av databas
database.on('error', (error) => console.log(error));

// DB EmitEvents
database.once('connected', async () => {
	console.log('DB Connected');
	try {
		const upgraded = await ensureUserRoles();
		if (upgraded) console.log(`Gave ${upgraded} existing user(s) the admin role`);
	} catch (error) {
		console.log('Could not give existing users a role:', error.message);
	}
	try {
		await ensureActivityIndexes();
	} catch (error) {
		console.log('Could not update the activity log indexes:', error.message);
	}
	// Start server
	app.listen(PORT, () => {
		console.log(`Server is running on port ${PORT}`);
	});
});

// ErrorHandler
app.use(errorHandler);
