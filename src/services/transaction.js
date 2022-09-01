const db = require("../services/db");

function createTransaction(id,sender,receiver,amount,currency,type,title){
    db.query({
        sql: "INSERT INTO transaction(id,sender_id,receiver_id,amount,currency,type,title) VALUES(?,?,?,?,?,?,?)",
        timeout: 40000,
        values: [id,sender,receiver,amount,currency,type,title]
    })
}

module.exports = { createTransaction };