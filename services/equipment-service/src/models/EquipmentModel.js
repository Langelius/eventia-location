import mongoose from "mongoose";

/**
 * Schéma de persistance du matériel loué.
 * `availableQuantity` ne peut jamais devenir négative : la contrainte est
 * appliquée dans le domaine et par la mise à jour atomique du dépôt.
 */
const equipmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    dailyPrice: { type: Number, required: true, min: 0 },
    availableQuantity: { type: Number, required: true, min: 0, default: 0 }
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "equipments"
  }
);

export default mongoose.model("Equipment", equipmentSchema);
