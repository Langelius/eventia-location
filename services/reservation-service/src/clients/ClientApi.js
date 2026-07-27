import axios from "axios";
import { AppError, NotFoundError } from "../errors/AppError.js";

/**
 * Implémentation de l'interface IClientAPI du diagramme de classes.
 * Seul point du service qui connaît l'adresse du service client.
 */
export default class ClientApi {
  /**
   * @param {string} baseUrl racine du service client (ex. http://localhost:4001)
   * @param {number} timeout delai maximal d'un appel, en millisecondes
   */
  constructor(baseUrl, timeout = 5000) {
    this.http = axios.create({ baseURL: `${baseUrl.replace(/\/$/, "")}/api/clients`, timeout });
  }

  /**
   * GET /api/clients/:id — valide l'existence du client.
   * @returns {Promise<object>} le client
   * @throws {NotFoundError} client absent
   * @throws {AppError} service client injoignable
   */
  async getById(id) {
    try {
      const { data } = await this.http.get(`/${id}`);
      return data;
    } catch (error) {
      if (error.response?.status === 404) throw new NotFoundError("Client introuvable.");
      if (error.response) {
        throw new AppError(error.response.data?.message || "Erreur du service client.", error.response.status);
      }
      throw new AppError("Le service client est injoignable.", 503);
    }
  }
}
