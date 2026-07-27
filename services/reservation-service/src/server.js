import "dotenv/config";
import express from "express";
import cors from "cors";

import { connectDatabase } from "./config/db.js";
import ReservationModel from "./models/ReservationModel.js";
import ReservationRepository from "./domain/ReservationRepository.js";
import ReservationService from "./domain/ReservationService.js";
import ReservationController from "./controllers/ReservationController.js";
import ClientApi from "./clients/ClientApi.js";
import EquipmentApi from "./clients/EquipmentApi.js";
import NotificationApi from "./clients/NotificationApi.js";
import createReservationRouter from "./routes.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";

const PORT = Number(process.env.PORT || 4003);
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/eventia_reservations";
const CLIENT_SERVICE_URL = process.env.CLIENT_SERVICE_URL || "http://localhost:4001";
const EQUIPMENT_SERVICE_URL = process.env.EQUIPMENT_SERVICE_URL || "http://localhost:4002";
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || "http://localhost:4004";

export function createApp() {
  const repository = new ReservationRepository(ReservationModel);
  const service = new ReservationService(repository, {
    clientApi: new ClientApi(CLIENT_SERVICE_URL),
    equipmentApi: new EquipmentApi(EQUIPMENT_SERVICE_URL),
    notificationApi: new NotificationApi(NOTIFICATION_SERVICE_URL)
  });
  const controller = new ReservationController(service);

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.get("/health", (req, res) => res.json({ service: "reservation-service", status: "UP" }));
  app.use("/api/reservations", createReservationRouter(controller));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

export async function start() {
  await connectDatabase(MONGO_URI);
  const app = createApp();
  return app.listen(PORT, () => console.log(`reservation-service sur le port ${PORT}`));
}

start().catch((error) => {
  console.error("Demarrage impossible du reservation-service :", error.message);
  process.exit(1);
});
