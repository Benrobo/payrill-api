const { model, Schema } = require("mongoose");

const walletSchema = new Schema(
    {
        id: { type: String, unique: true },
        userId: { type: String },
        wId: { type: String },
        wName: { type: String },
        wAddr: { type: String },
        totalBalance: { type: String },
        verified: { type: Boolean },
        status: { type: String },
        createdAt: { type: String },
    },
    { versionKey: false }
);

const Wallets = model("Wallets", walletSchema);

module.exports = Wallets;
