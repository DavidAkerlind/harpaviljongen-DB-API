import cors from 'cors';

export const allowedOrigins = [
	'https://harpaviljongen.com', // Production URL (no www)
	'https://www.harpaviljongen.com', // Production URL
	'https://harpaviljongen.pages.dev', // Cloudflare Pages URL
	'http://localhost:7000', // Local dev URL
	'http://localhost:5173', // Local dev URL
	'http://localhost:5174', // Local dev URL
	'http://localhost:5175', // Local dev URL
	'http://localhost:4173', // Local vite preview
	'http://localhost:4174', // Local vite preview
	'https://admin.harpaviljongen.com', // Admin Service URL (Cloudflare Pages)
	'https://davidakerlind.github.io', // Old Admin Service URL (GitHub Pages)
];

// Cloudflare Pages and their preview deploys, e.g. https://<branch>.harpaviljongen.pages.dev
// and https://<branch>.harpaviljongen-admin-service.pages.dev (the admin's Pages project)
const allowedOriginPatterns = [
	/^https:\/\/([a-z0-9-]+\.)?harpaviljongen(-admin|-admin-service)?\.pages\.dev$/,
];

const isAllowedOrigin = (origin) =>
	allowedOrigins.includes(origin) ||
	allowedOriginPatterns.some((pattern) => pattern.test(origin));

export const corsMiddleware = cors({
	origin: function (origin, callback) {
		// Om det är en direkt curl / Postman / serveranrop utan origin, tillåt
		if (!origin) return callback(null, true);

		if (isAllowedOrigin(origin)) {
			return callback(null, true);
		} else {
			return callback(new Error('Not allowed by CORS'));
		}
	},
	credentials: true, // This is crucial for handling credentials
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization'],
});
