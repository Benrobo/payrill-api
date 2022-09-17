const db = require("../services/db");

function query(sql, values) {
    return new Promise((resolve, reject)=>{
        db.query({
            sql,
            values,
        }, function(error, results) {
            if(error){
                reject(error);
            }else{
                resolve(results);
            }
        });
    });
}

module.exports = query;