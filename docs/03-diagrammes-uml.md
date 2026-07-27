# Livrable 3 — Diagrammes UML

**Projet :** Eventia Location
**Version :** 1.0
Les diagrammes sont écrits en **Mermaid** (rendu automatique sur GitHub). Les sources **PlantUML** équivalentes se trouvent dans `docs/uml/*.puml`.

> Les diagrammes ci-dessous décrivent **exactement** les classes implémentées dans `services/*/src`. Convention UML : `+` public, `-` privé, `_souligné_` = statique (noté `$` en Mermaid).

---

## 1. Diagramme de composants (vue architecturale)

```mermaid
flowchart LR
    U([Utilisateur<br/>employé Eventia])
    FE["<b>Frontend React</b><br/>(fourni — boîte noire)<br/>:5173"]

    subgraph BACKEND["Backend — architecture services"]
        CS["<b>Service Client</b><br/>:4001<br/>/api/clients"]
        ES["<b>Service Matériel</b><br/>:4002<br/>/api/equipments"]
        RS["<b>Service Réservation</b><br/>:4003<br/>/api/reservations"]
        NS["<b>Service Notification</b><br/>:4004<br/>/api/notifications"]
        DBC[("MongoDB<br/>eventia_clients")]
        DBE[("MongoDB<br/>eventia_equipments")]
        DBR[("MongoDB<br/>eventia_reservations")]
        DBN[("MongoDB<br/>eventia_notifications")]
    end

    U --> FE
    FE -->|REST| CS
    FE -->|REST| ES
    FE -->|REST GET, POST, PUT/PATCH cancel, DELETE| RS
    FE -.->|REST GET seulement| NS

    RS -->|GET /clients/:id| CS
    RS -->|GET /equipments/:id<br/>PUT /equipments/:id/reserve<br/>PUT /equipments/:id/release| ES
    RS -->|POST /notifications| NS

    CS --- DBC
    ES --- DBE
    RS --- DBR
    NS --- DBN
```

**Règles d'architecture illustrées**

- Chaque service possède **sa propre base MongoDB** ; aucun accès croisé aux données.
- Les services communiquent **exclusivement par REST**.
- Le **service réservation** est le seul coordinateur : il appelle les trois autres.
- Le frontend n'appelle **jamais** le service notification en écriture (lecture seule pour l'affichage de l'historique).

---

## 2. Service Client — diagramme de classes

```mermaid
classDiagram
    direction TB

    class ClientController {
        -service : ClientService
        +constructor(service : ClientService)
        +list(req, res, next) Promise
        +getById(req, res, next) Promise
        +create(req, res, next) Promise
        +update(req, res, next) Promise
        +remove(req, res, next) Promise
    }

    class ClientService {
        -repository : ClientRepository
        +constructor(repository : ClientRepository)
        +list() Promise~Object[]~
        +getById(id : string) Promise~Object~
        +create(data : Object) Promise~Object~
        +update(id : string, data : Object) Promise~Object~
        +remove(id : string) Promise~boolean~
    }

    class ClientRepository {
        -model : Model
        +constructor(model : Model)
        +isValidId(id : string)$ boolean
        +findAll() Promise~Document[]~
        +findById(id : string) Promise~Document~
        +findByEmail(email : string) Promise~Document~
        +create(data : Object) Promise~Document~
        +update(id : string, data : Object) Promise~Document~
        +deleteById(id : string) Promise~Document~
    }

    class Client {
        +EMAIL_PATTERN : RegExp$
        +MIN_PHONE_LENGTH : number$
        +id : string
        +name : string
        +email : string
        +phone : string
        +createdAt : Date
        +updatedAt : Date
        +constructor(data : Object)
        +fromDocument(document : Object)$ Client
        -clean(value : any)$ string
        +validate() ValidationResult
        +isValid() boolean
        +toPersistence() Object
        +toJSON() Object
    }

    class ValidationResult {
        <<type>>
        +valid : boolean
        +errors : string[]
    }

    class AppError {
        +statusCode : number
        +details : any
        +constructor(message, statusCode, details)
    }
    class ValidationError
    class NotFoundError
    class ConflictError

    AppError <|-- ValidationError
    AppError <|-- NotFoundError
    AppError <|-- ConflictError

    ClientController "1" --> "1" ClientService : utilise
    ClientService "1" --> "1" ClientRepository : utilise
    ClientService "1" ..> "0..*" Client : crée et valide
    ClientService ..> ValidationError : lève
    ClientService ..> NotFoundError : lève
    ClientService ..> ConflictError : lève
    Client ..> ValidationResult : produit
    ClientRepository "1" ..> "0..*" Client : persiste
```

**Règles métier portées par la classe `Client` :** nom, courriel et téléphone obligatoires ; courriel au format `local@domaine.tld`, normalisé en minuscules ; téléphone d'au moins 7 chiffres. L'unicité du courriel (EF-06) est une règle **applicative** : elle appartient à `ClientService` car elle nécessite une consultation du dépôt.

---

## 3. Service Matériel — diagramme de classes

```mermaid
classDiagram
    direction TB

    class EquipmentController {
        -service : EquipmentService
        +constructor(service : EquipmentService)
        +list(req, res, next) Promise
        +getById(req, res, next) Promise
        +create(req, res, next) Promise
        +update(req, res, next) Promise
        +reserve(req, res, next) Promise
        +release(req, res, next) Promise
        +remove(req, res, next) Promise
    }

    class EquipmentService {
        -repository : EquipmentRepository
        +constructor(repository : EquipmentRepository)
        +list() Promise~Object[]~
        +getById(id : string) Promise~Object~
        +create(data : Object) Promise~Object~
        +update(id : string, data : Object) Promise~Object~
        +remove(id : string) Promise~boolean~
        +reserve(id : string, quantity : number) Promise~Object~
        +release(id : string, quantity : number) Promise~Object~
        -requireQuantity(quantity : any)$ number
    }

    class EquipmentRepository {
        -model : Model
        +constructor(model : Model)
        +isValidId(id : string)$ boolean
        +findAll() Promise~Document[]~
        +findById(id : string) Promise~Document~
        +create(data : Object) Promise~Document~
        +update(id : string, data : Object) Promise~Document~
        +deleteById(id : string) Promise~Document~
        +decreaseQuantity(id : string, quantity : number) Promise~Document~
        +increaseQuantity(id : string, quantity : number) Promise~Document~
    }

    class Equipment {
        +id : string
        +name : string
        +category : string
        +dailyPrice : number
        +availableQuantity : number
        +createdAt : Date
        +updatedAt : Date
        +constructor(data : Object)
        +fromDocument(document : Object)$ Equipment
        -clean(value : any)$ string
        -toNumber(value : any)$ number
        +validate() ValidationResult
        +isValid() boolean
        +canReserve(quantity : number) boolean
        +priceFor(days : number, quantity : number) number
        +toPersistence() Object
        +toJSON() Object
    }

    EquipmentController "1" --> "1" EquipmentService : utilise
    EquipmentService "1" --> "1" EquipmentRepository : utilise
    EquipmentService "1" ..> "0..*" Equipment : crée et valide
    EquipmentRepository "1" ..> "0..*" Equipment : persiste
```

**Point de conception clé.** `decreaseQuantity` exécute un `findOneAndUpdate` dont le **filtre contient la condition de disponibilité** (`availableQuantity >= quantity`). Le test et la mise à jour forment donc une seule opération atomique MongoDB : deux réservations simultanées ne peuvent pas faire passer le stock sous zéro (EF-16, US-06/CA-5).

---

## 4. Service Réservation — diagramme de classes

```mermaid
classDiagram
    direction TB

    class ReservationController {
        -service : ReservationService
        +constructor(service : ReservationService)
        +list(req, res, next) Promise
        +getById(req, res, next) Promise
        +create(req, res, next) Promise
        +cancel(req, res, next) Promise
        +update(req, res, next) Promise
        +reserve(req, res, next) Promise
        +release(req, res, next) Promise
        +remove(req, res, next) Promise
    }

    class ReservationService {
        -repository : ReservationRepository
        -clientApi : IClientAPI
        -equipmentApi : IMaterielAPI
        -notificationApi : INotificationAPI
        +constructor(repository, apis : Object)
        +list() Promise~Object[]~
        +getById(id : string) Promise~Object~
        +create(payload : Object) Promise~Object~
        +cancel(id : string) Promise~Object~
        +update(id : string, payload : Object) Promise~Object~
        +reserveMore(id : string, quantity : number) Promise~Object~
        +releaseSome(id : string, quantity : number) Promise~Object~
        +remove(id : string) Promise~boolean~
        -safeRelease(equipmentId : string, quantity : number) Promise
        -requireQuantity(quantity : any)$ number
        -day(date : Date)$ string
    }

    class ReservationRepository {
        -model : Model
        +constructor(model : Model)
        +isValidId(id : string)$ boolean
        +findAll() Promise~Document[]~
        +findById(id : string) Promise~Document~
        +create(data : Object) Promise~Document~
        +update(id : string, data : Object) Promise~Document~
        +deleteById(id : string) Promise~Document~
    }

    class Reservation {
        +MS_PER_DAY : number$
        +STATUS : Object$
        +id : string
        +clientId : string
        +clientName : string
        +clientEmail : string
        +equipmentId : string
        +equipmentName : string
        +dailyPrice : number
        +quantity : number
        +startDate : Date
        +endDate : Date
        +days : number
        +totalPrice : number
        +status : string
        +cancelledAt : Date
        +createdAt : Date
        +updatedAt : Date
        +constructor(data : Object)
        +fromDocument(document : Object)$ Reservation
        -toDate(value : any)$ Date
        -toNumber(value : any, fallback : number)$ number
        +durationInDays() number
        +computeTotal(dailyPrice : number) number
        +applyPricing(dailyPrice : number) Reservation
        +applyClient(client : Object) Reservation
        +applyEquipment(equipment : Object) Reservation
        +cancel(at : Date) Reservation
        +isCancelled() boolean
        +validate() ValidationResult
        +isValid() boolean
        +toPersistence() Object
        +toJSON() Object
    }

    class IClientAPI {
        <<interface>>
        +getById(id : string) Promise~Object~
    }
    class IMaterielAPI {
        <<interface>>
        +getById(id : string) Promise~Object~
        +reserve(id : string, quantity : number) Promise~Object~
        +release(id : string, quantity : number) Promise~Object~
    }
    class INotificationAPI {
        <<interface>>
        +create(notification : Object) Promise~Object~
    }

    class ClientApi {
        -http : AxiosInstance
        +constructor(baseUrl : string, timeout : number)
        +getById(id : string) Promise~Object~
    }
    class EquipmentApi {
        -http : AxiosInstance
        +constructor(baseUrl : string, timeout : number)
        +getById(id : string) Promise~Object~
        +reserve(id : string, quantity : number) Promise~Object~
        +release(id : string, quantity : number) Promise~Object~
        -translate(error : Error, message : string)$ AppError
    }
    class NotificationApi {
        -http : AxiosInstance
        +constructor(baseUrl : string, timeout : number)
        +create(notification : Object) Promise~Object~
    }

    IClientAPI <|.. ClientApi : implémente
    IMaterielAPI <|.. EquipmentApi : implémente
    INotificationAPI <|.. NotificationApi : implémente

    ReservationController "1" --> "1" ReservationService : utilise
    ReservationService "1" --> "1" ReservationRepository : utilise
    ReservationService "1" ..> "0..*" Reservation : crée et valide
    ReservationService "1" --> "1" IClientAPI : REST
    ReservationService "1" --> "1" IMaterielAPI : REST
    ReservationService "1" --> "1" INotificationAPI : REST
    ReservationRepository "1" ..> "0..*" Reservation : persiste
```

**Point de conception clé.** `Reservation` conserve une **copie** de `clientName`, `clientEmail`, `equipmentName` et `dailyPrice` au moment de la réservation. Chaque service ayant sa propre base, aucune jointure n'est possible ; cette copie garantit aussi que le total facturé reste celui du jour de la réservation, même si le prix du matériel change plus tard.

---

## 5. Service Notification — diagramme de classes

```mermaid
classDiagram
    direction TB

    class NotificationController {
        -service : NotificationService
        +constructor(service : NotificationService)
        +list(req, res, next) Promise
        +getById(req, res, next) Promise
        +create(req, res, next) Promise
    }

    class NotificationService {
        -repository : NotificationRepository
        +constructor(repository : NotificationRepository)
        +list() Promise~Object[]~
        +getById(id : string) Promise~Object~
        +create(data : Object) Promise~Object~
    }

    class NotificationRepository {
        -model : Model
        +constructor(model : Model)
        +isValidId(id : string)$ boolean
        +findAll() Promise~Document[]~
        +findById(id : string) Promise~Document~
        +create(data : Object) Promise~Document~
    }

    class Notification {
        +DEFAULT_TYPE : string$
        +TYPES : Object$
        +id : string
        +recipient : string
        +message : string
        +type : string
        +createdAt : Date
        +constructor(data : Object)
        +fromDocument(document : Object)$ Notification
        -clean(value : any)$ string
        +validate() ValidationResult
        +isValid() boolean
        +toPersistence() Object
        +toJSON() Object
    }

    NotificationController "1" --> "1" NotificationService : utilise
    NotificationService "1" --> "1" NotificationRepository : utilise
    NotificationService "1" ..> "0..*" Notification : crée et valide
    NotificationRepository "1" ..> "0..*" Notification : persiste
```

`Notification.TYPES` : `INFO` (défaut), `RESERVATION_CONFIRMED`, `RESERVATION_CANCELLED`.

---

## 6. Modèle du domaine et multiplicités

Vue logique des entités métier, indépendamment du découpage en services.

```mermaid
classDiagram
    direction LR
    class Client {
        +name
        +email : unique
        +phone
    }
    class Equipment {
        +name
        +category
        +dailyPrice
        +availableQuantity
    }
    class Reservation {
        +quantity
        +startDate
        +endDate
        +days
        +totalPrice
        +status
    }
    class Notification {
        +recipient
        +message
        +type
        +createdAt
    }

    Client "1" -- "0..*" Reservation : effectue (clientId)
    Equipment "1" -- "0..*" Reservation : porte sur (equipmentId)
    Reservation "1" -- "1..*" Notification : déclenche (confirmation, annulation)
```

> Les associations sont réalisées par **référence d'identifiant** (`clientId`, `equipmentId`) et non par clé étrangère : les entités vivent dans des bases distinctes.

---

## 7. Diagramme de séquence — création d'une réservation (cas nominal)

```mermaid
sequenceDiagram
    autonumber
    actor U as Employé
    participant FE as Frontend React
    participant RC as ReservationController
    participant RS as ReservationService
    participant R as Reservation (entité)
    participant CA as ClientApi → Service Client
    participant EA as EquipmentApi → Service Matériel
    participant RR as ReservationRepository
    participant NA as NotificationApi → Service Notification

    U->>FE: Remplit le formulaire et soumet
    FE->>RC: POST /api/reservations {clientId, equipmentId, quantity, startDate, endDate}
    RC->>RS: create(payload)
    RS->>R: new Reservation(payload) + validate()
    alt données invalides (dates inversées, quantité < 1)
        R-->>RS: {valid: false, errors}
        RS-->>RC: ValidationError
        RC-->>FE: 400 {message}
    else données valides
        RS->>CA: GET /api/clients/:id
        alt client inexistant
            CA-->>RS: NotFoundError
            RC-->>FE: 404 {message: "Client introuvable."}
        else client trouvé
            CA-->>RS: {name, email}
            RS->>R: applyClient(client)
            RS->>EA: GET /api/equipments/:id
            alt matériel inexistant
                EA-->>RS: NotFoundError
                RC-->>FE: 404 {message: "Materiel introuvable."}
            else quantité insuffisante
                EA-->>RS: {availableQuantity < quantity}
                RS-->>RC: ConflictError
                RC-->>FE: 409 {message: "Quantite insuffisante..."}
            else disponible
                EA-->>RS: {name, dailyPrice, availableQuantity}
                RS->>EA: PUT /api/equipments/:id/reserve {quantity}
                EA-->>RS: 200 (quantité décrémentée atomiquement)
                RS->>R: applyEquipment(equipment) → days, totalPrice
                RS->>RR: create(reservation)
                alt échec d'enregistrement
                    RR-->>RS: erreur
                    RS->>EA: PUT /:id/release {quantity} (compensation)
                    RC-->>FE: 500 {message}
                else enregistrée
                    RR-->>RS: document {_id, status: CONFIRMED}
                    RS->>NA: POST /api/notifications {recipient, message, type: RESERVATION_CONFIRMED}
                    NA-->>RS: 201 (ou échec journalisé, sans incidence)
                    RS-->>RC: réservation enrichie
                    RC-->>FE: 201 {clientName, equipmentName, days, totalPrice, status}
                    FE-->>U: Liste rafraîchie
                end
            end
        end
    end
```

---

## 8. Diagramme de séquence — annulation d'une réservation

```mermaid
sequenceDiagram
    autonumber
    actor U as Employé
    participant FE as Frontend React
    participant RC as ReservationController
    participant RS as ReservationService
    participant RR as ReservationRepository
    participant EA as EquipmentApi → Service Matériel
    participant NA as NotificationApi → Service Notification

    U->>FE: Clique sur « Annuler »
    FE->>RC: PATCH /api/reservations/:id/cancel
    RC->>RS: cancel(id)
    RS->>RR: findById(id)
    alt réservation inexistante
        RR-->>RS: null
        RC-->>FE: 404 {message: "Reservation introuvable."}
    else déjà annulée
        RR-->>RS: {status: CANCELLED}
        RS-->>RC: ConflictError
        RC-->>FE: 409 {message: "Cette reservation est deja annulee."}
    else confirmée
        RR-->>RS: {status: CONFIRMED, equipmentId, quantity}
        RS->>EA: PUT /api/equipments/:id/release {quantity}
        EA-->>RS: 200 (quantité remise en inventaire)
        RS->>RR: update(id, {status: CANCELLED, cancelledAt})
        RR-->>RS: document mis à jour
        RS->>NA: POST /api/notifications {type: RESERVATION_CANCELLED}
        NA-->>RS: 201
        RC-->>FE: 200 {status: "CANCELLED"}
        FE-->>U: Liste rafraîchie, matériel de nouveau disponible
    end
```

---

## 9. Diagramme d'états — cycle de vie d'une réservation

```mermaid
stateDiagram-v2
    state "Validation" as Validation
    state "Rejetée" as Rejetee
    [*] --> Validation : POST /api/reservations
    Validation --> Rejetee : 400 données invalides / 404 client ou matériel absent / 409 stock insuffisant
    Validation --> CONFIRMED : stock décrémenté + notification RESERVATION_CONFIRMED
    CONFIRMED --> CONFIRMED : PUT /:id — quantité ou période modifiée, stock et total réajustés
    CONFIRMED --> CANCELLED : PUT ou PATCH /:id/cancel — stock remis + notification RESERVATION_CANCELLED
    CANCELLED --> CANCELLED : nouvelle annulation refusée (409)
    CONFIRMED --> [*] : DELETE /:id — stock libéré
    CANCELLED --> [*] : DELETE /:id
    Rejetee --> [*]
```

---

## 10. Correspondance diagrammes ↔ code source

| Élément du diagramme | Fichier |
| --- | --- |
| `Client`, `ClientRepository`, `ClientService` | `services/client-service/src/domain/` |
| `ClientController` | `services/client-service/src/controllers/ClientController.js` |
| `Equipment`, `EquipmentRepository`, `EquipmentService` | `services/equipment-service/src/domain/` |
| `EquipmentController` | `services/equipment-service/src/controllers/EquipmentController.js` |
| `Reservation`, `ReservationRepository`, `ReservationService` | `services/reservation-service/src/domain/` |
| `ReservationController` | `services/reservation-service/src/controllers/ReservationController.js` |
| `IClientAPI` → `ClientApi` | `services/reservation-service/src/clients/ClientApi.js` |
| `IMaterielAPI` → `EquipmentApi` | `services/reservation-service/src/clients/EquipmentApi.js` |
| `INotificationAPI` → `NotificationApi` | `services/reservation-service/src/clients/NotificationApi.js` |
| `Notification`, `NotificationRepository`, `NotificationService` | `services/notification-service/src/domain/` |
| `NotificationController` | `services/notification-service/src/controllers/NotificationController.js` |
| `AppError`, `ValidationError`, `NotFoundError`, `ConflictError` | `services/*/src/errors/AppError.js` |
| Schémas Mongoose (persistance) | `services/*/src/models/*Model.js` |
