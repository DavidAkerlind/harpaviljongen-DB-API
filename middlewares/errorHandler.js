export default function errorHandler(error, req, res, next) {
	console.log(error);
	const statusCode = typeof error.status === 'number' ? error.status : 500;
	res.status(statusCode).json({
		success: false,
		message: error.message || 'Internal server error',
	});
}
