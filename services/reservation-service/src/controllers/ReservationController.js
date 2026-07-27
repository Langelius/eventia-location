/** Adapte le contrat REST des reservations vers le service applicatif. */
export default class ReservationController {
  /** @param {import("../domain/ReservationService.js").default} service */
  constructor(service) {
    this.service = service;
  }

  /** GET / -> 200, tableau des reservations. */
  list = async (req, res, next) => {
    try {
      res.status(200).json(await this.service.list());
    } catch (error) {
      next(error);
    }
  };

  /** GET /:id -> 200 + reservation, 404 si introuvable. */
  getById = async (req, res, next) => {
    try {
      res.status(200).json(await this.service.getById(req.params.id));
    } catch (error) {
      next(error);
    }
  };

  /** POST / -> 201, reservation enrichie (noms, prix total, statut). */
  create = async (req, res, next) => {
    try {
      res.status(201).json(await this.service.create(req.body));
    } catch (error) {
      next(error);
    }
  };

  /** PUT|PATCH /:id/cancel -> 200, reservation avec statut CANCELLED. */
  cancel = async (req, res, next) => {
    try {
      res.status(200).json(await this.service.cancel(req.params.id));
    } catch (error) {
      next(error);
    }
  };

  /** PUT /:id -> 200, reservation modifiee. */
  update = async (req, res, next) => {
    try {
      res.status(200).json(await this.service.update(req.params.id, req.body));
    } catch (error) {
      next(error);
    }
  };

  /** PUT /:id/reserve -> 200, quantite reservee augmentee. */
  reserve = async (req, res, next) => {
    try {
      res.status(200).json(await this.service.reserveMore(req.params.id, req.body?.quantity));
    } catch (error) {
      next(error);
    }
  };

  /** PUT /:id/release -> 200, quantite remise en inventaire. */
  release = async (req, res, next) => {
    try {
      res.status(200).json(await this.service.releaseSome(req.params.id, req.body?.quantity));
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
