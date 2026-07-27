import mongoose from "mongoose";

/**
 * Ouvre la connexion vers la base MongoDB propre au service client.
 * Chaque service possède sa propre base : aucun accès croisé n'est permis.
 */
export async function connectDatabase(uri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  console.log(`client-service connecte a MongoDB (${uri})`);
  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
