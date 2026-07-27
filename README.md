# Eventia Location — Laboratoire 1

Application web de gestion de location de matériel événementiel, bâtie sur une **architecture services** : quatre services Node.js/Express indépendants, chacun avec sa propre base MongoDB, et un frontend React **fourni, non modifié**.

---

## 1. Démarrage

**Prérequis :** Node.js 20+ et MongoDB local (`mongodb://127.0.0.1:27017`).

### Services (ports 4001 à 4004)

Dans **chacun** des quatre dossiers de `services/` :

```bash
cd services/client-service      # puis equipment-service, reservation-service, notification-service
npm install
cp .env.example .env            # Windows : copy .env.example .env
npm start
```

| Service | Port | Base MongoDB | Racine de l'API |
| --- | --- | --- | --- |
| `client-service` | 4001 | `eventia_clients` | `http://localhost:4001/api/clients` |
| `equipment-service` | 4002 | `eventia_equipments` | `http://localhost:4002/api/equipments` |
| `reservation-service` | 4003 | `eventia_reservations` | `http://localhost:4003/api/reservations` |
| `notification-service` | 4004 | `eventia_notifications` | `http://localhost:4004/api/notifications` |

Chaque service répond à `GET /health` pour vérifier qu'il est démarré.

> Le service **réservation** doit être démarré **après** les trois autres, car il les appelle. Ses adresses sont configurables dans son `.env` (`CLIENT_SERVICE_URL`, `EQUIPMENT_SERVICE_URL`, `NOTIFICATION_SERVICE_URL`).

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

> **Le frontend est fourni et ne doit pas être modifié.** Aucun fichier de `frontend/` n'a été touché.

---

## 2. Structure du projet

```
LABO1/
├── docs/                              Livrables d'analyse et de conception
│   ├── 01-exigences-fonctionnelles.md
│   ├── 02-user-stories.md
│   ├── 03-diagrammes-uml.md           (Mermaid, rendu sur GitHub)
│   ├── 04-strategie-git.md
│   ├── 05-questionnaire.md
│   └── uml/*.puml                     Sources PlantUML des mêmes diagrammes
├── frontend/                          FOURNI — ne pas modifier
├── services/
│   ├── client-service/
│   ├── equipment-service/
│   ├── notification-service/
│   └── reservation-service/
└── tests/                             Tests du domaine et des contrats REST
```

Chaque service suit la même structure en couches :

```
src/
├── server.js                 Assemblage des dépendances + démarrage
├── routes.js                 Contrat REST (fabrique de routeur Express)
├── config/db.js              Connexion MongoDB
├── models/*Model.js          Schéma Mongoose (persistance)
├── controllers/*Controller.js  HTTP ↔ service applicatif
├── domain/
│   ├── <Entité>.js           Données et règles métier intrinsèques
│   ├── <Entité>Repository.js Accès aux données (seule classe à connaître Mongoose)
│   └── <Entité>Service.js    Logique applicative
├── clients/                  (réservation uniquement) appels REST vers les autres services
├── errors/AppError.js        ValidationError (400), NotFoundError (404), ConflictError (409)
└── middlewares/errorHandler.js  Erreurs → { message } + code HTTP
```

**Règle de dépendance :** `Controller → Service → Repository → Modèle`. Les classes de `domain/` n'importent **ni Express, ni Mongoose, ni Axios**.

---

## 3. Contrats REST

### Service client — `http://localhost:4001/api/clients`

| Méthode | URL | Corps | Réponse |
| --- | --- | --- | --- |
| GET | `/` | — | 200, tableau des clients |
| GET | `/:id` | — | 200 + client / 404 si introuvable |
| POST | `/` | `{name, email, phone}` | 201 + client créé |
| PUT | `/:id` | `{name, email, phone}` | 200 + client modifié |
| DELETE | `/:id` | — | 204 |

### Service matériel — `http://localhost:4002/api/equipments`

| Méthode | URL | Corps | Réponse |
| --- | --- | --- | --- |
| GET | `/` | — | 200, tableau des équipements |
| GET | `/:id` | — | 200 + équipement / 404 |
| POST | `/` | `{name, category, dailyPrice, availableQuantity}` | 201 + équipement créé |
| PUT | `/:id` | idem | 200 + équipement modifié |
| PUT | `/:id/reserve` | `{quantity}` | 200 + quantité soustraite, 409 si insuffisante |
| PUT | `/:id/release` | `{quantity}` | 200, remet la quantité |
| DELETE | `/:id` | — | 204 |

> Le chemin `/api/equipements` (orthographe de l'énoncé) est également exposé, en alias.

### Service réservation — `http://localhost:4003/api/reservations`

| Méthode | URL | Corps | Réponse |
| --- | --- | --- | --- |
| GET | `/` | — | 200, tableau des réservations |
| POST | `/` | `{clientId, equipmentId, quantity, startDate, endDate}` | 201, réservation enrichie (noms, prix total, statut) |
| PUT / PATCH | `/:id/cancel` | — | 200, réservation avec statut `CANCELLED` |
| PUT | `/:id` | `{quantity, startDate, endDate}` | 200, total et stock réajustés |
| PUT | `/:id/reserve` | `{quantity}` | 200, augmente la quantité réservée |
| PUT | `/:id/release` | `{quantity}` | 200, remet une partie en inventaire |
| DELETE | `/:id` | — | 204 |

Lors du `POST`, ce service appelle `GET /api/clients/:id`, `GET /api/equipments/:id`, `PUT /api/equipments/:id/reserve` et `POST /api/notifications`.
Lors de l'annulation, il appelle `PUT /api/equipments/:id/release` et `POST /api/notifications`.

### Service notification — `http://localhost:4004/api/notifications`

| Méthode | URL | Corps | Réponse |
| --- | --- | --- | --- |
| GET | `/` | — | 200, de la plus récente à la plus ancienne |
| POST | `/` | `{recipient, message, type}` | 201, notification créée |

### Codes d'erreur

| Code | Cas |
| --- | --- |
| 400 | données invalides (champ manquant, courriel mal formé, dates inversées, quantité < 1, prix négatif) |
| 404 | client, matériel ou réservation introuvable |
| 409 | courriel déjà utilisé, stock insuffisant, réservation déjà annulée |
| 503 | service dépendant injoignable |

Toutes les erreurs ont la forme `{ "message": "..." }`, format attendu par le frontend fourni.

---

## 4. Règles métier implémentées

- Le **courriel d'un client est unique** (règle applicative + index unique MongoDB).
- Une réservation est refusée si la **date de fin précède la date de début** ou si la **quantité est inférieure à un**.
- Une réservation est refusée si le **client** ou le **matériel** n'existe pas, ou si la **quantité demandée n'est pas disponible**.
- **Prix total** = nombre de jours (premier et dernier jour **inclus**) × quantité × prix quotidien.
- À la **confirmation**, la quantité disponible **diminue** ; à l'**annulation**, elle est **remise** dans l'inventaire.
- Le décrément du stock est **atomique** : deux réservations simultanées ne peuvent pas rendre la quantité négative.
- Une réservation déjà annulée ne peut pas l'être une seconde fois (409).
- Chaque confirmation et chaque annulation **enregistre une notification** ; aucun courriel réel n'est envoyé.

---

## 5. Tests

```bash
cd tests
npm install
node --test domain.test.mjs      # 10 tests unitaires des entités du domaine
node contracts.e2e.mjs           # 43 vérifications des contrats REST
```

- `domain.test.mjs` : entités `Client`, `Equipment`, `Reservation`, `Notification` — validation, calcul de durée et de total, règles de stock. Aucune infrastructure requise.
- `contracts.e2e.mjs` : monte les quatre services sur leurs vrais ports avec des dépôts **en mémoire**, puis exerce tous les contrats en **HTTP réel**, y compris le parcours exact du frontend fourni (chargement en quatre `GET` parallèles, création, annulation par `PATCH`, suppression) et les cas d'erreur.

---

## 6. Livrables

| # | Livrable | Fichier |
| --- | --- | --- |
| 1 | Exigences fonctionnelles | [`docs/01-exigences-fonctionnelles.md`](docs/01-exigences-fonctionnelles.md) |
| 2 | User stories et critères d'acceptation | [`docs/02-user-stories.md`](docs/02-user-stories.md) |
| 3 | Diagrammes UML | [`docs/03-diagrammes-uml.md`](docs/03-diagrammes-uml.md) · [`docs/uml/`](docs/uml) |
| 4 | Stratégie Git et GitHub | [`docs/04-strategie-git.md`](docs/04-strategie-git.md) |
| 5 | Réponses au questionnaire | [`docs/05-questionnaire.md`](docs/05-questionnaire.md) |
| — | Code source complété | [`services/`](services) |
| — | Tests de vérification | [`tests/`](tests) |
