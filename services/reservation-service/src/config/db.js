import mongoose from "mongoose";

/** Ouvre la connexion vers la base MongoDB propre au service reservation. */
export async function connectDatabase(uri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  console.log(`reservation-service connecte a MongoDB (${uri})`);
  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
