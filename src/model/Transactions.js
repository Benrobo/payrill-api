const { model, Schema } = require("mongoose");

const transactionSchema = new Schema(
    {
        id: { type: String },
        userId: { type: String },
        linkId: { type: String },
        paid: { type: String },
        totalAmount: { type: String },
        currency: { type: String },
        country: { type: String },
        name: { type: String },
        email: { type: String },
        iban: { type: String },
        status: { type: String },
        createdAt: { type: String },
    },
    { versionKey: false }
);

const Transactions = model("Transactions", transactionSchema);

module.exports = Transactions;
