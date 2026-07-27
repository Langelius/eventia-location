/** Adapte le contrat REST des notifications vers le service applicatif. */
export default class NotificationController {
  /** @param {import("../domain/NotificationService.js").default} service */
  constructor(service) {
    this.service = service;
  }

  /** GET / -> 200, notifications de la plus recente a la plus ancienne. */
  list = async (req, res, next) => {
    try {
      res.status(200).json(await this.service.list());
    } catch (error) {
      next(error);
    }
  };

  /** GET /:id -> 200 + notification, 404 si introuvable. */
  getById = async (req, res, next) => {
    try {
      res.status(200).json(await this.service.getById(req.params.id));
    } catch (error) {
      next(error);
    }
  };

  /** POST / -> 201, notification creee. */
  create = async (req, res, next) => {
    try {
      res.status(201).json(await this.service.create(req.body));
    } catch (error) {
      next(error);
    }
  };
}
