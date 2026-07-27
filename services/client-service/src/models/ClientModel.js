import mongoose from "mongoose";

/**
 * Schéma de persistance du client.
 * Le courriel porte un index unique : la règle « le courriel d'un client doit
 * être unique » est donc garantie au niveau de la base également.
 */
const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    phone: { type: String, required: true, trim: true }
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "clients"
  }
);

export default mongoose.model("Client", clientSchema);
