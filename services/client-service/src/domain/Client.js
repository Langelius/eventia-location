/**
 * Représente un client de l'entreprise Eventia Location.
 *
 * Entité du domaine : elle porte les données d'identification et de contact
 * d'un client ainsi que les règles de validation qui s'y rapportent.
 * Aucune dépendance envers MongoDB, Express ou Axios.
 */
export default class Client {
  /** Expression régulière minimale de validation d'un courriel. */
  static EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /** Longueur minimale acceptée pour un numéro de téléphone. */
  static MIN_PHONE_LENGTH = 7;

  /**
   * @param {{id?: string, name?: string, email?: string, phone?: string,
   *          createdAt?: Date, updatedAt?: Date}} data
   */
  constructor({ id, name, email, phone, createdAt, updatedAt } = {}) {
    this.id = id ?? null;
    this.name = Client.#clean(name);
    this.email = Client.#clean(email).toLowerCase();
    this.phone = Client.#clean(phone);
    this.createdAt = createdAt ?? null;
    this.updatedAt = updatedAt ?? null;
  }

  static #clean(value) {
    return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  }

  /**
   * Reconstruit une entité du domaine à partir d'un document Mongoose.
   * @param {object} document
   * @returns {Client|null}
   */
  static fromDocument(document) {
    if (!document) return null;
    return new Client({
      id: String(document._id),
      name: document.name,
      email: document.email,
      phone: document.phone,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    });
  }

  /**
   * Vérifie que le client possède des données acceptables.
   * @returns {{valid: boolean, errors: string[]}}
   */
  validate() {
    const errors = [];
    if (!this.name) errors.push("Le nom du client est obligatoire.");
    if (!this.email) errors.push("Le courriel du client est obligatoire.");
    else if (!Client.EMAIL_PATTERN.test(this.email)) errors.push("Le courriel du client est invalide.");
    if (!this.phone) errors.push("Le telephone du client est obligatoire.");
    else if (this.phone.replace(/\D/g, "").length < Client.MIN_PHONE_LENGTH) {
      errors.push("Le telephone du client est invalide.");
    }
    return { valid: errors.length === 0, errors };
  }

  /** @returns {boolean} vrai si l'entité respecte toutes ses règles. */
  isValid() {
    return this.validate().valid;
  }

  /** Données persistables de l'entité (sans identifiant technique). */
  toPersistence() {
    return { name: this.name, email: this.email, phone: this.phone };
  }

  /** Représentation exposée par l'API REST. */
  toJSON() {
    return {
      _id: this.id,
      name: this.name,
      email: this.email,
      phone: this.phone,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
