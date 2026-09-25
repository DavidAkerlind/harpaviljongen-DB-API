import mongoose from 'mongoose';

const MenuPdfSchema = new mongoose.Schema({
	// The menu it belongs to (MenuList.type), e.g. 'food', 'wine' or 'lunchmeny'
	type: {
		type: String,
		required: true,
	},
	// Namn som visas i admin, t.ex. "Höstmeny 2026"
	title: {
		type: String,
		trim: true,
		maxLength: 100,
	},
	originalName: {
		type: String,
	},
	bytes: {
		type: Number,
	},
	url: {
		type: String,
		required: true,
	},
	publicId: {
		type: String,
		required: true,
	},
	// Cloudinary resource type, needed to delete the file again
	resourceType: {
		type: String,
	},
	uploadedAt: {
		type: Date,
		default: Date.now,
	},
	// Högst en aktiv per typ – den visas på hemsidan
	isActive: {
		type: Boolean,
		default: false,
	},
});

export default mongoose.model('MenuPdf', MenuPdfSchema);
