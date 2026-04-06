import mongoose from 'mongoose';

const MenuPdfSchema = new mongoose.Schema({
	type: {
		type: String,
		enum: ['food', 'wine', 'lunch', 'drinks'],
		required: true,
	},
	url: {
		type: String,
		required: true,
	},
	publicId: {
		type: String,
		required: true,
	},
	uploadedAt: {
		type: Date,
		default: Date.now,
	},
	isActive: {
		type: Boolean,
		default: true,
	},
});

export default mongoose.model('MenuPdf', MenuPdfSchema);
