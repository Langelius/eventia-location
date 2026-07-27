import axios from "axios";
import { AppError, ConflictError, NotFoundError } from "../errors/AppError.js";

/**
 * Implémentation de l'interface IMaterielAPI du diagramme de classes.
 * Encapsule les appels REST vers le service du matériel.
 */
export default class EquipmentApi {
  /** @param {string} baseUrl racine du service materiel (ex. http://localhost:4002) */
  constructor(baseUrl, timeout = 5000) {
    this.http = axios.create({ baseURL: `${baseUrl.replace(/\/$/, "")}/api/equipments`, timeout });
  }

  /** GET /api/equipments/:id — valide l'existence du materiel. */
  async getById(id) {
    try {
      const { data } = await this.http.get(`/${id}`);
      return data;
    } catch (error) {
      throw EquipmentApi.#translate(error, "Materiel introuvable.");
    }
  }

  /** PUT /api/equipments/:id/reserve — diminue la quantite disponible. */
  async reserve(id, quantity) {
    try {
      const { data } = await this.http.put(`/${id}/reserve`, { quantity });
      return data;
    } catch (error) {
      throw EquipmentApi.#translate(error, "Materiel introuvable.");
    }
  }

  /** PUT /api/equipments/:id/release — remet la quantite dans l'inventaire. */
  async release(id, quantity) {
    try {
      const { data } = await this.http.put(`/${id}/release`, { quantity });
      return data;
    } catch (error) {
      throw EquipmentApi.#translate(error, "Materiel introuvable.");
    }
  }

  static #translate(error, notFoundMessage) {
    const status = error.response?.status;
    const message = error.response?.data?.message;
    if (status === 404) return new NotFoundError(message || notFoundMessage);
    if (status === 409) return new ConflictError(message || "Quantite insuffisante pour ce materiel.");
    if (error.response) return new AppError(message || "Erreur du service materiel.", status);
    return new AppError("Le service materiel est injoignable.", 503);
  }
}
