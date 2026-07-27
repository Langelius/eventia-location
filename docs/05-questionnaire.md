# Livrable 5 — Réponses au questionnaire

**Projet :** Eventia Location
Réponses cohérentes avec les livrables 1 à 4 et avec le code source de `services/`.

---

## A. Architecture

**A1. Quelle architecture avez-vous mise en place et pourquoi ?**
Une architecture **orientée services** : quatre services indépendants (client 4001, matériel 4002, réservation 4003, notification 4004), chacun responsable d'un **seul domaine fonctionnel** et propriétaire de **sa propre base MongoDB**. Ce découpage était imposé par l'énoncé, et il répond au problème d'affaires : les doubles réservations viennent d'un manque de contrôle centralisé sur la disponibilité. En isolant le stock dans le service matériel, une seule composante fait autorité sur les quantités.

**A2. Pourquoi une base de données par service ?**
Pour garantir l'**autonomie** de chaque service : aucun ne peut lire ni écrire dans les données d'un autre, ce qui interdit tout couplage caché par la base. La conséquence assumée est qu'il n'existe **aucune jointure** entre réservations, clients et matériel : le service réservation doit interroger les autres par REST et **recopier** les informations utiles (`clientName`, `clientEmail`, `equipmentName`, `dailyPrice`) dans la réservation.

**A3. Quel service coordonne les autres ? Pourquoi lui ?**
Le **service réservation**. C'est le seul cas d'utilisation qui traverse plusieurs domaines : il faut valider un client, valider et décrémenter un matériel, puis produire une notification. Placer cette coordination ailleurs (par exemple dans le frontend) aurait dispersé une règle métier dans une couche de présentation qui, de surcroît, ne doit pas être modifiée.

**A4. Le frontend appelle-t-il tous les services ?**
Non. Il appelle directement les services **client**, **matériel** et **réservation**. Il ne consulte le service **notification qu'en lecture** (`GET /api/notifications`) pour afficher l'historique ; il ne crée jamais de notification. Les notifications sont **déclenchées par le service réservation** lors de la confirmation et de l'annulation.

**A5. Comment les services se trouvent-ils les uns les autres ?**
Par configuration : `CLIENT_SERVICE_URL`, `EQUIPMENT_SERVICE_URL` et `NOTIFICATION_SERVICE_URL` dans le `.env` du service réservation, avec des valeurs par défaut `http://localhost:400x`. Aucune adresse n'est codée en dur dans le domaine.

---

## B. Contrats REST

**B1. Récapitulez les contrats implémentés.**

| Service | Méthode et URL | Corps | Réponse |
| --- | --- | --- | --- |
| Client `:4001/api/clients` | `GET /` | — | 200, tableau |
| | `GET /:id` | — | 200 + client / **404** |
| | `POST /` | `{name, email, phone}` | **201** + client créé |
| | `PUT /:id` | `{name, email, phone}` | 200 + client modifié |
| | `DELETE /:id` | — | **204** |
| Matériel `:4002/api/equipments` | `GET /` | — | 200, tableau |
| | `GET /:id` | — | 200 / **404** |
| | `POST /` | `{name, category, dailyPrice, availableQuantity}` | **201** |
| | `PUT /:id` | idem | 200 |
| | `PUT /:id/reserve` | `{quantity}` | 200 + quantité soustraite, **409** si insuffisante |
| | `PUT /:id/release` | `{quantity}` | 200, quantité remise |
| | `DELETE /:id` | — | **204** |
| Réservation `:4003/api/reservations` | `GET /` | — | 200, tableau |
| | `POST /` | `{clientId, equipmentId, quantity, startDate, endDate}` | **201**, réservation enrichie |
| | `PUT`/`PATCH` `/:id/cancel` | — | 200, statut `CANCELLED` |
| | `PUT /:id` | `{quantity, startDate, endDate}` | 200, total et stock réajustés |
| | `PUT /:id/reserve` \| `/:id/release` | `{quantity}` | 200 |
| | `DELETE /:id` | — | **204** |
| Notification `:4004/api/notifications` | `GET /` | — | 200, de la plus récente à la plus ancienne |
| | `POST /` | `{recipient, message, type}` | **201** |

**B2. Deux écarts existent entre l'énoncé et le frontend fourni. Comment les avez-vous traités ?**

1. L'énoncé écrit l'URL du service matériel `/api/equipements` (orthographe française) alors que `frontend/src/api.js` appelle `/api/equipments`. Le service **expose les deux chemins**, le second étant un alias monté sur le même routeur.
2. L'énoncé spécifie `PUT /:id/cancel` alors que `App.jsx` appelle `reservationsApi.patch(...)`. Le routeur **accepte `PUT` et `PATCH`** sur la même opération.

Dans les deux cas, la consigne « le frontend ne doit pas être modifié » prime, et le contrat de l'énoncé reste néanmoins respecté.

**B3. Le tableau REST du service réservation contient des lignes du service matériel. Qu'avez-vous fait ?**
Je les ai implémentées, mais avec la sémantique du domaine réservation, seule cohérente : `PUT /:id` modifie la quantité et la période (durée, total et stock réajustés de la différence), `PUT /:id/reserve` augmente la quantité réservée, `PUT /:id/release` la diminue, `DELETE /:id` supprime la réservation et libère le stock si elle était encore confirmée. L'ambiguïté est documentée (`docs/01-exigences-fonctionnelles.md`, §3 A-6).

**B4. Quels codes de statut utilisez-vous et pourquoi ?**

| Code | Signification retenue |
| --- | --- |
| 200 | consultation ou modification réussie |
| 201 | ressource créée |
| 204 | suppression réussie, sans contenu |
| 400 | données invalides (champ manquant, dates inversées, quantité < 1, prix négatif) |
| 404 | ressource inexistante (client, matériel, réservation) |
| 409 | conflit avec l'état actuel : courriel déjà utilisé, stock insuffisant, réservation déjà annulée |
| 503 | service dépendant injoignable |

Le choix du **409** plutôt que du 400 pour le stock insuffisant est délibéré : la requête est bien formée, c'est l'**état du système** qui l'empêche.

**B5. Quel format d'erreur avez-vous retenu ?**
`{ "message": "..." }`, complété par `details` pour les erreurs de validation. Ce format est imposé par le frontend fourni, qui lit `err.response?.data?.message` pour alimenter son encadré d'erreur.

---

## C. Conception détaillée

**C1. Décrivez les couches de chaque service.**
Quatre couches, avec une dépendance strictement descendante :

```
Controller  →  Service applicatif  →  Repository  →  Modèle Mongoose
                      ↓
                  Entité du domaine
```

- **Controller** : traduit HTTP ↔ appels de méthodes ; aucune règle métier.
- **Service applicatif** : orchestre, applique les règles qui nécessitent plusieurs éléments (unicité du courriel, disponibilité, appels inter-services).
- **Repository** : seule classe qui connaît Mongoose ; aucune validation.
- **Entité** (`Client`, `Equipment`, `Reservation`, `Notification`) : données et règles intrinsèques ; n'importe ni Express, ni Mongoose, ni Axios.

**C2. Pourquoi séparer l'entité du modèle Mongoose ?**
Le modèle décrit le **stockage** ; l'entité porte le **comportement**. Cette séparation permet de tester tout le domaine (calcul de durée, calcul du total, règles de validation) sans base de données — c'est ce que fait `tests/domain.test.mjs`, exécuté en quelques millisecondes.

**C3. Où est calculé le prix total, et selon quelle formule ?**
Dans l'entité `Reservation` :

```
jours  = ⌊(endDate − startDate) / 86 400 000⌋ + 1     (premier et dernier jour inclus)
total  = jours × quantité × prixQuotidien
```

Le `+ 1` traduit la phrase du comptable ; une réservation du 10 au 10 vaut donc 1 jour. Les dates sont ramenées à **minuit UTC** pour qu'un changement de fuseau horaire ne fasse pas basculer le calcul d'une journée. Le prix quotidien provient du **service matériel** au moment de la réservation, puis est conservé dans la réservation.

**C4. Où sont vérifiées les règles « date de fin ≥ date de début » et « quantité ≥ 1 » ?**
Dans `Reservation.validate()`, donc dans l'entité : ce sont des règles **intrinsèques** à une réservation, vérifiables sans consulter quoi que ce soit d'autre. La disponibilité, elle, dépend d'un autre service : elle est vérifiée par `ReservationService` et, en dernier ressort, par le service matériel.

**C5. Quel rôle jouent `ClientApi`, `EquipmentApi` et `NotificationApi` ?**
Ce sont les implémentations des interfaces `IClientAPI`, `IMaterielAPI` et `INotificationAPI` du diagramme fourni. Elles encapsulent Axios et traduisent les erreurs HTTP des services distants en erreurs du domaine (404 → `NotFoundError`, 409 → `ConflictError`, absence de réponse → `AppError` 503). `ReservationService` ne connaît donc ni Axios ni les codes HTTP des voisins, et ces dépendances sont injectées dans le constructeur — ce qui les rend substituables en test.

---

## D. Implémentation et intégrité des données

**D1. Comment empêchez-vous les doubles réservations ?**
Par une mise à jour **atomique** dans `EquipmentRepository.decreaseQuantity` :

```js
findOneAndUpdate(
  { _id: id, availableQuantity: { $gte: quantity } },
  { $inc: { availableQuantity: -quantity } },
  { new: true }
)
```

La condition de disponibilité fait partie du **filtre**. MongoDB garantit l'atomicité de la modification d'un document : si deux requêtes concurrentes demandent 6 unités sur un stock de 10, la seconde ne trouve aucun document correspondant, retourne `null` et reçoit un 409. Une simple séquence « lire puis écrire » aurait laissé la fenêtre de course ouverte.

**D2. Que se passe-t-il si l'enregistrement de la réservation échoue après le décrément du stock ?**
Une **compensation** est déclenchée : `ReservationService` appelle `PUT /api/equipments/:id/release` pour remettre la quantité, puis propage l'erreur. Comme les services ont des bases distinctes, il n'existe pas de transaction globale : j'applique donc le patron *Saga* avec action compensatoire.

**D3. Pourquoi l'échec d'une notification n'annule-t-il pas la réservation ?**
La notification est un **effet secondaire** d'observabilité, pas une condition de validité de la location. Faire échouer la réservation rendrait la disponibilité du service notification critique pour l'activité commerciale. `NotificationApi.create` journalise donc l'échec et retourne `null`.

**D4. Comment garantissez-vous l'unicité du courriel d'un client ?**
Deux fois : (1) `ClientService.create/update` consulte `findByEmail` et lève une `ConflictError` (409) ; (2) le schéma Mongoose porte un **index unique** sur `email`, et le middleware d'erreur convertit le code MongoDB `11000` en 409. Le courriel est normalisé en minuscules et débarrassé de ses espaces avant comparaison, sinon `Marie@X.ca` et `marie@x.ca` seraient considérés comme distincts.

**D5. Que se passe-t-il si l'on annule deux fois la même réservation ?**
La seconde annulation est refusée avec un **409**. Sans ce contrôle, la quantité serait remise deux fois dans l'inventaire et le stock deviendrait faux — exactement le type d'erreur que le projet doit éliminer.

**D6. Comment traitez-vous un identifiant mal formé ?**
Les dépôts vérifient `mongoose.Types.ObjectId.isValid` avant toute requête et retournent `null`, ce qui produit un **404** propre au lieu d'une `CastError` en 500.

---

## E. Intégration et vérification

**E1. Comment avez-vous vérifié que le frontend fonctionne sans modification ?**
J'ai relu `frontend/src/App.jsx` et `api.js` pour en extraire le contrat réellement attendu (URL, verbes, noms de champs `_id`, `clientName`, `equipmentName`, `totalPrice`, `status`, `createdAt`, format d'erreur `data.message`), puis j'ai écrit `tests/contracts.e2e.mjs`, qui reproduit ces appels en HTTP réel sur les ports 4001-4004 : chargement initial en quatre `GET` parallèles, création, suppression, annulation par `PATCH`. **43 vérifications passent**, plus **10 tests unitaires** du domaine.

**E2. Quels cas d'erreur avez-vous testés ?**
Courriel dupliqué (409), courriel invalide (400), champs manquants (400), identifiant inconnu (404), prix négatif (400), quantité `reserve` insuffisante (409) ou nulle (400), dates inversées (400), quantité de réservation nulle (400), client inexistant (404), matériel inexistant (404), stock insuffisant avec vérification que le stock **reste inchangé** (409), double annulation (409), route inconnue (404).

**E3. Comment démarrer l'ensemble ?**
Voir `README.md` : MongoDB local, puis `npm install` + `.env` + `npm start` dans chacun des quatre services (ports 4001 à 4004), enfin `npm install` et `npm run dev` dans `frontend`.

**E4. Quelles limites connaissez-vous à votre solution ?**

- Aucune **authentification** (hors périmètre de la version 1, confirmé en entrevue).
- Aucune vérification de **chevauchement de dates** : la disponibilité est un compteur global, non un calendrier par période. Une réservation en août et une en décembre consomment le même stock tant que la première n'est pas annulée. C'est la lecture littérale de l'entrevue ; un calendrier de disponibilité serait l'évolution naturelle.
- La cohérence entre services est **éventuelle** (saga avec compensation), pas transactionnelle.
- Le nom d'un client ou d'un matériel modifié après coup n'est pas propagé dans les réservations déjà enregistrées — choix assumé pour figer les conditions de la location.
- Supprimer un matériel ou un client n'invalide pas les réservations existantes.

**E5. Qu'amélioreriez-vous avec plus de temps ?**
Un calendrier de disponibilité par période, une passerelle d'API (*API gateway*) pour n'exposer qu'un seul port, la conteneurisation (`docker-compose`) des quatre services et de MongoDB, la pagination des listes, et le remplacement des appels REST synchrones vers le service notification par une file de messages.

---

## F. Git et organisation du travail

**F1. Quelle stratégie de branches avez-vous appliquée ?**
Celle de l'énoncé : `main` protégée et démontrable, `develop` comme branche d'intégration, une branche `feature/*` par service, `docs/analyse-conception` pour l'analyse et la conception, et une branche `test/integration` ajoutée pour les tests transverses. Aucun push direct vers `main` : chaque branche rejoint `develop` par pull request, et `develop` rejoint `main` par une dernière PR.

**F2. Vous travaillez seul. Pourquoi conserver les pull requests ?**
Parce que leur utilité ne dépend pas de la taille de l'équipe : elles isolent le travail d'un service, forcent une relecture complète du diff avant l'intégration, produisent un historique lisible service par service et permettent de revenir en arrière sur une seule fonctionnalité. La seule adaptation est la revue : elle devient une **auto-revue documentée**, déposée en commentaire sur la PR à partir de la grille du §7 de `docs/04-strategie-git.md`. En équipe, cette revue serait faite par un coéquipier.

**F3. Dans quel ordre les branches ont-elles été fusionnées, et pourquoi ?**
`docs/analyse-conception` en premier, parce que l'analyse précède le code. Puis les trois services autonomes — `client`, `equipment`, `notification` — qui ne dépendent de personne. Puis `reservation`, qui appelle les trois autres et ne peut être intégré ni testé avant eux. Enfin `test/integration`, qui exerce les quatre services ensemble.

**F4. Comment vos commits sont-ils organisés ?**
Convention *Conventional Commits* (`feat`, `fix`, `docs`, `test`, `chore`) avec une portée par service. Un commit correspond à une intention et suit les couches de la conception : erreurs et connexion à la base, puis entité du domaine, puis dépôt, puis service applicatif, puis contrat REST. Le premier commit du dépôt est la **version fournie avec l'énoncé**, non modifiée : le diff avec `main` montre donc exactement ce qui a été produit.

**F5. Comment garantissez-vous que le frontend n'a pas été modifié ?**
La commande `git diff --name-only <commit-initial> HEAD -- frontend` retourne **zéro fichier**. L'historique du dossier `frontend/` ne contient qu'un seul commit : celui de la version initiale.
