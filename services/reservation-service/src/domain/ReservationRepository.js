import mongoose from "mongoose";

/**
 * Assure l'accès aux réservations stockées dans MongoDB.
 * Aucun appel vers les autres microservices n'est effectué ici.
 */
export default class ReservationRepository {
  /** @param {import("mongoose").Model} model */
  constructor(model) {
    this.model = model;
  }

  static isValidId(id) {
    return mongoose.Types.ObjectId.isValid(String(id));
  }

  /** @returns {Promise<object[]>} reservations de la plus recente a la plus ancienne. */
  async findAll() {
    return this.model.find().sort({ createdAt: -1, _id: -1 }).exec();
  }

  async findById(id) {
    if (!ReservationRepository.isValidId(id)) return null;
    return this.model.findById(id).exec();
  }

  async create(data) {
    return this.model.create(data);
  }

  /** @returns {Promise<object|null>} la reservation dans sa nouvelle version. */
  async update(id, data) {
    if (!ReservationRepository.isValidId(id)) return null;
    return this.model.findByIdAndUpdate(id, data, { new: true, runValidators: true }).exec();
  }

  async deleteById(id) {
    if (!ReservationRepository.isValidId(id)) return null;
    return this.model.findByIdAndDelete(id).exec();
  }
}
