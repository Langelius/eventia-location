import "dotenv/config";
import express from "express";
import cors from "cors";

import { connectDatabase } from "./config/db.js";
import ClientModel from "./models/ClientModel.js";
import ClientRepository from "./domain/ClientRepository.js";
import ClientService from "./domain/ClientService.js";
import ClientController from "./controllers/ClientController.js";
import createClientRouter from "./routes.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";

const PORT = Number(process.env.PORT || 4001);
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/eventia_clients";

/** Assemblage des dépendances : Modele -> Repository -> Service -> Controller. */
export function createApp() {
  const repository = new ClientRepository(ClientModel);
  const service = new ClientService(repository);
  const controller = new ClientController(service);

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.get("/health", (req, res) => res.json({ service: "client-service", status: "UP" }));
  app.use("/api/clients", createClientRouter(controller));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

export async function start() {
  await connectDatabase(MONGO_URI);
  const app = createApp();
  return app.listen(PORT, () => console.log(`client-service sur le port ${PORT}`));
}

start().catch((error) => {
  console.error("Demarrage impossible du client-service :", error.message);
  process.exit(1);
});
