const { randomUUID, randomBytes, createHmac } = require("crypto");
const bcryptjs = require("bcryptjs");

const genId = () => randomUUID();

const genHash = (salt = 10, string) => {
  return bcryptjs.hashSync(salt, string);
};

const secret = 'abcdefg';

const toHash = (text) => {
    return createHmac('sha256', secret).update(text).digest('hex');
}

const compareHash = (string, hash) => {
  return bcryptjs.compareSync(string, hash);
};

const genUnique = () => {
  try {
      return randomBytes(5).toString("hex");
  } catch (error) {
      console.error("Error generating salt");
      throw error;
  }
}

module.exports = {
  genId,
  genHash,
  compareHash,
  genUnique,
  toHash
}