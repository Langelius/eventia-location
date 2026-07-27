import { Router } from "express";

/**
 * Contrat REST du service des notifications :
 * http://localhost:4004/api/notifications
 *
 * GET  /    -> 200, notifications de la plus recente a la plus ancienne
 * POST /    -> 201, notification creee   { recipient, message, type }
 *
 * Ce service n'est jamais appele directement par le frontend en ecriture :
 * les notifications sont declenchees par le service des reservations.
 *
 * @param {import("./controllers/NotificationController.js").default} controller
 */
export default function createNotificationRouter(controller) {
  const router = Router();
  router.get("/", controller.list);
  router.get("/:id", controller.getById);
  router.post("/", controller.create);
  return router;
}
