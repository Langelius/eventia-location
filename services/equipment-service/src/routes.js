import { Router } from "express";

/**
 * Contrat REST du service du materiel : http://localhost:4002/api/equipments
 *
 * GET    /             -> 200, tableau des equipements
 * GET    /:id          -> 200 + equipement, 404 si introuvable
 * POST   /             -> 201 + equipement cree
 * PUT    /:id          -> 200 + equipement modifie
 * PUT    /:id/reserve  -> 200 + soustraction de la quantite, erreur si insuffisante
 * PUT    /:id/release  -> 200, remet la quantite
 * DELETE /:id          -> 204
 *
 * PATCH est accepte en plus de PUT sur les operations de stock afin de rester
 * compatible avec tout appelant qui utiliserait ce verbe.
 *
 * @param {import("./controllers/EquipmentController.js").default} controller
 */
export default function createEquipmentRouter(controller) {
  const router = Router();
  router.get("/", controller.list);
  router.get("/:id", controller.getById);
  router.post("/", controller.create);
  router.put("/:id/reserve", controller.reserve);
  router.patch("/:id/reserve", controller.reserve);
  router.put("/:id/release", controller.release);
  router.patch("/:id/release", controller.release);
  router.put("/:id", controller.update);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.remove);
  return router;
}
