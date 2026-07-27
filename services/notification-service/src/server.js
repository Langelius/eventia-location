import "dotenv/config";
import express from "express";
import cors from "cors";

import { connectDatabase } from "./config/db.js";
import NotificationModel from "./models/NotificationModel.js";
import NotificationRepository from "./domain/NotificationRepository.js";
import NotificationService from "./domain/NotificationService.js";
import NotificationController from "./controllers/NotificationController.js";
import createNotificationRouter from "./routes.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";

const PORT = Number(process.env.PORT || 4004);
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/eventia_notifications";

export function createApp() {
  const repository = new NotificationRepository(NotificationModel);
  const service = new NotificationService(repository);
  const controller = new NotificationController(service);

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.get("/health", (req, res) => res.json({ service: "notification-service", status: "UP" }));
  app.use("/api/notifications", createNotificationRouter(controller));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

export async function start() {
  await connectDatabase(MONGO_URI);
  const app = createApp();
  return app.listen(PORT, () => console.log(`notification-service sur le port ${PORT}`));
}

start().catch((error) => {
  console.error("Demarrage impossible du notification-service :", error.message);
  process.exit(1);
});
