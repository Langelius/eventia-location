import Reservation from "./Reservation.js";
import { ConflictError, NotFoundError, ValidationError } from "../errors/AppError.js";

/**
 * Orchestre le cas d'utilisation principal de réservation.
 *
 * Pour CONFIRMER une réservation, ce service :
 *   1. valide les données reçues (entité Reservation);
 *   2. vérifie l'existence du client   -> GET  /api/clients/:id
 *   3. vérifie l'existence du matériel -> GET  /api/equipments/:id
 *   4. réserve la quantité demandée    -> PUT  /api/equipments/:id/reserve
 *   5. calcule le total et enregistre la réservation;
 *   6. produit une notification        -> POST /api/notifications
 *
 * Pour ANNULER une réservation, il remet la quantité en disponibilité
 * (PUT /api/equipments/:id/release), change l'état puis produit une nouvelle
 * notification.
 *
 * Cette classe ne manipule ni req/res ni Mongoose directement.
 */
export default class ReservationService {
  /**
   * @param {import("./ReservationRepository.js").default} repository
   * @param {{clientApi: object, equipmentApi: object, notificationApi: object}} apis
   */
  constructor(repository, { clientApi, equipmentApi, notificationApi }) {
    this.repository = repository;
    this.clientApi = clientApi;
    this.equipmentApi = equipmentApi;
    this.notificationApi = notificationApi;
  }

  /** GET / : liste des reservations. */
  async list() {
    const documents = await this.repository.findAll();
    return documents.map((document) => Reservation.fromDocument(document).toJSON());
  }

  /** @throws {NotFoundError} */
  async getById(id) {
    const document = await this.repository.findById(id);
    if (!document) throw new NotFoundError("Reservation introuvable.");
    return Reservation.fromDocument(document).toJSON();
  }

  /**
   * POST / : cree une reservation confirmee.
   * @throws {ValidationError} données invalides
   * @throws {NotFoundError} client ou matériel absent
   * @throws {ConflictError} stock insuffisant
   */
  async create(payload) {
    const reservation = new Reservation(payload);
    const { valid, errors } = reservation.validate();
    if (!valid) throw new ValidationError(errors.join(" "), errors);

    // 1. Validation du client aupres du service client.
    const client = await this.clientApi.getById(reservation.clientId);
    reservation.applyClient(client);

    // 2. Validation du materiel aupres du service materiel.
    const equipment = await this.equipmentApi.getById(reservation.equipmentId);
    if (equipment.availableQuantity < reservation.quantity) {
      throw new ConflictError(
        `Quantite insuffisante pour ${equipment.name} : ${equipment.availableQuantity} disponible(s), ${reservation.quantity} demande(s).`
      );
    }

    // 3. Reservation effective du stock (operation atomique cote materiel).
    await this.equipmentApi.reserve(reservation.equipmentId, reservation.quantity);

    // 4. Calcul du total puis enregistrement.
    reservation.applyEquipment(equipment);
    let created;
    try {
      created = await this.repository.create(reservation.toPersistence());
    } catch (error) {
      // Compensation : le stock a deja ete decremente, on le remet en place.
      await this.#safeRelease(reservation.equipmentId, reservation.quantity);
      throw error;
    }

    const saved = Reservation.fromDocument(created);

    // 5. Notification (effet secondaire, sans incidence sur la reservation).
    await this.notificationApi.create({
      recipient: saved.clientEmail || saved.clientName,
      type: "RESERVATION_CONFIRMED",
      message:
        `Reservation confirmee : ${saved.quantity} x ${saved.equipmentName} ` +
        `du ${ReservationService.#day(saved.startDate)} au ${ReservationService.#day(saved.endDate)} ` +
        `(${saved.days} jour(s)) pour un total de ${saved.totalPrice} $.`
    });

    return saved.toJSON();
  }

  /**
   * PUT|PATCH /:id/cancel : annule une reservation confirmee.
   * @throws {NotFoundError} @throws {ConflictError} deja annulee
   */
  async cancel(id) {
    const document = await this.repository.findById(id);
    if (!document) throw new NotFoundError("Reservation introuvable.");

    const reservation = Reservation.fromDocument(document);
    if (reservation.isCancelled()) throw new ConflictError("Cette reservation est deja annulee.");

    // Remise du materiel dans l'inventaire.
    await this.equipmentApi.release(reservation.equipmentId, reservation.quantity);

    reservation.cancel();
    const updated = await this.repository.update(id, {
      status: reservation.status,
      cancelledAt: reservation.cancelledAt
    });
    const saved = Reservation.fromDocument(updated);

    await this.notificationApi.create({
      recipient: saved.clientEmail || saved.clientName,
      type: "RESERVATION_CANCELLED",
      message:
        `Reservation annulee : ${saved.quantity} x ${saved.equipmentName} ` +
        `du ${ReservationService.#day(saved.startDate)} au ${ReservationService.#day(saved.endDate)}. ` +
        `Le materiel a ete remis en inventaire.`
    });

    return saved.toJSON();
  }

  /**
   * PUT /:id : modifie la quantite et/ou la periode d'une reservation
   * confirmee, en ajustant le stock du materiel de la difference.
   * @throws {NotFoundError} @throws {ValidationError} @throws {ConflictError}
   */
  async update(id, payload) {
    const document = await this.repository.findById(id);
    if (!document) throw new NotFoundError("Reservation introuvable.");

    const current = Reservation.fromDocument(document);
    if (current.isCancelled()) throw new ConflictError("Une reservation annulee ne peut plus etre modifiee.");

    const updatedReservation = new Reservation({
      ...current.toJSON(),
      quantity: payload.quantity ?? current.quantity,
      startDate: payload.startDate ?? current.startDate,
      endDate: payload.endDate ?? current.endDate,
      days: undefined,
      totalPrice: undefined
    });
    const { valid, errors } = updatedReservation.validate();
    if (!valid) throw new ValidationError(errors.join(" "), errors);

    const difference = updatedReservation.quantity - current.quantity;
    if (difference > 0) await this.equipmentApi.reserve(current.equipmentId, difference);
    if (difference < 0) await this.equipmentApi.release(current.equipmentId, -difference);

    const equipment = await this.equipmentApi.getById(current.equipmentId);
    updatedReservation.applyEquipment(equipment);

    const saved = await this.repository.update(id, updatedReservation.toPersistence());
    return Reservation.fromDocument(saved).toJSON();
  }

  /** PUT /:id/reserve : augmente la quantite reservee. */
  async reserveMore(id, quantity) {
    const requested = ReservationService.#requireQuantity(quantity);
    const document = await this.repository.findById(id);
    if (!document) throw new NotFoundError("Reservation introuvable.");
    const current = Reservation.fromDocument(document);
    if (current.isCancelled()) throw new ConflictError("Une reservation annulee ne peut plus etre modifiee.");
    return this.update(id, { quantity: current.quantity + requested });
  }

  /** PUT /:id/release : diminue la quantite reservee et remet le reste en stock. */
  async releaseSome(id, quantity) {
    const requested = ReservationService.#requireQuantity(quantity);
    const document = await this.repository.findById(id);
    if (!document) throw new NotFoundError("Reservation introuvable.");
    const current = Reservation.fromDocument(document);
    if (current.isCancelled()) throw new ConflictError("Une reservation annulee ne peut plus etre modifiee.");
    if (requested > current.quantity) {
      throw new ValidationError("Impossible de liberer plus que la quantite reservee.");
    }
    if (requested === current.quantity) return this.cancel(id);
    return this.update(id, { quantity: current.quantity - requested });
  }

  /**
   * DELETE /:id : supprime la reservation et libere le stock si elle etait
   * encore confirmee.
   * @throws {NotFoundError}
   */
  async remove(id) {
    const document = await this.repository.findById(id);
    if (!document) throw new NotFoundError("Reservation introuvable.");

    const reservation = Reservation.fromDocument(document);
    if (!reservation.isCancelled()) {
      await this.#safeRelease(reservation.equipmentId, reservation.quantity);
    }
    await this.repository.deleteById(id);
    return true;
  }

  /** Remise en stock « au mieux » utilisee par les compensations. */
  async #safeRelease(equipmentId, quantity) {
    try {
      await this.equipmentApi.release(equipmentId, quantity);
    } catch (error) {
      console.error("Compensation impossible sur le materiel", equipmentId, error.message);
    }
  }

  static #requireQuantity(quantity) {
    const requested = Number(quantity);
    if (!Number.isInteger(requested) || requested < 1) {
      throw new ValidationError("La quantite doit etre un entier superieur ou egal a un.");
    }
    return requested;
  }

  static #day(date) {
    return date ? new Date(date).toISOString().slice(0, 10) : "";
  }
}
