import Equipment from "./Equipment.js";
import { ConflictError, NotFoundError, ValidationError } from "../errors/AppError.js";

/**
 * Contient la logique applicative du service du matériel.
 *
 * Orchestre l'entité Equipment et son dépôt : gestion du catalogue,
 * validation des articles et application des règles de stock lors d'une
 * réservation ou d'une remise en disponibilité.
 */
export default class EquipmentService {
  /** @param {import("./EquipmentRepository.js").default} repository */
  constructor(repository) {
    this.repository = repository;
  }

  async list() {
    const documents = await this.repository.findAll();
    return documents.map((document) => Equipment.fromDocument(document).toJSON());
  }

  /** @throws {NotFoundError} */
  async getById(id) {
    const document = await this.repository.findById(id);
    if (!document) throw new NotFoundError("Materiel introuvable.");
    return Equipment.fromDocument(document).toJSON();
  }

  /** @throws {ValidationError} */
  async create(data) {
    const equipment = new Equipment(data);
    const { valid, errors } = equipment.validate();
    if (!valid) throw new ValidationError(errors.join(" "), errors);
    const created = await this.repository.create(equipment.toPersistence());
    return Equipment.fromDocument(created).toJSON();
  }

  /** @throws {NotFoundError} @throws {ValidationError} */
  async update(id, data) {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundError("Materiel introuvable.");

    const equipment = new Equipment({
      name: data.name ?? current.name,
      category: data.category ?? current.category,
      dailyPrice: data.dailyPrice ?? current.dailyPrice,
      availableQuantity: data.availableQuantity ?? current.availableQuantity
    });
    const { valid, errors } = equipment.validate();
    if (!valid) throw new ValidationError(errors.join(" "), errors);

    const updated = await this.repository.update(id, equipment.toPersistence());
    return Equipment.fromDocument(updated).toJSON();
  }

  /** @throws {NotFoundError} */
  async remove(id) {
    const deleted = await this.repository.deleteById(id);
    if (!deleted) throw new NotFoundError("Materiel introuvable.");
    return true;
  }

  /**
   * Réserve une quantité : la quantité disponible diminue.
   * Appelée par le service des réservations lors d'une confirmation.
   * @throws {ValidationError} quantité inférieure à un.
   * @throws {NotFoundError} matériel absent.
   * @throws {ConflictError} stock insuffisant.
   */
  async reserve(id, quantity) {
    const requested = EquipmentService.#requireQuantity(quantity);

    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundError("Materiel introuvable.");

    const equipment = Equipment.fromDocument(current);
    if (!equipment.canReserve(requested)) {
      throw new ConflictError(
        `Quantite insuffisante pour ${equipment.name} : ${equipment.availableQuantity} disponible(s), ${requested} demande(s).`
      );
    }

    const updated = await this.repository.decreaseQuantity(id, requested);
    if (!updated) throw new ConflictError("Quantite insuffisante pour ce materiel.");
    return Equipment.fromDocument(updated).toJSON();
  }

  /**
   * Remet une quantité dans l'inventaire (annulation d'une réservation).
   * @throws {ValidationError} @throws {NotFoundError}
   */
  async release(id, quantity) {
    const requested = EquipmentService.#requireQuantity(quantity);
    const updated = await this.repository.increaseQuantity(id, requested);
    if (!updated) throw new NotFoundError("Materiel introuvable.");
    return Equipment.fromDocument(updated).toJSON();
  }

  static #requireQuantity(quantity) {
    const requested = Number(quantity);
    if (!Number.isInteger(requested) || requested < 1) {
      throw new ValidationError("La quantite doit etre un entier superieur ou egal a un.");
    }
    return requested;
  }
}
