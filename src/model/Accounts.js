const { model, Schema } = require("mongoose");

// Virtual Account NUMBER
const virtualAccountsShema = new Schema({
    id: { type: String }, //Vitual Account Id
    userId: { type: String },
    walletId: { type: String },
    // bankName: { type: String },
    iban: { type: String },
    // bic: { type: String },
    // routingNumber: { type: String },
    country: { type: String },
    currency: { type: String },
    description: { type: String },
    createdAt: { type: String },
});

const Account = model("Account", virtualAccountsShema);

module.exports = Account;
