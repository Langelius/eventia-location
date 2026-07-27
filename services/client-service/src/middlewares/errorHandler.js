import { AppError } from "../errors/AppError.js";

/** Route inconnue -> 404 au format attendu par le frontend. */
export function notFoundHandler(req, res) {
  res.status(404).json({ message: `Ressource introuvable : ${req.method} ${req.originalUrl}` });
}

/**
 * Middleware central de traitement des erreurs.
 * Il convertit les erreurs du domaine en réponses HTTP `{ message }`,
 * format attendu par le frontend fourni.
 */
export function errorHandler(error, req, res, next) { // eslint-disable-line no-unused-vars
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ message: error.message, details: error.details });
  }
  if (error?.code === 11000) {
    return res.status(409).json({ message: "Un client possede deja ce courriel." });
  }
  if (error?.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }
  if (error?.name === "CastError") {
    return res.status(400).json({ message: "Identifiant invalide." });
  }
  console.error(error);
  return res.status(500).json({ message: "Erreur interne du service client." });
}
