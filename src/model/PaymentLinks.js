const { model, Schema } = require("mongoose")


const paymentLinksSchema = new Schema({
    id: { type: String, unique: true },
    userId: { type: String },
    title: { type: String },
    country: { type: String },
    currency: { type: String },
    amount: { type: String },
    wId: { type: String },
    active: { type: Boolean },
    createdAt: { type: String }
}, { versionKey: false })


const PaymentLinks = model('PaymentLinks', paymentLinksSchema);

module.exports = PaymentLinks