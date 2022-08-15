const { model, Schema } = require("mongoose")


const refundSchema = new Schema({
    tranId: { type: String },
    merchantId: { type: String },
    payout: { type: String },
}, { versionKey: false })

const Refund = model('Refund', refundSchema);

module.exports = Refund