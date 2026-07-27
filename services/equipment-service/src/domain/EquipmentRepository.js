import mongoose from "mongoose";

/**
 * Assure l'accès aux données persistantes du matériel.
 *
 * Encapsule Mongoose et fournit notamment les ajustements ATOMIQUES de la
 * quantité disponible, ce qui évite les doubles réservations lorsque deux
 * requêtes arrivent en même temps.
 */
export default class EquipmentRepository {
  /** @param {import("mongoose").Model} model */
  constructor(model) {
    this.model = model;
  }

  static isValidId(id) {
    return mongoose.Types.ObjectId.isValid(String(id));
  }

  async findAll() {
    return this.model.find().sort({ createdAt: -1 }).exec();
  }

  async findById(id) {
    if (!EquipmentRepository.isValidId(id)) return null;
    return this.model.findById(id).exec();
  }

  async create(data) {
    return this.model.create(data);
  }

  async update(id, data) {
    if (!EquipmentRepository.isValidId(id)) return null;
    return this.model.findByIdAndUpdate(id, data, { new: true, runValidators: true }).exec();
  }

  async deleteById(id) {
    if (!EquipmentRepository.isValidId(id)) return null;
    return this.model.findByIdAndDelete(id).exec();
  }

  /**
   * Diminue la quantité disponible de façon atomique.
   * La condition `availableQuantity >= quantity` fait partie du filtre :
   * si le stock est insuffisant, aucun document n'est modifié et null est
   * retourné.
   * @returns {Promise<object|null>}
   */
  async decreaseQuantity(id, quantity) {
    if (!EquipmentRepository.isValidId(id)) return null;
    return this.model
      .findOneAndUpdate(
        { _id: id, availableQuantity: { $gte: quantity } },
        { $inc: { availableQuantity: -quantity } },
        { new: true }
      )
      .exec();
  }

  /** Remet une quantité dans l'inventaire de façon atomique. */
  async increaseQuantity(id, quantity) {
    if (!EquipmentRepository.isValidId(id)) return null;
    return this.model
      .findByIdAndUpdate(id, { $inc: { availableQuantity: quantity } }, { new: true })
      .exec();
  }
}
