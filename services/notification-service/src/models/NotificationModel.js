import mongoose from "mongoose";

/**
 * Schéma de persistance d'une notification.
 * Dans cette version, l'envoi est simulé : la notification est simplement
 * conservée dans MongoDB, aucun courriel réel n'est expédié.
 */
const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true, uppercase: true, default: "INFO" }
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "notifications"
  }
);

notificationSchema.index({ createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
