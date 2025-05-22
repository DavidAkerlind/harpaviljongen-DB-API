export default function errorHandler(error, req, res, next) {
	console.log(error);
	res.status(error.status).json({ success: false, message: error.message });
}
