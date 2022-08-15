const jwt = require("jsonwebtoken")
const { JWT_SECRET } = require("../config")

function isLoggedIn(req, res, next) {
    let tokens = req.headers["authorization"];

    if (!tokens) {
        return res.status(403).json({ message: "Authorization header is required", error: true })
    }
    try {
        let bearer = tokens.split(" ")[1];
        let decode = jwt.verify(bearer, JWT_SECRET)
        req.user = decode;
        res.user = decode;
        next()
    } catch (e) {
        console.log(e)
        return res.status(403).json({ message: "Invalid token", error: true })
    }
}


module.exports = isLoggedIn