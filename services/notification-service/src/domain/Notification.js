/**
 * Représente une notification produite par l'application.
 *
 * Elle conserve le destinataire, le message et le contexte de création.
 * L'envoi est simulé par un enregistrement en base : cette classe n'accède
 * ni à MongoDB ni à un serveur de courriel.
 */
export default class Notification {
  /** Type appliqué lorsque l'appelant n'en fournit aucun. */
  static DEFAULT_TYPE = "INFO";

  /** Types produits par les opérations métier de l'application. */
  static TYPES = Object.freeze({
    INFO: "INFO",
    RESERVATION_CONFIRMED: "RESERVATION_CONFIRMED",
    RESERVATION_CANCELLED: "RESERVATION_CANCELLED"
  });

  /**
   * @param {{id?: string, recipient?: string, message?: string,
   *          type?: string, createdAt?: Date}} data
   */
  constructor({ id, recipient, message, type, createdAt } = {}) {
    this.id = id ?? null;
    this.recipient = Notification.#clean(recipient);
    this.message = Notification.#clean(message);
    this.type = Notification.#clean(type).toUpperCase() || Notification.DEFAULT_TYPE;
    this.createdAt = createdAt ?? null;
  }

  static #clean(value) {
    return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  }

  static fromDocument(document) {
    if (!document) return null;
    return new Notification({
      id: String(document._id),
      recipient: document.recipient,
      message: document.message,
      type: document.type,
      createdAt: document.createdAt
    });
  }

  /**
   * Vérifie que la notification contient le minimum nécessaire.
   * @returns {{valid: boolean, errors: string[]}}
   */
  validate() {
    const errors = [];
    if (!this.recipient) errors.push("Le destinataire de la notification est obligatoire.");
    if (!this.message) errors.push("Le message de la notification est obligatoire.");
    return { valid: errors.length === 0, errors };
  }

  isValid() {
    return this.validate().valid;
  }

  toPersistence() {
    return { recipient: this.recipient, message: this.message, type: this.type };
  }

  toJSON() {
    return {
      _id: this.id,
      recipient: this.recipient,
      message: this.message,
      type: this.type,
      createdAt: this.createdAt
    };
  }
}
