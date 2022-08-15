const express = require("express")
const bodyParser = require("body-parser")
const cors = require("cors")
const app = express();
const http = require("http")
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const { customlimiter } = require("./middlewares/rateLimiting")
const authRouter = require("./routes/auth.router")
const walletRouter = require("./routes/wallets.router")
const productRouter = require("./routes/product.router")
const transactionRouter = require("./routes/transaction.router")
const paymentLink = require("./routes/payment.router")
const Fetch = require("./utils/fetch")
const { DATABASE_URL } = require("./config")
const mongoose = require("mongoose")
const sendResponse = require("./helpers/response")
const cookieParser = require('cookie-parser');
require("dotenv").config({ path: "./.env" })

// Middlewares
app.use(cors({
  credentials: true,
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
}));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// router  middlewares
app.use(customlimiter);

app.get("/", (req, res) => {
  res.send(`WELCOME`);
});

io.on('connection', (socket) => {
  console.log('a user connected');
});

// LIST ALL SUPPORTED COUNTRIES
app.get("/api/countries", async (req, res) => {
  try {
    const result = await Fetch('GET', '/v1/data/countries');

    res.json(result)

  } catch (error) {
    res.json('Error completing request', error);
  }
})

// Authentication
app.use("/api/auth", authRouter);

// Wallets
app.use("/api/wallet", walletRouter);

// Products
app.use("/api/product", productRouter);

// Transaction
app.use("/api/transaction", transactionRouter);

// PaymentLink
app.use("/api/payment/link", paymentLink);


const PORT = process.env.PORT || 8080;

const LOCAL_DB = "mongodb://0.0.0.0:27017/payrill"

const DB_URL = process.env.NODE_ENV == "development" ? LOCAL_DB : DATABASE_URL

mongoose.connect(DB_URL, { useNewUrlParser: true }).then((res) => {
  console.log("MONGODB CONNECTED")
  return server.listen(PORT, () => {
    console.log(`Server listening @ http://localhost:${PORT}`);
  })

}).catch((err) => {
  console.log(`Error connecting database: ${err.message}`);
})