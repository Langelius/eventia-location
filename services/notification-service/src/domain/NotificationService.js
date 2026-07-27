/**
 * Contient la logique applicative du service des notifications.
 *
 * Cette classe est utilisée par les routes REST pour consulter l’historique ou
 * créer une notification. Elle doit construire une entité Notification,
 * vérifier sa validité, puis demander au dépôt de l’enregistrer.
 *
 * Travail demandé :
 * - recevoir le dépôt de notifications;
 * - fournir les opérations attendues par les routes;
 * - valider une notification avant sa persistance;
 * - signaler une notification incomplète ou invalide.
 *
 * Cette classe ne doit pas manipuler directement Express ou Mongoose.
 */
export default class NotificationService {
}
