import "dotenv/config";
import express from "express";
import cors from "cors";

import { connectDatabase } from "./config/db.js";
import EquipmentModel from "./models/EquipmentModel.js";
import EquipmentRepository from "./domain/EquipmentRepository.js";
import EquipmentService from "./domain/EquipmentService.js";
import EquipmentController from "./controllers/EquipmentController.js";
import createEquipmentRouter from "./routes.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";

const PORT = Number(process.env.PORT || 4002);
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/eventia_equipments";

export function createApp() {
  const repository = new EquipmentRepository(EquipmentModel);
  const service = new EquipmentService(repository);
  const controller = new EquipmentController(service);

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.get("/health", (req, res) => res.json({ service: "equipment-service", status: "UP" }));
  app.use("/api/equipments", createEquipmentRouter(controller));
  // Alias accepte l'orthographe francaise utilisee dans l'enonce.
  app.use("/api/equipements", createEquipmentRouter(controller));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

export async function start() {
  await connectDatabase(MONGO_URI);
  const app = createApp();
  return app.listen(PORT, () => console.log(`equipment-service sur le port ${PORT}`));
}

start().catch((error) => {
  console.error("Demarrage impossible du equipment-service :", error.message);
  process.exit(1);
});
