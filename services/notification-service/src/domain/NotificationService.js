import Notification from "./Notification.js";
import { NotFoundError, ValidationError } from "../errors/AppError.js";

/**
 * Contient la logique applicative du service des notifications.
 * Elle construit une entité Notification, vérifie sa validité puis demande
 * au dépôt de l'enregistrer. Aucune dépendance Express ou Mongoose.
 */
export default class NotificationService {
  /** @param {import("./NotificationRepository.js").default} repository */
  constructor(repository) {
    this.repository = repository;
  }

  /** Historique complet, de la plus recente a la plus ancienne. */
  async list() {
    const documents = await this.repository.findAll();
    return documents.map((document) => Notification.fromDocument(document).toJSON());
  }

  /** @throws {NotFoundError} */
  async getById(id) {
    const document = await this.repository.findById(id);
    if (!document) throw new NotFoundError("Notification introuvable.");
    return Notification.fromDocument(document).toJSON();
  }

  /** @throws {ValidationError} notification incomplete. */
  async create(data) {
    const notification = new Notification(data);
    const { valid, errors } = notification.validate();
    if (!valid) throw new ValidationError(errors.join(" "), errors);
    const created = await this.repository.create(notification.toPersistence());
    return Notification.fromDocument(created).toJSON();
  }
}
