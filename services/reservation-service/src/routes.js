import { Router } from "express";

/**
 * Contrat REST du service des reservations :
 * http://localhost:4003/api/reservations
 *
 * GET    /             -> 200, tableau des reservations
 * POST   /             -> 201, reservation enrichie (noms, prix total, statut)
 * PUT    /:id/cancel   -> 200, reservation avec statut CANCELLED
 * PUT    /:id          -> 200, reservation modifiee
 * PUT    /:id/reserve  -> 200, augmente la quantite reservee
 * PUT    /:id/release  -> 200, remet une partie de la quantite en inventaire
 * DELETE /:id          -> 204
 *
 * PATCH est egalement accepte sur /:id/cancel : le frontend fourni (qui ne
 * doit pas etre modifie) appelle PATCH /:id/cancel, tandis que l'enonce
 * specifie PUT. Les deux verbes mènent a la meme operation.
 *
 * @param {import("./controllers/ReservationController.js").default} controller
 */
export default function createReservationRouter(controller) {
  const router = Router();
  router.get("/", controller.list);
  router.get("/:id", controller.getById);
  router.post("/", controller.create);
  router.put("/:id/cancel", controller.cancel);
  router.patch("/:id/cancel", controller.cancel);
  router.put("/:id/reserve", controller.reserve);
  router.patch("/:id/reserve", controller.reserve);
  router.put("/:id/release", controller.release);
  router.patch("/:id/release", controller.release);
  router.put("/:id", controller.update);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.remove);
  return router;
}
