import { Router } from "express";

/**
 * Contrat REST du service des clients : http://localhost:4001/api/clients
 *
 * GET    /      -> 200, tableau des clients
 * GET    /:id   -> 200 + client, 404 si introuvable
 * POST   /      -> 201 + client cree      { name, email, phone }
 * PUT    /:id   -> 200 + client modifie   { name, email, phone }
 * DELETE /:id   -> 204
 *
 * @param {import("./controllers/ClientController.js").default} controller
 */
export default function createClientRouter(controller) {
  const router = Router();
  router.get("/", controller.list);
  router.get("/:id", controller.getById);
  router.post("/", controller.create);
  router.put("/:id", controller.update);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.remove);
  return router;
}
