import cors from 'cors';

export const allowedOrigins = [
	'https://www.harpaviljongen.com', // Production URL
	'http://localhost:7000', // Local dev URL
	'http://localhost:5173', // Local dev URL
	'http://localhost:5174', // Local dev URL
	'http://localhost:5175', // Local dev URL
	'https://davidakerlind.github.io', // Admin Service URL
];

export const corsMiddleware = cors({
	origin: function (origin, callback) {
		// Om det är en direkt curl / Postman / serveranrop utan origin, tillåt
		if (!origin) return callback(null, true);

		if (allowedOrigins.includes(origin)) {
			return callback(null, true);
		} else {
			return callback(new Error('Not allowed by CORS'));
		}
	},
	credentials: true, // This is crucial for handling credentials
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization'],
});
