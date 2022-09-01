const sendResponse = require("../helpers/response");
const Fetch = require("../utils/fetch");
const db = require("../services/db");

class ItemControler{
    async getItem(res, payload){
        const itemId = payload;
        db.query({
            sql: 'SELECT * FROM store_items WHERE (id = ?)',
            timeout: 40000,
            values: [itemId]
        }, function(error, results, fields){
            if(results.length == 0){
                return sendResponse(res,200,true,"Store Item Not Found",results);
            }
            const storeId = results[0]["store_id"];
            const item = results[0];
            db.query({
                sql: 'SELECT * FROM stores WHERE (id = ?)',
                timeout: 40000,
                values: [storeId]
            }, function(error, results, fields){
                const data = {
                    store: results[0],
                    item,
                }
                return sendResponse(res,200,true,"Store Item Fetched",data);
            })
        });
    }

    async addItem(res, payload){
        const { id, type } = res.user;
        const { name, price, quantity, currency, description, image } = payload;

        if(type === "user1"){
            return sendResponse(res,400,false,"Access Denied",{});
        }

        db.query({
            sql: 'INSERT INTO store_items()',
            timeout: 40000,
            values: [storeId]
        }, function(error, results, fields){

        })
    }
}

module.exports = ItemControler;