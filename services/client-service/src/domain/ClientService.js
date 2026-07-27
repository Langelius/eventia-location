import Client from "./Client.js";
import { ConflictError, NotFoundError, ValidationError } from "../errors/AppError.js";

/**
 * Contient la logique applicative du service des clients.
 *
 * Intermédiaire entre le contrôleur REST, l'entité Client et le dépôt.
 * Elle applique les règles métier (validité des données, unicité du courriel)
 * puis délègue la persistance au dépôt. Aucune dépendance Express ou Mongoose.
 */
export default class ClientService {
  /** @param {import("./ClientRepository.js").default} repository */
  constructor(repository) {
    this.repository = repository;
  }

  /** Liste tous les clients. @returns {Promise<object[]>} */
  async list() {
    const documents = await this.repository.findAll();
    return documents.map((document) => Client.fromDocument(document).toJSON());
  }

  /** Consulte un client. @throws {NotFoundError} */
  async getById(id) {
    const document = await this.repository.findById(id);
    if (!document) throw new NotFoundError("Client introuvable.");
    return Client.fromDocument(document).toJSON();
  }

  /**
   * Enregistre un nouveau client.
   * @throws {ValidationError} données incomplètes ou invalides.
   * @throws {ConflictError} courriel déjà utilisé.
   */
  async create(data) {
    const client = new Client(data);
    const { valid, errors } = client.validate();
    if (!valid) throw new ValidationError(errors.join(" "), errors);

    const existing = await this.repository.findByEmail(client.email);
    if (existing) throw new ConflictError("Un client possede deja ce courriel.");

    const created = await this.repository.create(client.toPersistence());
    return Client.fromDocument(created).toJSON();
  }

  /**
   * Modifie un client existant.
   * @throws {ValidationError} @throws {NotFoundError} @throws {ConflictError}
   */
  async update(id, data) {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundError("Client introuvable.");

    const client = new Client({
      name: data.name ?? current.name,
      email: data.email ?? current.email,
      phone: data.phone ?? current.phone
    });
    const { valid, errors } = client.validate();
    if (!valid) throw new ValidationError(errors.join(" "), errors);

    const owner = await this.repository.findByEmail(client.email);
    if (owner && String(owner._id) !== String(current._id)) {
      throw new ConflictError("Un client possede deja ce courriel.");
    }

    const updated = await this.repository.update(id, client.toPersistence());
    return Client.fromDocument(updated).toJSON();
  }

  /** Supprime un client. @throws {NotFoundError} */
  async remove(id) {
    const deleted = await this.repository.deleteById(id);
    if (!deleted) throw new NotFoundError("Client introuvable.");
    return true;
  }
}
