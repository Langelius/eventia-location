import axios from "axios";

/**
 * Implémentation de l'interface INotificationAPI du diagramme de classes.
 *
 * L'envoi d'une notification est un effet secondaire : un échec ne doit pas
 * faire échouer la réservation elle-même, il est donc journalisé et absorbé.
 */
export default class NotificationApi {
  /** @param {string} baseUrl racine du service notification (ex. http://localhost:4004) */
  constructor(baseUrl, timeout = 5000) {
    this.http = axios.create({ baseURL: `${baseUrl.replace(/\/$/, "")}/api/notifications`, timeout });
  }

  /**
   * POST /api/notifications — enregistre une notification.
   * @returns {Promise<object|null>} la notification creee, ou null en cas d'echec.
   */
  async create({ recipient, message, type }) {
    try {
      const { data } = await this.http.post("/", { recipient, message, type });
      return data;
    } catch (error) {
      console.error("Notification non enregistree :", error.response?.data?.message || error.message);
      return null;
    }
  }
}
