import mongoose from "mongoose";

const connectToDataBase = async () => {
  try {
    if (!process.env.MONGO_URI) {

        console.log("mongo uri not found");
      throw new Error("mongo_uri must be defined");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected DB:", mongoose.connection.name);

    console.log("db connected successfully");
 } catch (err) {
    console.log("database connection failed", err);
    process.exit(1);
  }
};

export default connectToDataBase;


