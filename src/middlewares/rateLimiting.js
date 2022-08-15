
const { MAX_API_REQUEST } = require("../config")
const rateLimit = require("express-rate-limit")


const customlimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: MAX_API_REQUEST, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    message: `You have exceeded the ${MAX_API_REQUEST} requests!`,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // handler: (req, res, next) => {
    //     // charge customer fee based on number of requests
    //     next()
    // }
})

module.exports = {
    customlimiter
}