/**
 * Représente un matériel disponible à la location.
 *
 * Entité du domaine : elle porte les informations commerciales et de stock
 * d'un article, ainsi que les règles de cohérence et de disponibilité.
 * Aucune dépendance MongoDB, Express ou Axios.
 */
export default class Equipment {
  /**
   * @param {{id?: string, name?: string, category?: string,
   *          dailyPrice?: number|string, availableQuantity?: number|string,
   *          createdAt?: Date, updatedAt?: Date}} data
   */
  constructor({ id, name, category, dailyPrice, availableQuantity, createdAt, updatedAt } = {}) {
    this.id = id ?? null;
    this.name = Equipment.#clean(name);
    this.category = Equipment.#clean(category);
    this.dailyPrice = Equipment.#toNumber(dailyPrice);
    this.availableQuantity = Equipment.#toNumber(availableQuantity);
    this.createdAt = createdAt ?? null;
    this.updatedAt = updatedAt ?? null;
  }

  static #clean(value) {
    return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  }

  /** Convertit une valeur reçue du HTTP (souvent une chaîne) en nombre. */
  static #toNumber(value) {
    if (value === null || value === undefined || value === "") return NaN;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  /** Reconstruit une entité à partir d'un document Mongoose. */
  static fromDocument(document) {
    if (!document) return null;
    return new Equipment({
      id: String(document._id),
      name: document.name,
      category: document.category,
      dailyPrice: document.dailyPrice,
      availableQuantity: document.availableQuantity,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    });
  }

  /**
   * Vérifie la cohérence générale du matériel.
   * @returns {{valid: boolean, errors: string[]}}
   */
  validate() {
    const errors = [];
    if (!this.name) errors.push("Le nom du materiel est obligatoire.");
    if (!this.category) errors.push("La categorie du materiel est obligatoire.");
    if (!Number.isFinite(this.dailyPrice)) errors.push("Le prix quotidien est obligatoire.");
    else if (this.dailyPrice < 0) errors.push("Le prix quotidien ne peut pas etre negatif.");
    if (!Number.isFinite(this.availableQuantity)) errors.push("La quantite disponible est obligatoire.");
    else if (!Number.isInteger(this.availableQuantity)) errors.push("La quantite disponible doit etre un entier.");
    else if (this.availableQuantity < 0) errors.push("La quantite disponible ne peut pas etre negative.");
    return { valid: errors.length === 0, errors };
  }

  isValid() {
    return this.validate().valid;
  }

  /**
   * Détermine si le stock permet la réservation demandée.
   * @param {number} quantity quantité souhaitée
   * @returns {boolean}
   */
  canReserve(quantity) {
    const requested = Equipment.#toNumber(quantity);
    if (!Number.isInteger(requested) || requested < 1) return false;
    return this.availableQuantity >= requested;
  }

  /** Coût de location pour une durée et une quantité données. */
  priceFor(days, quantity) {
    return this.dailyPrice * Number(days) * Number(quantity);
  }

  toPersistence() {
    return {
      name: this.name,
      category: this.category,
      dailyPrice: this.dailyPrice,
      availableQuantity: this.availableQuantity
    };
  }

  toJSON() {
    return {
      _id: this.id,
      name: this.name,
      category: this.category,
      dailyPrice: this.dailyPrice,
      availableQuantity: this.availableQuantity,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
