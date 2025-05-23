import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const userSchema = new Schema({
	username: {
		type: String,
		unique: true,
		minlength: 6,
		required: true,
	},
	password: {
		type: String,
		required: true,
		minlength: 8,
	},
	userId: {
		type: String,
		required: true,
		unique: true,
	},
});

const User = mongoose.model('User', userSchema);

export default User;
