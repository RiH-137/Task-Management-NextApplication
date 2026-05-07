const mongoose = require("mongoose");

const resolveMongoUri = () =>
  process.env.MONGODB_URI || process.env.MongoDB_URI || process.env.MONGO_URI;

const connectToDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = resolveMongoUri();
  if (!uri) {
    throw new Error("Missing MONGODB_URI");
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  return mongoose.connection;
};

module.exports = { connectToDatabase };
