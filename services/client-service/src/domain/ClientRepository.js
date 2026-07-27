import mongoose from "mongoose";

/**
 * Assure l'accès aux données persistantes des clients.
 *
 * Seule classe du service à connaître Mongoose. Elle ne contient aucune règle
 * métier : elle traduit des demandes de persistance en requêtes MongoDB.
 */
export default class ClientRepository {
  /** @param {import("mongoose").Model} model modèle Mongoose des clients. */
  constructor(model) {
    this.model = model;
  }

  /** @returns {boolean} vrai si la chaîne est un ObjectId MongoDB valide. */
  static isValidId(id) {
    return mongoose.Types.ObjectId.isValid(String(id));
  }

  /** @returns {Promise<object[]>} tous les clients, du plus récent au plus ancien. */
  async findAll() {
    return this.model.find().sort({ createdAt: -1 }).exec();
  }

  /** @returns {Promise<object|null>} le client demandé ou null. */
  async findById(id) {
    if (!ClientRepository.isValidId(id)) return null;
    return this.model.findById(id).exec();
  }

  /** @returns {Promise<object|null>} le client possédant ce courriel ou null. */
  async findByEmail(email) {
    if (!email) return null;
    return this.model.findOne({ email: String(email).toLowerCase() }).exec();
  }

  /** @returns {Promise<object>} le client créé. */
  async create(data) {
    return this.model.create(data);
  }

  /** @returns {Promise<object|null>} le client modifié ou null s'il est introuvable. */
  async update(id, data) {
    if (!ClientRepository.isValidId(id)) return null;
    return this.model.findByIdAndUpdate(id, data, { new: true, runValidators: true }).exec();
  }

  /** @returns {Promise<object|null>} le client supprimé ou null s'il est introuvable. */
  async deleteById(id) {
    if (!ClientRepository.isValidId(id)) return null;
    return this.model.findByIdAndDelete(id).exec();
  }
}
