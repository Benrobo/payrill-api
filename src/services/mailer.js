const mailer = require("nodemailer");
const fs = require("fs");
require("dotenv").config({ path: "./.env" });

const mailUser = process.env.MAIL_USER;
const mailPass = process.env.MAIL_PASS;

let transporter = mailer.createTransport({
    host: "vmi807529.contaboserver.net",
    port: 25,
    secure: false, // true for 465, false for other ports
    auth: {
        user: mailUser, // generated ethereal user
        pass: mailPass, // generated ethereal password
    },
    tls: {
        rejectUnauthorized: false,
    },
});

const COMPANY = "PayRill";
const URL = "https://payrill.app";
const LOGO = "https://raypal.finance/favicon.ico";

function makeTemplate(name, email, title, message) {
    let mail = fs.readFileSync(__dirname + "/welcome.html", "utf-8");
    return mail
        .replaceAll("{{company}}", COMPANY)
        .replaceAll("{{logo}}", LOGO)
        .replaceAll("{{url}}", URL)
        .replaceAll("{{name}}", name)
        .replaceAll("{{email}}", email)
        .replaceAll("{{message}}", message)
        .replaceAll("{{title}}", title);
}

async function sendMail(name, email, title, message) {
    // send mail with defined transport object
    let info = await transporter.sendMail({
        from: '"PayRill " <info@payrill.app>', // sender address
        to: email, // list of receivers
        subject: title, // Subject line
        html: makeTemplate(name, email, title, message), // html body
    });
    console.log(info);
}

module.exports = { sendMail };
