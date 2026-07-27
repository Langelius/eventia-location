/**
 * Hiérarchie d'erreurs applicatives.
 *
 * Chaque erreur porte le code HTTP qui doit être retourné au client. Les
 * couches domaine et service lèvent ces erreurs; seul le middleware de
 * gestion d'erreurs connaît Express.
 */
export class AppError extends Error {
  constructor(message, statusCode = 400, details = undefined) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message, details) {
    super(message, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message) {
    super(message, 409);
  }
}
