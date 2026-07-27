/**
 * Adapte les requêtes HTTP du contrat REST vers le service applicatif.
 * Le contrôleur ne contient aucune règle métier : il lit la requête,
 * appelle le service et écrit le code de statut prévu par le contrat.
 */
export default class ClientController {
  /** @param {import("../domain/ClientService.js").default} service */
  constructor(service) {
    this.service = service;
  }

  /** GET /api/clients -> 200 + tableau des clients. */
  list = async (req, res, next) => {
    try {
      res.status(200).json(await this.service.list());
    } catch (error) {
      next(error);
    }
  };

  /** GET /api/clients/:id -> 200 + client, 404 si introuvable. */
  getById = async (req, res, next) => {
    try {
      res.status(200).json(await this.service.getById(req.params.id));
    } catch (error) {
      next(error);
    }
  };

  /** POST /api/clients -> 201 + client créé. */
  create = async (req, res, next) => {
    try {
      res.status(201).json(await this.service.create(req.body));
    } catch (error) {
      next(error);
    }
  };

  /** PUT /api/clients/:id -> 200 + client modifié. */
  update = async (req, res, next) => {
    try {
      res.status(200).json(await this.service.update(req.params.id, req.body));
    } catch (error) {
      next(error);
    }
  };

  /** DELETE /api/clients/:id -> 204 sans contenu. */
  remove = async (req, res, next) => {
    try {
      await this.service.remove(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
