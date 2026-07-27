import { AppError } from "../errors/AppError.js";

export function notFoundHandler(req, res) {
  res.status(404).json({ message: `Ressource introuvable : ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, req, res, next) { // eslint-disable-line no-unused-vars
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ message: error.message, details: error.details });
  }
  if (error?.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }
  if (error?.name === "CastError") {
    return res.status(400).json({ message: "Identifiant invalide." });
  }
  console.error(error);
  return res.status(500).json({ message: "Erreur interne du service reservation." });
}
