const dotenv = require("dotenv")
const devEnv = "./.env"

dotenv.config({ path: devEnv });

const JWT_SECRET = process.env.JWT_SECRET;

const DATABASE_URL = process.env.DATABASE_URL;

const MAX_API_REQUEST = process.env.MAX_API_REQUEST_COUNT;

const RAPYD_SECRET_KEY = process.env.RAPYD_SECRET_KEY;

const RAPYD_ACCESS_KEY = process.env.RAPYD_ACCESS_KEY;

module.exports = {
    JWT_SECRET,
    DATABASE_URL,
    MAX_API_REQUEST,
    RAPYD_ACCESS_KEY,
    RAPYD_SECRET_KEY
}