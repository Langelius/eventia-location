/**
 * Adapte les requêtes HTTP du contrat REST du matériel vers le service
 * applicatif. Aucune règle métier n'est écrite ici.
 */
export default class EquipmentController {
  /** @param {import("../domain/EquipmentService.js").default} service */
  constructor(service) {
    this.service = service;
  }

  /** GET / -> 200 + tableau des equipements. */
  list = async (req, res, next) => {
    try {
      res.status(200).json(await this.service.list());
    } catch (error) {
      next(error);
    }
  };

  /** GET /:id -> 200 + equipement, 404 si introuvable. */
  getById = async (req, res, next) => {
    try {
      res.status(200).json(await this.service.getById(req.params.id));
    } catch (error) {
      next(error);
    }
  };

  /** POST / -> 201 + equipement cree. */
  create = async (req, res, next) => {
    try {
      res.status(201).json(await this.service.create(req.body));
    } catch (error) {
      next(error);
    }
  };

  /** PUT /:id -> 200 + equipement modifie. */
  update = async (req, res, next) => {
    try {
      res.status(200).json(await this.service.update(req.params.id, req.body));
    } catch (error) {
      next(error);
    }
  };

  /** PUT /:id/reserve -> 200 + quantite soustraite, erreur si insuffisante. */
  reserve = async (req, res, next) => {
    try {
      res.status(200).json(await this.service.reserve(req.params.id, req.body?.quantity));
    } catch (error) {
      next(error);
    }
  };

  /** PUT /:id/release -> 200 + quantite remise dans l'inventaire. */
  release = async (req, res, next) => {
    try {
      res.status(200).json(await this.service.release(req.params.id, req.body?.quantity));
    } catch (error) {
      next(error);
    }
  };

  /** DELETE /:id -> 204. */
  remove = async (req, res, next) => {
    try {
      await this.service.remove(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
