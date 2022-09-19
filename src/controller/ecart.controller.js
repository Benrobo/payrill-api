const sendResponse = require("../helpers/response");
const Fetch = require("../utils/fetch");
const {genUnique} = require("../helpers");
const db = require("../services/db");
const query = require("../helpers/query");

class EcartControler {
    #calculateItems(cartId) {
        return new Promise((resolve)=>{
            db.query({
                sql: "SELECT * FROM checkout WHERE (ecart_id = ?)",
                timeout: 40000,
                values: [cartId],
            }, function(error, results) {
                const items = results;
                let total = 0;
                items.forEach(item=>{
                    total += (item.item_price * item.item_quantity);
                });
                resolve(total);
            });
        }
        );
    }

    async getEcart(res, payload) {
        const id = "ecart";
        const cartId = payload;
        if (cartId === "all") {
            // Get All Ecart for this user
            db.query({
                sql: "SELECT * FROM ecart WHERE (user_id = ?)",
                timeout: 40000,
                values: [id],
            }, function(error, results, fields) {
                let ecarts = results;
                const storeId = ecarts[0].store_id;

                // Get Store Info
                db.query({
                    sql: "SELECT * FROM stores WHERE (id = ?)",
                    timeout: 40000,
                    values: [storeId],
                }, function(error, results, fields) {
                    const store = results[0];
                    const data = {
                        ecarts,
                        store
                    };

                    return sendResponse(res, 200, true, "Fetched All Ecart", data);
                });
            });
        } else {
            db.query({
                sql: "SELECT * FROM ecart WHERE (id = ? AND user_id = ?)",
                timeout: 40000,
                values: [cartId, id],
            }, function(error, results, fields) {
                if (results.length == 0) {
                    return sendResponse(res, 400, false, "Ecart Not Found or Access to Ecart denied", results[0]);
                }
                let ecart = results[0];
                const storeId = ecart.store_id;
                db.query({
                    sql: "SELECT * FROM checkout WHERE (ecart_id = ?)",
                    timeout: 40000,
                    values: [cartId],
                }, function(error, results, fields) {
                    ecart.items = results;

                    // Get Store Info
                    db.query({
                        sql: "SELECT * FROM stores WHERE (id = ?)",
                        timeout: 40000,
                        values: [storeId],
                    }, function(error, results, fields) {
                        const store = results[0];
                        ecart.store = store;

                        return sendResponse(res, 200, true, "Ecart Fetched", ecart);
                    });
                });
            });
        }
    }

    async payForEcart(res, payload, cartId) {
        const id = "ecart";
        const self = this;

        // Check if ecart exists and is accessible
        db.query({
            sql: "SELECT * FROM ecart WHERE (user_id = ? AND id = ?)",
            timeout: 40000,
            values: [id, cartId],
        }, async function(error, results) {
            if (results.length == 0) {
                return sendResponse(res, 400, false, "Ecart Not Found or Access to Ecart denied", {});
            }

            const ecart = results[0];

            if (ecart.user_id != "ecart") {
                return sendResponse(res, 400, false, "Ecart Not Found or Access to Ecart denied", {});
            }
            console.log(ecart);

            // Set Amount
            payload.amount = await self.#calculateItems(cartId);
            let seller = await query("SELECT * FROM users WHERE id = ?", [ecart.store_id]);
            if (seller.length != 0) {
                seller = seller[0];
                // Set Currency
                payload.currency = seller.currency;
                payload.ewallets = [{
                    ewallet: seller.ewallet,
                    percentage: 100
                }];
                payload.metadata = {};
                payload.metadata.type = "cart_payment";
                console.log(seller, payload);

                try {
                    let result = await Fetch("POST", "/v1/payments", payload);
                    let message = result.statusCode == 200 ? "success" : "failed";
                    let status = result.statusCode == 200 ? true : false;
                    query("UPDATE ecart SET paid = ?, amount = ? WHERE id = ?", ["true",payload.amount,cartId])
                    sendResponse(res, 200, true, "Paid", result);
                } catch (error) {
                    sendResponse(res, 400, false, "An Error Occurred", error)
                }
            }else{
                sendResponse(res, 400, false, "An Error Occurred", {})
            }
        })
    }

    async transferEcart(res, payload) {
        const id = "ecart";
        const {cartId, pin, to} = payload;

        if (pin == undefined) {
            sendResponse(res, 400, false, "Pin required", {});
        }

        db.query({
            sql: "SELECT * FROM ecart WHERE (id = ? AND user_id = ?)",
            timeout: 40000,
            values: [cartId, id],
        }, function(error, results) {
            if (results.length == 0) {
                return sendResponse(res, 400, false, "Access to Cart Denied or Cart Not Found", {});
            }

            db.query({
                sql: "SELECT pin FROM users WHERE id = ?",
                timeout: 40000,
                values: [id],
            }, function(error, results, fields) {
                if (toHash(String(pin)) === results[0].pin) {
                    db.query({
                        sql: "UPDATE ecart SET user_id = ? WHERE (id = ? AND user_id = ?)",
                        timeout: 40000,
                        values: [to, cartId, id],
                    }, function(error, results) {
                        sendResponse(res, 200, true, "Cart Transfered", {});
                    });
                } else {
                    sendResponse(res, 400, false, "Incorrect Pin", {});
                }
            });
        });
    }

    async createEcart(res, payload) {
        const {name} = payload;
        const cartId = genUnique();
        const id = "ecart";
        db.query({
            sql: "INSERT INTO ecart(id,user_id, name) VALUES(?,?,?)",
            timeout: 40000,
            values: [cartId, id, name],
        }, function(error, results, fields) {
            if (error) {
                console.log(error);
                return sendResponse(res, 200, true, "Error Creating Ecart", {});
            }
            return sendResponse(res, 200, true, "Ecart Created", {
                ecart: cartId,
                userId: id,
                name,
            });
        });
    }

    async removeFromEcart(res, payload) {
        const id = "ecart";
        const {cartId, itemId} = payload;

        db.query({
            sql: "SELECT * FROM ecart WHERE (id = ?)",
            timeout: 40000,
            values: [cartId],
        }, function(error, results, fields) {
            if (results.length == 0) {
                return sendResponse(res, 400, false, "Cart Not Found", {});
            }
            const ecart = results[0];
            if (ecart.user_id !== id) {
                return sendResponse(res, 400, false, "Access To Cart Denied", {});
            }
            if (ecart.paid === "true") {
                return sendResponse(res, 400, false, "You can not remove items from this Cart!", {});
            }

            db.query({
                sql: "SELECT * FROM checkout WHERE (ecart_id = ? AND item_id = ?)",
                timeout: 40000,
                values: [cartId, itemId],
            }, function(error, results, fields) {
                if (results.length == 0) {
                    return sendResponse(res, 200, true, "Item Removed From Cart!", {});
                }
                const checkoutItem = results[0];
                const quantity = checkoutItem.item_quantity;

                db.query({
                    sql: "SELECT * FROM store_items WHERE (id = ?)",
                    timeout: 40000,
                    values: [itemId],
                }, function(error, results, fields) {
                    const item = results[0];
                    const newQuantity = quantity + item.item_quantity;

                    db.query({
                        sql: "UPDATE store_items SET item_quantity = ? WHERE (id = ?)",
                        timeout: 40000,
                        values: [newQuantity, itemId],
                    });
                });

                db.query({
                    sql: "DELETE FROM checkout WHERE (ecart_id = ? AND item_id = ?)",
                    timeout: 40000,
                    values: [cartId, itemId],
                }, function(error, results, fields) {
                    return sendResponse(res, 200, true, "Item Removed From Cart!", {});
                });
            });
        });
    }

    async addToEcart(res, payload) {
        const id = "ecart";
        let {cartId, itemId, quantity} = payload;

        if (quantity === undefined) {
            quantity = 1;
        }

        if (quantity == 0) {
            return this.removeFromEcart(res, payload);
        }

        db.query({
            sql: "SELECT * FROM ecart WHERE (id = ?)",
            timeout: 40000,
            values: [cartId],
        }, function(error, results, fields) {
            if (results.length == 0) {
                return sendResponse(res, 400, false, "ECart Not Found", {});
            }
            const ecart = results[0];
            let storeId = ecart.store_id;
            if (ecart.user_id !== id) {
                return sendResponse(res, 400, false, "Access To Ecart Denied", {});
            }
            if (ecart.paid === "true") {
                return sendResponse(res, 400, false, "You can not add items to this Ecart!", {});
            }

            db.query({
                sql: "SELECT * FROM store_items WHERE (id = ?) LIMIT 1",
                timeout: 40000,
                values: [itemId],
            }, function(error, results, fields) {
                if (results.length != 0) {
                    const item = results[0];
                    if (!storeId) {
                        storeId = item.store_id;
                        db.query({
                            sql: "UPDATE ecart SET store_id = ? WHERE (id = ?)",
                            values: [storeId, cartId],
                        });
                    }
                    if (storeId !== item.store_id) {
                        return sendResponse(res, 400, false, "You can not add this item to this Ecart!", {});
                    }
                    if (item.item_quantity == 0) {
                        return sendResponse(res, 400, false, "Item is out of stock!", {});
                    }
                    // Check if item is already in cart and just update the quantity
                    db.query({
                        sql: "SELECT * FROM checkout WHERE (ecart_id = ? AND item_id = ?)",
                        timeout: 40000,
                        values: [cartId, itemId],
                    }, function(error, results) {
                        if (results.length == 0) {
                            if (item.item_quantity < Number(quantity)) {
                                return sendResponse(res, 400, false, `There is only ${item.item_quantity} left`, {});
                            }
                            db.query({
                                sql: "INSERT INTO checkout(ecart_id,item_id,item_name,item_price,item_quantity,item_currency,item_image) VALUES(?,?,?,?,?,?,?)",
                                timeout: 40000,
                                values: [cartId, itemId, item.item_name, item.item_price, quantity, item.item_currency, item.item_image, ],
                            }, function(error, results) {
                                // Update Item Quantity in store
                                const newQuantity = item.item_quantity - Number(quantity);
                                db.query({
                                    sql: "UPDATE store_items SET item_quantity = ? WHERE (id = ?)",
                                    timeout: 40000,
                                    values: [newQuantity, itemId, ],
                                });
                                return sendResponse(res, 200, true, "Item Added to Cart", {
                                    quantity: newQuantity
                                });
                            });
                        } else {
                            let checkoutItem = results[0];
                            let oldQuantity = item.item_quantity;
                            let newQuantity = checkoutItem.item_quantity + oldQuantity - Number(quantity);
                            if (newQuantity < 0) {
                                return sendResponse(res, 400, false, `There is only ${item.item_quantity} left`, {});
                            }
                            db.query({
                                sql: "UPDATE checkout SET item_quantity = ? WHERE (ecart_id = ? AND item_id = ?)",
                                timeout: 40000,
                                values: [quantity, cartId, itemId, ],
                            }, function(error, results) {
                                // Update Item Quantity in store
                                db.query({
                                    sql: "UPDATE store_items SET item_quantity = ? WHERE (id = ?)",
                                    timeout: 40000,
                                    values: [newQuantity, itemId, ],
                                });
                                return sendResponse(res, 200, true, "Item Added to Cart", {});
                            });
                        }
                    });
                } else {
                    return sendResponse(res, 400, false, "Item Not Found!", {});
                }
            });
        });
    }
}

module.exports = EcartControler;
