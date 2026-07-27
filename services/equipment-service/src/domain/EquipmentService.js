/**
 * Contient la logique applicative du service du matériel.
 *
 * Cette classe orchestre l’entité Equipment et son dépôt. Elle doit gérer le
 * catalogue, valider les nouveaux articles et appliquer les règles de stock
 * lors d’une réservation ou d’une remise en disponibilité.
 *
 * Travail demandé :
 * - recevoir le dépôt de matériel;
 * - exposer les opérations requises par les contrats REST;
 * - valider les données avant la création;
 * - empêcher une réservation lorsque le matériel est absent ou insuffisant;
 * - diminuer ou augmenter la quantité disponible de façon cohérente;
 * - produire des erreurs compréhensibles lorsque l’opération est impossible.
 *
 * Cette classe ne doit pas traiter directement les objets req et res.
 */
export default class EquipmentService {
}
