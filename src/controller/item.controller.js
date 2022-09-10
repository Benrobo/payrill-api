const sendResponse = require("../helpers/response");
const Fetch = require("../utils/fetch");
const { genId } = require("../helpers");
const db = require("../services/db");

class ItemControler {
    async getItem(res, payload) {
        const itemId = payload;
        db.query(
            {
                sql: "SELECT * FROM store_items WHERE (id = ?)",
                timeout: 40000,
                values: [itemId],
            },
            function (error, results, fields) {
                if (results.length == 0) {
                    return sendResponse(
                        res,
                        200,
                        true,
                        "Store Item Not Found",
                        results
                    );
                }
                const storeId = results[0]["store_id"];
                const item = results[0];
                db.query(
                    {
                        sql: "SELECT * FROM stores WHERE (id = ?)",
                        timeout: 40000,
                        values: [storeId],
                    },
                    function (error, results, fields) {
                        const data = {
                            store: results[0],
                            item,
                        };
                        return sendResponse(
                            res,
                            200,
                            true,
                            "Store Item Fetched",
                            data
                        );
                    }
                );
            }
        );
    }

    async getAllItems(res, payload) {
        const userId = res.user.id;
        const { storeId } = payload;

        if (storeId === "" || typeof storeId === "undefined") {
            return sendResponse(
                res,
                404,
                false,
                "Store ID Not Found",
                {}
            );
        }

        // check if user has a store with that id
        db.query({
            sql: "SELECT * FROM stores WHERE (id = ? AND user_id = ?)",
            timeout: 40000,
            values: [storeId, userId]
        }, (error, results, fields) => {
            if (error) {
                return sendResponse(
                    res,
                    400,
                    true,
                    "something went wrong getting items..",
                    error
                );
            }

            if (results.length === 0) {
                return sendResponse(
                    res,
                    404,
                    true,
                    "store items unavailable for this user.",
                    {}
                );
            }

            db.query(
                {
                    sql: "SELECT * FROM store_items WHERE (store_id = ?)",
                    timeout: 40000,
                    values: [storeId],
                },
                function (error, results, fields) {
                    if (error) {
                        return sendResponse(
                            res,
                            400,
                            true,
                            "something went wrong getting items..",
                            error
                        );
                    }


                    if (results.length == 0) {
                        return sendResponse(
                            res,
                            404,
                            true,
                            "Store Item Not Found",
                            {}
                        );
                    }

                    return sendResponse(
                        res,
                        200,
                        true,
                        "Store Item Fetched",
                        results
                    );
                }
            );

        })

    }

    async addItem(res, payload) {
        const { id, type } = res.user;
        const { name, price, quantity, currency, description, image, storeId } = payload;
        const itemId = genId();

        if (type === "user1") {
            return sendResponse(res, 400, false, "Access Denied", {});
        }


        db.query(
            {
                sql: "INSERT INTO store_items(id,store_id,item_name,item_price,item_quantity,item_currency,item_description,item_image) VALUES(?,?,?,?,?,?,?,?)",
                timeout: 40000,
                values: [
                    itemId,
                    storeId,
                    name,
                    price,
                    quantity,
                    currency,
                    description,
                    image,
                ],
            },
            function (error, results, fields) {
                if (error) {
                    console.log(error);
                    return sendResponse(
                        res,
                        400,
                        false,
                        "Error Adding Item",
                        {}
                    );
                }
                return sendResponse(res, 200, true, "Item Added to store", {
                    ...payload,
                    id: itemId,
                });
            }
        );
    }

    async updateItem(res, payload, itemId) {
        const { id, type } = res.user;
        const { name, price, quantity, currency, description, image } = payload;

        if (type === "user1") {
            return sendResponse(res, 400, false, "Access Denied", {});
        }

        db.query(
            {
                sql: "UPDATE store_items SET item_name = ?,item_price = ?,item_quantity = ?,item_currency = ?,item_description = ?,item_image = ? WHERE (id = ? AND store_id = ?)",
                timeout: 40000,
                values: [
                    name,
                    price,
                    quantity,
                    currency,
                    description,
                    image,
                    Number(itemId),
                    id,
                ],
            },
            function (error, results, fields) {
                if (error) {
                    console.log(error);
                    return sendResponse(
                        res,
                        400,
                        false,
                        "Error Updating Item",
                        {}
                    );
                }
                console.log(id, itemId);
                return sendResponse(res, 200, true, "Item Updated", {
                    ...payload,
                    id: itemId,
                });
            }
        );
    }
}

module.exports = ItemControler;
