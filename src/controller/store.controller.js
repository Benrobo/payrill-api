const { genHash, compareHash, genId, genUnique } = require("../helpers");
const sendResponse = require("../helpers/response");
const {
    genAccessToken,
    genRefreshToken,
    verifyToken,
} = require("../helpers/token");
const Fetch = require("../utils/fetch");
const db = require("../services/db");

class StoreController {
    async createStore(res, payload) {
        const { id } = res.user;
        let {
            name,
            subdomain,
            logo,
            description,
            theme_bg,
            cover_photo,
            theme_color,
            location,
        } = payload;

        // Set Defaults if not set
        theme_bg = theme_bg || "#131418";
        theme_color = theme_color || "#FFF";

        // Check if user already owns a store
        db.query(
            {
                sql: "SELECT * FROM stores WHERE (user_id = ?)",
                timeout: 40000,
                values: [id],
            },
            function (error, results, fields) {
                if (results.length != 0) {
                    return sendResponse(
                        res,
                        400,
                        false,
                        "Already Own a Store",
                        {}
                    );
                }

                // Create Store
                db.query(
                    {
                        sql: "INSERT INTO stores(id,user_id,name,subdomain,logo,description,theme_bg,cover_photo,theme_color,location) VALUES(?,?,?,?,?,?,?,?,?,?)",
                        timeout: 40000,
                        values: [
                            id,
                            id,
                            name,
                            subdomain,
                            logo,
                            description,
                            theme_bg,
                            cover_photo,
                            theme_color,
                            location,
                        ],
                    },
                    function (error, results, fields) {
                        if (error) {
                            return sendResponse(
                                res,
                                400,
                                false,
                                "Error Creating Store",
                                error
                            );
                        }

                        // Change Type of User to Organization
                        db.query(
                            {
                                sql: "UPDATE users SET type = ? WHERE id = ?",
                                timeout: 40000,
                                values: ["organization", id],
                            },
                            function (error, results, fields) {
                                if (error) {
                                    return sendResponse(
                                        res,
                                        400,
                                        false,
                                        "Error Creating Store",
                                        error
                                    );
                                }

                                return sendResponse(
                                    res,
                                    200,
                                    true,
                                    "Store Created",
                                    {}
                                );
                            }
                        );
                    }
                );
            }
        );
    }

    async getAllStores(res) {
        try {
            const { id } = res.user;
            const query = `SELECT * FROM stores WHERE (user_id = ?)`;
            db.query({
                sql: query,
                values: [id],
                timeout: 4000
            }, (error, results, fields) => {
                if (error) {
                    return sendResponse(
                        res,
                        400,
                        false,
                        "Something went wrong getting stores",
                    );
                }

                return sendResponse(
                    res,
                    200,
                    true,
                    "store retrieved successfully",
                    results
                );
            })
        }
        catch (e) {
            console.log(e)
            return sendResponse(
                res,
                500,
                false,
                "something went wrong retrieving store",
            );
        }
    }

    async getStoreByDomain(res, isAuthenticated, domain) {
        const query = isAuthenticated ? `SELECT id,name,subdomain,verified,location,description,logo,cover_photo FROM stores WHERE (user_id = ? AND subdomain = ?)` : `SELECT id,name,subdomain,verified,theme_bg,theme_color,location,description,logo,cover_photo FROM stores WHERE (subdomain = ?)`;

        // for authenticated users
        if (isAuthenticated) {
            const { id } = res.user;
            db.query({
                sql: query,
                values: [id, domain],
                timeout: 4000
            }, (error, results, fields) => {
                if (error) {
                    return sendResponse(
                        res,
                        400,
                        false,
                        "Something went wrong getting stores",
                    );
                }

                if (results.length === 0) {
                    return sendResponse(
                        res,
                        404,
                        false,
                        "Not found",
                        {}
                    );
                }

                return sendResponse(
                    res,
                    200,
                    true,
                    "store retrieved successfully",
                    results[0]
                );
            })
            return;
        }

        // for non-authenticated users
        db.query({
            sql: query,
            values: [domain],
            timeout: 4000
        }, (error, results, fields) => {
            if (error) {
                return sendResponse(
                    res,
                    400,
                    false,
                    "Something went wrong getting stores",
                );
            }

            if (results.length === 0) {
                return sendResponse(
                    res,
                    404,
                    false,
                    "Not found",
                    {}
                );
            }

            return sendResponse(
                res,
                200,
                true,
                "store retrieved successfully",
                results[0]
            );
        })
    }
}

module.exports = StoreController;
