/**
 * Représente une réservation de matériel effectuée par un client.
 *
 * Entité du domaine : elle normalise les dates et la quantité, vérifie la
 * cohérence de la période demandée, calcule la durée facturable et le montant
 * total de la location. Elle n'appelle aucun autre service et n'utilise pas
 * MongoDB.
 */
export default class Reservation {
  /** Nombre de millisecondes dans une journee. */
  static MS_PER_DAY = 24 * 60 * 60 * 1000;

  /** États possibles d'une réservation. */
  static STATUS = Object.freeze({ CONFIRMED: "CONFIRMED", CANCELLED: "CANCELLED" });

  /**
   * @param {{id?: string, clientId?: string, clientName?: string,
   *          clientEmail?: string, equipmentId?: string, equipmentName?: string,
   *          dailyPrice?: number|string, quantity?: number|string,
   *          startDate?: string|Date, endDate?: string|Date, days?: number,
   *          totalPrice?: number, status?: string, cancelledAt?: Date,
   *          createdAt?: Date, updatedAt?: Date}} data
   */
  constructor({
    id,
    clientId,
    clientName,
    clientEmail,
    equipmentId,
    equipmentName,
    dailyPrice,
    quantity,
    startDate,
    endDate,
    days,
    totalPrice,
    status,
    cancelledAt,
    createdAt,
    updatedAt
  } = {}) {
    this.id = id ?? null;
    this.clientId = Reservation.#clean(clientId);
    this.clientName = Reservation.#clean(clientName);
    this.clientEmail = Reservation.#clean(clientEmail);
    this.equipmentId = Reservation.#clean(equipmentId);
    this.equipmentName = Reservation.#clean(equipmentName);
    this.dailyPrice = Reservation.#toNumber(dailyPrice, 0);
    this.quantity = Reservation.#toNumber(quantity, NaN);
    this.startDate = Reservation.#toDate(startDate);
    this.endDate = Reservation.#toDate(endDate);
    this.status = Reservation.#clean(status).toUpperCase() || Reservation.STATUS.CONFIRMED;
    this.cancelledAt = cancelledAt ?? null;
    this.createdAt = createdAt ?? null;
    this.updatedAt = updatedAt ?? null;
    this.days = Number.isFinite(days) ? Number(days) : this.durationInDays();
    this.totalPrice = Number.isFinite(totalPrice) ? Number(totalPrice) : this.computeTotal(this.dailyPrice);
  }

  static #clean(value) {
    return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  }

  static #toNumber(value, fallback) {
    if (value === null || value === undefined || value === "") return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  /** Normalise une date en UTC a minuit afin que le calcul en jours soit stable. */
  static #toDate(value) {
    if (!value) return null;
    const date = value instanceof Date ? new Date(value.getTime()) : new Date(String(value));
    if (Number.isNaN(date.getTime())) return null;
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  static fromDocument(document) {
    if (!document) return null;
    return new Reservation({
      id: String(document._id),
      clientId: document.clientId,
      clientName: document.clientName,
      clientEmail: document.clientEmail,
      equipmentId: document.equipmentId,
      equipmentName: document.equipmentName,
      dailyPrice: document.dailyPrice,
      quantity: document.quantity,
      startDate: document.startDate,
      endDate: document.endDate,
      days: document.days,
      totalPrice: document.totalPrice,
      status: document.status,
      cancelledAt: document.cancelledAt,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    });
  }

  /**
   * Durée facturable, premier ET dernier jour inclus.
   * Exemple : du 1er au 3 juillet = 3 jours.
   * @returns {number}
   */
  durationInDays() {
    if (!this.startDate || !this.endDate) return 0;
    const difference = this.endDate.getTime() - this.startDate.getTime();
    if (difference < 0) return 0;
    return Math.floor(difference / Reservation.MS_PER_DAY) + 1;
  }

  /**
   * Montant total : nombre de jours x quantité x prix quotidien.
   * @param {number} dailyPrice prix fourni par le service du materiel.
   * @returns {number} total arrondi au cent pres.
   */
  computeTotal(dailyPrice = this.dailyPrice) {
    const price = Reservation.#toNumber(dailyPrice, 0);
    const quantity = Reservation.#toNumber(this.quantity, 0);
    return Math.round(this.durationInDays() * quantity * price * 100) / 100;
  }

  /** Applique le prix quotidien du materiel et met a jour duree et total. */
  applyPricing(dailyPrice) {
    this.dailyPrice = Reservation.#toNumber(dailyPrice, 0);
    this.days = this.durationInDays();
    this.totalPrice = this.computeTotal(this.dailyPrice);
    return this;
  }

  /** Recopie les informations du client obtenues du service client. */
  applyClient({ name, email } = {}) {
    this.clientName = Reservation.#clean(name);
    this.clientEmail = Reservation.#clean(email);
    return this;
  }

  /** Recopie les informations du materiel obtenues du service materiel. */
  applyEquipment({ name, dailyPrice } = {}) {
    this.equipmentName = Reservation.#clean(name);
    return this.applyPricing(dailyPrice);
  }

  /** Passe la reservation a l'etat ANNULEE. */
  cancel(at = new Date()) {
    this.status = Reservation.STATUS.CANCELLED;
    this.cancelledAt = at;
    return this;
  }

  isCancelled() {
    return this.status === Reservation.STATUS.CANCELLED;
  }

  /**
   * Vérifie la validité de la réservation.
   * Règles : client et matériel obligatoires, quantité entière >= 1,
   * dates valides et date de fin jamais antérieure à la date de début.
   * @returns {{valid: boolean, errors: string[]}}
   */
  validate() {
    const errors = [];
    if (!this.clientId) errors.push("Le client est obligatoire.");
    if (!this.equipmentId) errors.push("Le materiel est obligatoire.");
    if (!Number.isInteger(this.quantity) || this.quantity < 1) {
      errors.push("La quantite doit etre un entier superieur ou egal a un.");
    }
    if (!this.startDate) errors.push("La date de debut est invalide.");
    if (!this.endDate) errors.push("La date de fin est invalide.");
    if (this.startDate && this.endDate && this.endDate.getTime() < this.startDate.getTime()) {
      errors.push("La date de fin ne peut pas preceder la date de debut.");
    }
    return { valid: errors.length === 0, errors };
  }

  isValid() {
    return this.validate().valid;
  }

  toPersistence() {
    return {
      clientId: this.clientId,
      clientName: this.clientName,
      clientEmail: this.clientEmail,
      equipmentId: this.equipmentId,
      equipmentName: this.equipmentName,
      dailyPrice: this.dailyPrice,
      quantity: this.quantity,
      startDate: this.startDate,
      endDate: this.endDate,
      days: this.days,
      totalPrice: this.totalPrice,
      status: this.status,
      cancelledAt: this.cancelledAt
    };
  }

  toJSON() {
    return {
      _id: this.id,
      clientId: this.clientId,
      clientName: this.clientName,
      clientEmail: this.clientEmail,
      equipmentId: this.equipmentId,
      equipmentName: this.equipmentName,
      dailyPrice: this.dailyPrice,
      quantity: this.quantity,
      startDate: this.startDate,
      endDate: this.endDate,
      days: this.days,
      totalPrice: this.totalPrice,
      status: this.status,
      cancelledAt: this.cancelledAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
