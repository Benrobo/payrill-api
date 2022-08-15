const { model, Schema } = require("mongoose")


const userSchema = new Schema({
    id: { type: String, unique: true },
    username: { type: String, default: null },
    email: { type: String, unique: true },
    country: { type: String },
    currency: { type: String },
    hash: { type: String },
    token: { type: String }
}, { versionKey: false })

const User = model('User', userSchema);

module.exports = User