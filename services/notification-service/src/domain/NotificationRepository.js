import mongoose from "mongoose";

/**
 * Assure la persistance et la consultation des notifications.
 * Elle organise l'historique de la plus récente à la plus ancienne,
 * ordre attendu par l'interface utilisateur.
 */
export default class NotificationRepository {
  /** @param {import("mongoose").Model} model */
  constructor(model) {
    this.model = model;
  }

  static isValidId(id) {
    return mongoose.Types.ObjectId.isValid(String(id));
  }

  /** @returns {Promise<object[]>} historique trie du plus recent au plus ancien. */
  async findAll() {
    return this.model.find().sort({ createdAt: -1, _id: -1 }).exec();
  }

  async findById(id) {
    if (!NotificationRepository.isValidId(id)) return null;
    return this.model.findById(id).exec();
  }

  async create(data) {
    return this.model.create(data);
  }
}
