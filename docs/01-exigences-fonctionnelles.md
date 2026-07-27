# Livrable 1 — Exigences fonctionnelles

**Projet :** Eventia Location — application web de gestion de location de matériel événementiel
**Source :** entrevue entre les analystes fonctionnels et les représentants d'affaires (Directrice, Responsable de l'inventaire, Préposée, Comptable)
**Version :** 1.0

---

## 1. Portée de la première version

| Dans la portée | Hors portée (confirmé en entrevue) |
| --- | --- |
| Gestion des clients, du matériel, des réservations et des notifications | Authentification et gestion des utilisateurs |
| Vérification de la disponibilité et calcul automatique du prix | Envoi de véritables courriels |
| Conservation des notifications en base de données | Paiement, facturation, comptabilité |
| Interface web à quatre sections utilisée par les employés | Portail libre-service pour les clients |

**Acteur unique :** l'employé d'Eventia Location (directrice, responsable de l'inventaire, préposée, comptable). Aucun rôle n'est différencié techniquement dans cette version.

---

## 2. Exigences fonctionnelles

Légende de priorité : **O** = obligatoire, **S** = souhaitable.

### 2.1 Gestion des clients (service client — port 4001)

| # | Exigence | Prio. | Origine (entrevue) |
| --- | --- | --- | --- |
| EF-01 | Le système doit permettre d'enregistrer un client avec un **nom**, un **courriel** et un **téléphone**. | O | « nous inscrivons son nom, son courriel et son téléphone » |
| EF-02 | Le système doit permettre de **consulter la liste** de tous les clients. | O | « enregistrer, consulter, modifier et supprimer les clients » |
| EF-03 | Le système doit permettre de **consulter un client** précis et signaler son absence si l'identifiant est inconnu. | O | Contrat REST `GET /:id → 404` |
| EF-04 | Le système doit permettre de **modifier** les informations d'un client. | O | « modifier […] les clients » |
| EF-05 | Le système doit permettre de **supprimer** un client. | O | « supprimer les clients » |
| EF-06 | Le système doit **refuser** l'enregistrement ou la modification d'un client dont le **courriel est déjà utilisé** par un autre client. | O | « Le courriel d'un client doit être unique » |
| EF-07 | Le système doit **refuser** un client dont le nom, le courriel ou le téléphone est absent, ou dont le courriel n'a pas un format valide. | O | Levée d'ambiguïté (voir §3, A-1) |

### 2.2 Gestion du matériel (service matériel — port 4002)

| # | Exigence | Prio. | Origine (entrevue) |
| --- | --- | --- | --- |
| EF-08 | Le système doit permettre d'ajouter un matériel avec un **nom**, une **catégorie**, un **prix quotidien** et une **quantité disponible**. | O | « ajouter du matériel avec un nom, une catégorie, un prix quotidien et une quantité disponible » |
| EF-09 | Le système doit permettre de **consulter la liste** du matériel. | O | « le consulter » |
| EF-10 | Le système doit permettre de **consulter un matériel** précis et signaler son absence si l'identifiant est inconnu. | O | Contrat REST `GET /:id → 404` |
| EF-11 | Le système doit permettre de **modifier** un matériel. | O | « le modifier » |
| EF-12 | Le système doit permettre de **supprimer** un matériel. | O | « le supprimer » |
| EF-13 | Le système doit permettre de **retirer une quantité** du stock disponible (`reserve`) et **refuser** l'opération si la quantité disponible est insuffisante. | O | « la quantité disponible doit diminuer » |
| EF-14 | Le système doit permettre de **remettre une quantité** dans le stock disponible (`release`). | O | « la quantité doit être remise dans l'inventaire » |
| EF-15 | Le système doit **refuser** un matériel dont le prix quotidien est négatif ou dont la quantité disponible est négative ou non entière. | O | Levée d'ambiguïté (voir §3, A-2) |
| EF-16 | La quantité disponible d'un matériel ne doit **jamais** devenir négative, même en cas de demandes simultanées. | O | « les doubles réservations deviennent fréquentes » |

### 2.3 Gestion des réservations (service réservation — port 4003)

| # | Exigence | Prio. | Origine (entrevue) |
| --- | --- | --- | --- |
| EF-17 | Le système doit permettre de créer une réservation à partir d'un **client**, d'un **matériel**, d'une **quantité**, d'une **date de début** et d'une **date de fin**. | O | « Je sélectionne un client, un matériel, une quantité, une date de début et une date de fin » |
| EF-18 | Le système doit **vérifier que le client existe** avant d'accepter la réservation. | O | « vérifier que le client existe » |
| EF-19 | Le système doit **vérifier que le matériel existe** avant d'accepter la réservation. | O | « que le matériel existe » |
| EF-20 | Le système doit **vérifier que la quantité demandée est disponible** avant d'accepter la réservation. | O | « que la quantité demandée est disponible » |
| EF-21 | Le système doit **refuser** une réservation dont la **date de fin précède la date de début**. | O | « une réservation ne doit pas être acceptée lorsque la date de fin précède la date de début » |
| EF-22 | Le système doit **refuser** une réservation dont la **quantité est inférieure à un**. | O | « ou lorsque la quantité est inférieure à un » |
| EF-23 | À la confirmation, le système doit **diminuer la quantité disponible** du matériel de la quantité réservée. | O | « la quantité disponible doit diminuer » |
| EF-24 | Le système doit calculer le **prix total** = **nombre de jours (premier et dernier jour inclus) × quantité × prix quotidien**. | O | « le nombre de jours, incluant le premier et le dernier jour, multiplié par la quantité et par le prix quotidien » |
| EF-25 | Une réservation créée doit porter l'état **CONFIRMED**. | O | Contrat REST (`status`) |
| EF-26 | Le système doit permettre d'**annuler** une réservation ; elle passe alors à l'état **CANCELLED**. | O | Contrat REST `PUT /:id/cancel` |
| EF-27 | À l'annulation, le système doit **remettre la quantité dans l'inventaire**. | O | « lorsqu'elle est annulée, la quantité doit être remise dans l'inventaire » |
| EF-28 | Le système doit **refuser l'annulation** d'une réservation déjà annulée (pas de double remise en stock). | O | Levée d'ambiguïté (voir §3, A-4) |
| EF-29 | Le système doit permettre de **consulter la liste** des réservations, en affichant le **nom du client**, le **nom du matériel**, le **prix total** et le **statut**. | O | « réservation enrichie avec noms, prix total et statut » |
| EF-30 | Le système doit permettre de **modifier** une réservation confirmée (quantité, période) en réajustant le stock et le prix total, et de la **supprimer**. | S | Contrat REST du tableau des réservations (voir §3, A-6) |

### 2.4 Gestion des notifications (service notification — port 4004)

| # | Exigence | Prio. | Origine (entrevue) |
| --- | --- | --- | --- |
| EF-31 | Après la **confirmation** d'une réservation, le système doit **conserver une notification** en base de données. | O | « après une confirmation ou une annulation, nous voulons conserver une notification » |
| EF-32 | Après l'**annulation** d'une réservation, le système doit conserver une notification. | O | idem |
| EF-33 | Une notification doit comporter un **destinataire**, un **message** et un **type**. | O | Contrat REST `POST { recipient, message, type }` |
| EF-34 | Le système doit permettre de consulter l'**historique des notifications**, de la **plus récente à la plus ancienne**. | O | Contrat REST `GET /` |
| EF-35 | Le système ne doit **envoyer aucun courriel réel** dans cette version. | O | « aucun vrai courriel n'est requis » |
| EF-36 | L'échec de l'enregistrement d'une notification ne doit **pas** faire échouer la réservation correspondante. | O | Levée d'ambiguïté (voir §3, A-5) |

### 2.5 Interface et architecture

| # | Exigence | Prio. | Origine (entrevue / énoncé) |
| --- | --- | --- | --- |
| EF-37 | L'interface doit comporter **quatre sections** : clients, matériel, réservations, notifications. | O | « Quatre sections : clients, matériel, réservations et notifications » |
| EF-38 | Chaque section doit permettre d'**afficher la liste** des éléments et d'en **ajouter**, **modifier** ou **supprimer**. | O | idem |
| EF-39 | L'application ne doit **pas** demander d'authentification dans cette version. | O | « l'authentification n'est pas demandée dans cette première version » |
| EF-40 | Chaque service doit posséder sa **propre base MongoDB** et un **seul domaine fonctionnel**. | O | Énoncé — Architecture |
| EF-41 | Les services doivent communiquer **exclusivement par API REST**. | O | Énoncé — Architecture |
| EF-42 | Le **frontend React fourni ne doit pas être modifié** ; il doit fonctionner tel quel avec les services développés. | O | Énoncé + critère E de la grille |
| EF-43 | Le **service notification ne doit jamais être appelé en écriture par le frontend** : les notifications sont déclenchées par les autres services. | O | Énoncé — Architecture |
| EF-44 | Les erreurs doivent être retournées au format `{ "message": "..." }` avec un code HTTP significatif (400, 404, 409, 503). | O | Frontend : `err.response?.data?.message` |

---

## 3. Ambiguïtés relevées et décisions

| # | Ambiguïté du dialogue | Décision retenue |
| --- | --- | --- |
| A-1 | Le dialogue exige un courriel **unique** mais ne dit rien sur sa **validité**. | Un courriel doit respecter un format `local@domaine.tld` et est normalisé en minuscules avant comparaison, sinon l'unicité serait contournable (`Marie@X.ca` vs `marie@x.ca`). Unicité garantie deux fois : règle métier + index unique MongoDB. |
| A-2 | Aucune borne n'est donnée sur le prix quotidien et la quantité. | Prix quotidien ≥ 0 ; quantité disponible entière ≥ 0. |
| A-3 | « nombre de jours, incluant le premier et le dernier jour » — calcul non précisé pour une réservation d'une seule journée. | `jours = ⌊(fin − début) / 86 400 000⌋ + 1`. Une réservation du 10 au 10 vaut donc **1 jour**. Les dates sont ramenées à minuit UTC pour éviter tout écart de fuseau horaire. |
| A-4 | Rien n'est dit sur une double annulation. | La deuxième annulation est refusée (HTTP 409) : sans cela, le stock serait crédité deux fois. |
| A-5 | Rien n'est dit sur l'échec du service de notification. | La notification est un **effet secondaire** : un échec est journalisé, la réservation reste valide. Le contraire rendrait la disponibilité du service notification critique pour la location. |
| A-6 | Le tableau REST du service **réservation** de l'énoncé reprend par erreur des lignes du service matériel (`PUT /:id` avec `{name, category, dailyPrice, availableQuantity}`, `PUT /:id/reserve`, `PUT /:id/release`, `DELETE /:id`). | Ces routes sont **implémentées** pour respecter le tableau, mais avec la sémantique cohérente du domaine réservation : `PUT /:id` modifie la quantité et la période (stock et total recalculés), `/:id/reserve` augmente la quantité réservée, `/:id/release` la diminue, `DELETE /:id` supprime la réservation et libère le stock. |
| A-7 | L'énoncé écrit l'URL du service matériel `…/api/equipements` alors que le frontend fourni appelle `…/api/equipments`. | Le service expose les **deux** chemins (le second est un alias) : le frontend fonctionne sans modification et le contrat de l'énoncé est respecté. |
| A-8 | L'énoncé spécifie `PUT /:id/cancel` alors que le frontend fourni appelle `PATCH /:id/cancel`. | Les **deux verbes** sont acceptés sur la même opération (EF-42 interdit de modifier le frontend). |
| A-9 | Le « destinataire » d'une notification n'est pas précisé. | Le **courriel du client** de la réservation ; à défaut, son nom. |

---

## 4. Exigences non fonctionnelles retenues

| # | Exigence |
| --- | --- |
| ENF-01 | Chaque service est démarrable indépendamment et expose `GET /health`. |
| ENF-02 | Le décrément de stock est **atomique** (`findOneAndUpdate` conditionnel) afin d'empêcher les doubles réservations concurrentes. |
| ENF-03 | Les appels inter-services sont bornés par un délai d'attente (5 s) ; un service injoignable produit un HTTP 503 explicite. |
| ENF-04 | Si l'enregistrement d'une réservation échoue après le décrément du stock, une **compensation** remet la quantité en inventaire. |
| ENF-05 | CORS est activé sur chaque service pour permettre les appels directs du frontend. |
| ENF-06 | Les paramètres sensibles (port, URI MongoDB, adresses des services) proviennent de variables d'environnement. |

---

## 5. Traçabilité exigences → implémentation

| Exigences | Réalisées par |
| --- | --- |
| EF-01 → EF-07 | `services/client-service` (`Client`, `ClientService`, `ClientRepository`, `ClientController`) |
| EF-08 → EF-16 | `services/equipment-service` (`Equipment`, `EquipmentService`, `EquipmentRepository`, `EquipmentController`) |
| EF-17 → EF-30 | `services/reservation-service` (`Reservation`, `ReservationService`, `ReservationRepository`, `ReservationController`, `ClientApi`, `EquipmentApi`, `NotificationApi`) |
| EF-31 → EF-36 | `services/notification-service` + `NotificationApi` du service réservation |
| EF-37 → EF-44 | `frontend/` (fourni, non modifié) + routeurs, middlewares `errorHandler` et `config/db.js` de chaque service |
