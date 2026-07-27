# Livrable 2 — User stories

**Projet :** Eventia Location
**Format :** `En tant que <rôle>, je veux <but> afin de <bénéfice>` + critères d'acceptation en **Gherkin** (Étant donné / Lorsque / Alors).
**Rôles :** Préposée aux réservations · Responsable de l'inventaire · Directrice · Comptable
**Version :** 1.0

Chaque story indique les exigences fonctionnelles couvertes (voir `01-exigences-fonctionnelles.md`) et la branche `feature/*` qui la réalise.

---

## Épopée 1 — Gestion des clients (`feature/client-service`)

### US-01 — Enregistrer un client
> **En tant que** préposée, **je veux** enregistrer un client avec son nom, son courriel et son téléphone **afin de** ne plus dépendre de la feuille de calcul.

*Couvre EF-01, EF-07 · Estimation : 3 points*

**Critères d'acceptation**

- **CA-1** Étant donné un formulaire rempli avec un nom, un courriel valide et un téléphone, lorsque j'enregistre, alors le client est créé et la réponse est **HTTP 201** avec le client et son identifiant.
- **CA-2** Étant donné un formulaire dont un champ obligatoire est vide, lorsque j'enregistre, alors la création est refusée avec **HTTP 400** et un message explicatif.
- **CA-3** Étant donné un courriel au format invalide (`marie.eventia`), lorsque j'enregistre, alors la création est refusée avec **HTTP 400**.
- **CA-4** Étant donné un courriel saisi en majuscules, lorsque le client est créé, alors le courriel est conservé en minuscules.

### US-02 — Empêcher les doublons de clients
> **En tant que** directrice, **je veux** que le courriel d'un client soit unique **afin d'**éviter les fiches en double et les erreurs de facturation.

*Couvre EF-06 · Estimation : 2 points*

- **CA-1** Étant donné un client existant `marie@eventia.ca`, lorsque j'enregistre un second client avec ce courriel, alors la création est refusée avec **HTTP 409** et le message « Un client possède déjà ce courriel ».
- **CA-2** Étant donné deux clients existants, lorsque je modifie le second pour lui donner le courriel du premier, alors la modification est refusée avec **HTTP 409**.
- **CA-3** Étant donné un client existant, lorsque je le modifie **sans changer son courriel**, alors la modification est acceptée (**HTTP 200**).

### US-03 — Consulter, modifier et supprimer un client
> **En tant que** préposée, **je veux** consulter, modifier et supprimer les fiches clients **afin de** garder des coordonnées à jour.

*Couvre EF-02, EF-03, EF-04, EF-05 · Estimation : 3 points*

- **CA-1** Lorsque j'ouvre la section « clients », alors la liste complète s'affiche avec le nom, le courriel et le téléphone de chacun (**HTTP 200**).
- **CA-2** Étant donné un identifiant inconnu, lorsque je consulte le client, alors la réponse est **HTTP 404**.
- **CA-3** Étant donné un client existant, lorsque je modifie son téléphone, alors la réponse est **HTTP 200** et la nouvelle valeur est persistée.
- **CA-4** Étant donné un client existant, lorsque je le supprime, alors la réponse est **HTTP 204** et il n'apparaît plus dans la liste.

---

## Épopée 2 — Gestion du matériel (`feature/equipment-service`)

### US-04 — Ajouter du matériel au catalogue
> **En tant que** responsable de l'inventaire, **je veux** ajouter du matériel avec un nom, une catégorie, un prix quotidien et une quantité disponible **afin de** rendre ce matériel louable.

*Couvre EF-08, EF-15 · Estimation : 3 points*

- **CA-1** Étant donné un formulaire valide, lorsque j'ajoute le matériel, alors la réponse est **HTTP 201** avec l'article créé.
- **CA-2** Étant donné un prix quotidien négatif, lorsque j'ajoute le matériel, alors la création est refusée avec **HTTP 400**.
- **CA-3** Étant donné une quantité disponible non entière ou négative, lorsque j'ajoute le matériel, alors la création est refusée avec **HTTP 400**.
- **CA-4** Étant donné un prix transmis sous forme de chaîne (`"45.5"`), lorsque le matériel est créé, alors il est stocké comme un nombre (`45.5`).

### US-05 — Consulter, modifier et supprimer le matériel
> **En tant que** responsable de l'inventaire, **je veux** consulter, modifier et supprimer le matériel **afin de** maintenir un catalogue exact.

*Couvre EF-09, EF-10, EF-11, EF-12 · Estimation : 3 points*

- **CA-1** Lorsque j'ouvre la section « matériel », alors la liste complète s'affiche avec le prix quotidien et la quantité disponible (**HTTP 200**).
- **CA-2** Étant donné un identifiant inconnu, lorsque je consulte le matériel, alors la réponse est **HTTP 404**.
- **CA-3** Étant donné un matériel existant, lorsque je modifie son prix, alors la réponse est **HTTP 200** et la nouvelle valeur est persistée.
- **CA-4** Étant donné un matériel existant, lorsque je le supprime, alors la réponse est **HTTP 204**.

### US-06 — Réserver et libérer une quantité de stock
> **En tant que** responsable de l'inventaire, **je veux** que la quantité disponible diminue à la confirmation et remonte à l'annulation **afin que** l'inventaire reflète toujours la réalité.

*Couvre EF-13, EF-14, EF-16 · Estimation : 5 points*

- **CA-1** Étant donné un matériel à 10 unités, lorsque `PUT /:id/reserve {quantity: 3}` est appelé, alors la réponse est **HTTP 200** et la quantité disponible passe à **7**.
- **CA-2** Étant donné un matériel à 7 unités, lorsque `reserve {quantity: 999}` est appelé, alors la réponse est **HTTP 409** et la quantité reste **7**.
- **CA-3** Étant donné une quantité demandée inférieure à 1, lorsque `reserve` est appelé, alors la réponse est **HTTP 400**.
- **CA-4** Étant donné un matériel à 7 unités, lorsque `PUT /:id/release {quantity: 3}` est appelé, alors la réponse est **HTTP 200** et la quantité disponible revient à **10**.
- **CA-5** Étant donné deux demandes simultanées de 6 unités sur un matériel à 10 unités, lorsqu'elles sont traitées, alors une seule réussit et la quantité disponible ne devient jamais négative.

---

## Épopée 3 — Gestion des réservations (`feature/reservation-service`)

### US-07 — Créer une réservation valide
> **En tant que** préposée, **je veux** créer une réservation en choisissant un client, un matériel, une quantité et une période **afin de** remplacer le processus manuel.

*Couvre EF-17, EF-25, EF-29 · Estimation : 8 points*

- **CA-1** Étant donné un client existant, un matériel disponible et une période valide, lorsque je réserve, alors la réponse est **HTTP 201** et la réservation contient `clientName`, `equipmentName`, `totalPrice` et `status = CONFIRMED`.
- **CA-2** Lorsque j'ouvre la section « réservations », alors chaque ligne affiche le nom du client, le nom du matériel, les dates, le total et le statut.
- **CA-3** Étant donné une réservation créée, alors elle apparaît en tête de liste (la plus récente en premier).

### US-08 — Valider les données d'une réservation
> **En tant que** directrice, **je veux** que le système refuse les réservations incohérentes **afin d'**éliminer les erreurs de saisie.

*Couvre EF-18, EF-19, EF-20, EF-21, EF-22 · Estimation : 5 points*

- **CA-1** Étant donné un identifiant de client inconnu, lorsque je réserve, alors la réponse est **HTTP 404** avec « Client introuvable » et **aucune** quantité n'est retirée du stock.
- **CA-2** Étant donné un identifiant de matériel inconnu, lorsque je réserve, alors la réponse est **HTTP 404** avec « Matériel introuvable ».
- **CA-3** Étant donné une date de fin antérieure à la date de début, lorsque je réserve, alors la réponse est **HTTP 400** avec « La date de fin ne peut pas précéder la date de début ».
- **CA-4** Étant donné une quantité de 0 ou négative, lorsque je réserve, alors la réponse est **HTTP 400**.
- **CA-5** Étant donné une quantité demandée supérieure à la quantité disponible, lorsque je réserve, alors la réponse est **HTTP 409** et le stock reste inchangé.

### US-09 — Calculer automatiquement le prix total
> **En tant que** comptable, **je veux** que le prix total soit calculé automatiquement **afin de** supprimer les erreurs de calcul manuel.

*Couvre EF-24 · Estimation : 3 points*

- **CA-1** Étant donné un matériel à 50 $/jour, une quantité de 2 et une période du 1er au 3 août, lorsque je réserve, alors `days = 3` et `totalPrice = 300` (3 × 2 × 50).
- **CA-2** Étant donné une réservation du 10 au 10 septembre, alors `days = 1` (le premier et le dernier jour comptent).
- **CA-3** Étant donné un prix quotidien décimal, alors le total est arrondi au cent près.
- **CA-4** Le prix quotidien utilisé est celui **fourni par le service du matériel** au moment de la réservation, et il est conservé dans la réservation.

### US-10 — Décrémenter le stock à la confirmation
> **En tant que** responsable de l'inventaire, **je veux** que la quantité disponible diminue dès la confirmation **afin d'**empêcher les doubles réservations.

*Couvre EF-23 · Estimation : 3 points*

- **CA-1** Étant donné un matériel à 10 unités, lorsqu'une réservation de 2 unités est confirmée, alors la quantité disponible affichée devient **8**.
- **CA-2** Étant donné qu'une réservation échoue après le retrait du stock (panne d'enregistrement), alors la quantité retirée est **remise** dans l'inventaire (compensation).

### US-11 — Annuler une réservation
> **En tant que** préposée, **je veux** annuler une réservation **afin de** remettre le matériel en location.

*Couvre EF-26, EF-27, EF-28 · Estimation : 5 points*

- **CA-1** Étant donné une réservation `CONFIRMED`, lorsque je l'annule, alors la réponse est **HTTP 200** et son statut devient **CANCELLED**.
- **CA-2** Lorsqu'une réservation de 2 unités est annulée, alors la quantité disponible du matériel augmente de **2**.
- **CA-3** Étant donné une réservation déjà `CANCELLED`, lorsque je l'annule à nouveau, alors la réponse est **HTTP 409** et le stock n'est **pas** crédité une seconde fois.
- **CA-4** Le bouton « Annuler » du frontend (`PATCH /:id/cancel`) et le verbe de l'énoncé (`PUT /:id/cancel`) produisent le même résultat.

### US-12 — Modifier ou supprimer une réservation
> **En tant que** préposée, **je veux** corriger ou supprimer une réservation **afin de** gérer les changements de dernière minute.

*Couvre EF-30 · Estimation : 3 points · Priorité : souhaitable*

- **CA-1** Étant donné une réservation confirmée de 2 unités sur 2 jours, lorsque je la modifie à 3 unités sur 4 jours, alors le total est recalculé et le stock ajusté de la différence (−1 unité).
- **CA-2** Étant donné une réservation confirmée, lorsque je la supprime, alors la réponse est **HTTP 204** et la quantité est remise en inventaire.
- **CA-3** Étant donné une réservation annulée, lorsque je tente de la modifier, alors la réponse est **HTTP 409**.

---

## Épopée 4 — Notifications (`feature/notification-service`)

### US-13 — Conserver une notification à chaque opération métier
> **En tant que** directrice, **je veux** qu'une notification soit conservée après une confirmation ou une annulation **afin de** garder une trace des communications, sans envoyer de courriel réel.

*Couvre EF-31, EF-32, EF-33, EF-35, EF-36 · Estimation : 3 points*

- **CA-1** Lorsqu'une réservation est confirmée, alors une notification de type `RESERVATION_CONFIRMED` est enregistrée, adressée au courriel du client, mentionnant le matériel, la période et le total.
- **CA-2** Lorsqu'une réservation est annulée, alors une notification de type `RESERVATION_CANCELLED` est enregistrée.
- **CA-3** Étant donné une notification sans destinataire ou sans message, lorsqu'elle est soumise, alors elle est refusée avec **HTTP 400**.
- **CA-4** Étant donné une notification sans type, lorsqu'elle est créée, alors le type `INFO` lui est attribué par défaut.
- **CA-5** Aucun courriel réel n'est expédié ; la notification est uniquement persistée.
- **CA-6** Étant donné que le service de notification est arrêté, lorsqu'une réservation est confirmée, alors la réservation est tout de même créée (**HTTP 201**) et l'échec est journalisé.

### US-14 — Consulter l'historique des notifications
> **En tant que** directrice, **je veux** consulter l'historique des notifications **afin de** vérifier ce qui a été communiqué.

*Couvre EF-34 · Estimation : 2 points*

- **CA-1** Lorsque j'ouvre la section « notifications », alors la liste s'affiche de la **plus récente à la plus ancienne** (**HTTP 200**).
- **CA-2** Chaque ligne affiche le destinataire, le message et la date de création.
- **CA-3** Le bouton « Actualiser » recharge la liste sans recharger la page.

---

## Épopée 5 — Architecture et intégration (`develop`)

### US-15 — Faire fonctionner le frontend fourni sans le modifier
> **En tant qu'**employé, **je veux** utiliser l'interface fournie telle quelle **afin d'**accéder aux quatre sections de l'application.

*Couvre EF-37, EF-38, EF-42, EF-44 · Estimation : 5 points*

- **CA-1** Aucun fichier du dossier `frontend/` n'est modifié.
- **CA-2** Au chargement, les quatre appels `GET` parallèles (clients, matériel, réservations, notifications) répondent **HTTP 200** avec un tableau.
- **CA-3** Les objets retournés contiennent les champs attendus par les tableaux (`_id`, `clientName`, `equipmentName`, `totalPrice`, `status`, `createdAt`, …).
- **CA-4** Toute erreur est retournée sous la forme `{ "message": "..." }` et s'affiche dans l'encadré d'erreur de l'interface.
- **CA-5** CORS est activé : le navigateur peut appeler les quatre ports depuis `localhost:5173`.

### US-16 — Isoler les services et leurs données
> **En tant qu'**équipe de développement, **nous voulons** que chaque service possède sa propre base et communique uniquement par REST **afin de** pouvoir les faire évoluer indépendamment.

*Couvre EF-40, EF-41, EF-43 · Estimation : 5 points*

- **CA-1** Chaque service possède sa propre base MongoDB (`eventia_clients`, `eventia_equipments`, `eventia_reservations`, `eventia_notifications`).
- **CA-2** Aucun service n'accède à la base d'un autre service.
- **CA-3** Le service réservation appelle les autres services **uniquement** par HTTP (Axios), via des adresses configurables.
- **CA-4** Le frontend n'appelle jamais le service notification en écriture.
- **CA-5** Chaque service démarre seul et répond à `GET /health`.

---

## Récapitulatif

| Épopée | Stories | Points | Branche |
| --- | --- | --- | --- |
| 1 — Clients | US-01 → US-03 | 8 | `feature/client-service` |
| 2 — Matériel | US-04 → US-06 | 11 | `feature/equipment-service` |
| 3 — Réservations | US-07 → US-12 | 27 | `feature/reservation-service` |
| 4 — Notifications | US-13 → US-14 | 5 | `feature/notification-service` |
| 5 — Architecture | US-15 → US-16 | 10 | `develop` |
| **Total** | **16 stories** | **61** | |
