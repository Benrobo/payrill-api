const { model, Schema } = require("mongoose");

const productsSchema = new Schema(
    {
        id: { type: String },
        userId: { type: String },
        price: { type: String },
        name: { type: String },
        description: { type: String },
        image: { type: String },
        createdAt: { type: String },
    },
    { versionKey: false }
);

const Products = model("Products", productsSchema);

module.exports = Products;
