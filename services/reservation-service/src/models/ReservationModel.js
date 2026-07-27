import mongoose from "mongoose";

/**
 * Schéma de persistance d'une réservation.
 * La réservation conserve une COPIE des informations utiles du client et du
 * matériel (nom, courriel, prix quotidien) : chaque service possède sa propre
 * base et ne peut pas faire de jointure vers les autres.
 */
const reservationSchema = new mongoose.Schema(
  {
    clientId: { type: String, required: true },
    clientName: { type: String, default: "" },
    clientEmail: { type: String, default: "" },
    equipmentId: { type: String, required: true },
    equipmentName: { type: String, default: "" },
    dailyPrice: { type: Number, default: 0, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    days: { type: Number, default: 0, min: 0 },
    totalPrice: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["CONFIRMED", "CANCELLED"], default: "CONFIRMED" },
    cancelledAt: { type: Date, default: null }
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "reservations"
  }
);

export default mongoose.model("Reservation", reservationSchema);
