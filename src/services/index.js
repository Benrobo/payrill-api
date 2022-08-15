const axios = require("axios");

async function convertCurrency(from, to, amount) {
    // const httpURLPath = `/exchangerates_data/convert?to=${to}&from=${from}&amount=${amount}`;
    const apiKey = "d634d0f003634016b06f6a739bdf0156";
    const httpURLPath = `https://exchange-rates.abstractapi.com/v1/convert?api_key=${apiKey}&target=${to}&base=${from}&base_amount=${amount}`;
    
    try {
        const data = await axios.get(httpURLPath);
        // console.log(data.data);
        const amount = Math.floor(data.data.converted_amount);
        return String(amount);
    } catch (error) {
        console.log(error);
        return String(amount);
    }
}


function httpRequest(url, options) {
    return new Promise((resolve, reject) => {
        try {

            const req = https.request(url, options, (res) => {
                let response = {
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: "",
                };

                res.on("data", (data) => {
                    response.body += data;
                });

                res.on("end", () => {
                    response.body = response.body
                        ? JSON.parse(response.body)
                        : {};
                    if (response.statusCode !== 200) {
                        return reject(response);
                    }

                    return resolve(response);
                });
            });

            req.on("error", (error) => {
                return reject(error);
            });

            // req.write(response.body);
            req.end();
        } catch (err) {
            return reject(err);
        }
    });
}

module.exports = { convertCurrency };
