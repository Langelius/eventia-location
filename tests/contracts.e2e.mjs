/**
 * Tests d'integration des contrats REST — Eventia Location.
 *
 * Les quatre services sont montes sur leurs vrais ports (4001-4004) avec des
 * depots EN MEMOIRE a la place de MongoDB : la couche Repository est la seule
 * substituee, tout le reste (entites, services applicatifs, controleurs,
 * routeurs, middlewares, appels REST inter-services par Axios) est le code de
 * production. Les echanges se font en HTTP reel, exactement comme le frontend
 * fourni les effectue.
 *
 * Execution :  cd tests && npm install && node contracts.e2e.mjs
 */
import express from "express";
import cors from "cors";
import axios from "axios";
import assert from "node:assert/strict";

const SERVICES = new URL("../services/", import.meta.url);

const imp = (p) => import(new URL(p, SERVICES).href);

let seq = 0;
const oid = () => (Date.now().toString(16) + (seq++).toString(16).padStart(8, "0")).padEnd(24, "0").slice(0, 24);

class InMemoryRepo {
  constructor() { this.rows = new Map(); }
  static isValidId(id) { return /^[a-f0-9]{24}$/i.test(String(id)); }
  async findAll() { return [...this.rows.values()].sort((a, b) => b.createdAt - a.createdAt); }
  async findById(id) { return this.rows.get(String(id)) ?? null; }
  async findByEmail(email) { return [...this.rows.values()].find((r) => r.email === String(email).toLowerCase()) ?? null; }
  async create(data) {
    const now = new Date();
    const row = { _id: oid(), ...data, createdAt: now, updatedAt: now };
    this.rows.set(row._id, row);
    return row;
  }
  async update(id, data) {
    const row = this.rows.get(String(id));
    if (!row) return null;
    Object.assign(row, data, { updatedAt: new Date() });
    return row;
  }
  async deleteById(id) {
    const row = this.rows.get(String(id));
    if (!row) return null;
    this.rows.delete(String(id));
    return row;
  }
  async decreaseQuantity(id, quantity) {
    const row = this.rows.get(String(id));
    if (!row || row.availableQuantity < quantity) return null;
    row.availableQuantity -= quantity;
    return row;
  }
  async increaseQuantity(id, quantity) {
    const row = this.rows.get(String(id));
    if (!row) return null;
    row.availableQuantity += quantity;
    return row;
  }
}

async function buildApp({ base, mounts, ServicePath, ControllerPath, routerPath, extra }) {
  const Service = (await imp(`${base}/src/domain/${ServicePath}`)).default;
  const Controller = (await imp(`${base}/src/controllers/${ControllerPath}`)).default;
  const createRouter = (await imp(`${base}/src/${routerPath}`)).default;
  const { errorHandler, notFoundHandler } = await imp(`${base}/src/middlewares/errorHandler.js`);
  const repo = new InMemoryRepo();
  const service = extra ? new Service(repo, extra) : new Service(repo);
  const app = express();
  app.use(cors());
  app.use(express.json());
  const controller = new Controller(service);
  for (const mount of mounts) app.use(mount, createRouter(controller));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return { app, repo };
}

const listen = (app, port) => new Promise((res) => { const s = app.listen(port, () => res(s)); });

const ClientApi = (await imp("reservation-service/src/clients/ClientApi.js")).default;
const EquipmentApi = (await imp("reservation-service/src/clients/EquipmentApi.js")).default;
const NotificationApi = (await imp("reservation-service/src/clients/NotificationApi.js")).default;

const clientSvc = await buildApp({ base: "client-service", mounts: ["/api/clients"], ServicePath: "ClientService.js", ControllerPath: "ClientController.js", routerPath: "routes.js" });
const equipSvc = await buildApp({ base: "equipment-service", mounts: ["/api/equipments", "/api/equipements"], ServicePath: "EquipmentService.js", ControllerPath: "EquipmentController.js", routerPath: "routes.js" });
const notifSvc = await buildApp({ base: "notification-service", mounts: ["/api/notifications"], ServicePath: "NotificationService.js", ControllerPath: "NotificationController.js", routerPath: "routes.js" });
const resSvc = await buildApp({
  base: "reservation-service", mounts: ["/api/reservations"], ServicePath: "ReservationService.js",
  ControllerPath: "ReservationController.js", routerPath: "routes.js",
  extra: { clientApi: new ClientApi("http://localhost:4001"), equipmentApi: new EquipmentApi("http://localhost:4002"), notificationApi: new NotificationApi("http://localhost:4004") }
});

const servers = [await listen(clientSvc.app, 4001), await listen(equipSvc.app, 4002), await listen(resSvc.app, 4003), await listen(notifSvc.app, 4004)];

const clients = axios.create({ baseURL: "http://localhost:4001/api/clients", validateStatus: () => true });
const equipments = axios.create({ baseURL: "http://localhost:4002/api/equipments", validateStatus: () => true });
const reservations = axios.create({ baseURL: "http://localhost:4003/api/reservations", validateStatus: () => true });
const notifications = axios.create({ baseURL: "http://localhost:4004/api/notifications", validateStatus: () => true });

let pass = 0, fail = 0;
async function t(name, fn) {
  try { await fn(); pass++; console.log(`  PASS  ${name}`); }
  catch (e) { fail++; console.log(`  FAIL  ${name}\n        ${e.message}`); }
}

console.log("\n== Service client (4001) ==");
let c1;
await t("POST / -> 201 + client cree", async () => {
  const r = await clients.post("/", { name: "Marie Tremblay", email: "Marie@Eventia.ca", phone: "514-555-0134" });
  assert.equal(r.status, 201); assert.equal(r.data.email, "marie@eventia.ca"); assert.ok(r.data._id); c1 = r.data;
});
await t("POST / courriel duplique -> 409", async () => {
  const r = await clients.post("/", { name: "Autre", email: "marie@eventia.ca", phone: "5145550135" });
  assert.equal(r.status, 409);
});
await t("POST / courriel invalide -> 400", async () => {
  assert.equal((await clients.post("/", { name: "X", email: "pasuncourriel", phone: "5145550135" })).status, 400);
});
await t("POST / champs manquants -> 400", async () => {
  assert.equal((await clients.post("/", { name: "X" })).status, 400);
});
await t("GET / -> 200 + tableau", async () => {
  const r = await clients.get("/"); assert.equal(r.status, 200); assert.ok(Array.isArray(r.data));
});
await t("GET /:id -> 200 + client", async () => {
  const r = await clients.get(`/${c1._id}`); assert.equal(r.status, 200); assert.equal(r.data.name, "Marie Tremblay");
});
await t("GET /:id inconnu -> 404", async () => {
  assert.equal((await clients.get("/aaaaaaaaaaaaaaaaaaaaaaaa")).status, 404);
});
await t("PUT /:id -> 200 + client modifie", async () => {
  const r = await clients.put(`/${c1._id}`, { name: "Marie T.", email: "marie@eventia.ca", phone: "514-555-0199" });
  assert.equal(r.status, 200); assert.equal(r.data.phone, "514-555-0199");
});
await t("DELETE /:id -> 204", async () => {
  const tmp = (await clients.post("/", { name: "Temp", email: "temp@eventia.ca", phone: "5145550111" })).data;
  const r = await clients.delete(`/${tmp._id}`); assert.equal(r.status, 204);
  assert.equal((await clients.get(`/${tmp._id}`)).status, 404);
});

console.log("\n== Service materiel (4002) ==");
let e1;
await t("POST / -> 201 + equipement cree", async () => {
  const r = await equipments.post("/", { name: "Projecteur 4K", category: "Video", dailyPrice: "45.5", availableQuantity: "10" });
  assert.equal(r.status, 201); assert.equal(r.data.dailyPrice, 45.5); assert.equal(r.data.availableQuantity, 10); e1 = r.data;
});
await t("POST / prix negatif -> 400", async () => {
  assert.equal((await equipments.post("/", { name: "X", category: "Y", dailyPrice: -1, availableQuantity: 1 })).status, 400);
});
await t("GET /:id -> 200 / 404 si inconnu", async () => {
  assert.equal((await equipments.get(`/${e1._id}`)).status, 200);
  assert.equal((await equipments.get("/aaaaaaaaaaaaaaaaaaaaaaaa")).status, 404);
});
await t("PUT /:id -> 200 + equipement modifie", async () => {
  const r = await equipments.put(`/${e1._id}`, { name: "Projecteur 4K Pro", category: "Video", dailyPrice: 50, availableQuantity: 10 });
  assert.equal(r.status, 200); assert.equal(r.data.name, "Projecteur 4K Pro");
});
await t("PUT /:id/reserve -> 200 + soustraction", async () => {
  const r = await equipments.put(`/${e1._id}/reserve`, { quantity: 3 });
  assert.equal(r.status, 200); assert.equal(r.data.availableQuantity, 7);
});
await t("PUT /:id/reserve quantite insuffisante -> 409", async () => {
  const r = await equipments.put(`/${e1._id}/reserve`, { quantity: 999 });
  assert.equal(r.status, 409); assert.match(r.data.message, /insuffisante/i);
});
await t("PUT /:id/reserve quantite < 1 -> 400", async () => {
  assert.equal((await equipments.put(`/${e1._id}/reserve`, { quantity: 0 })).status, 400);
});
await t("PUT /:id/release -> 200 + remise en stock", async () => {
  const r = await equipments.put(`/${e1._id}/release`, { quantity: 3 });
  assert.equal(r.status, 200); assert.equal(r.data.availableQuantity, 10);
});
await t("alias /api/equipements de l'enonce", async () => {
  const r = await axios.get("http://localhost:4002/api/equipements", { validateStatus: () => true });
  assert.equal(r.status, 200);
});

console.log("\n== Service notification (4004) ==");
await t("POST / -> 201 + notification creee", async () => {
  const r = await notifications.post("/", { recipient: "a@b.ca", message: "Bonjour", type: "info" });
  assert.equal(r.status, 201); assert.equal(r.data.type, "INFO");
});
await t("POST / sans message -> 400", async () => {
  assert.equal((await notifications.post("/", { recipient: "a@b.ca" })).status, 400);
});
await t("type par defaut INFO", async () => {
  const r = await notifications.post("/", { recipient: "a@b.ca", message: "Sans type" });
  assert.equal(r.data.type, "INFO");
});

console.log("\n== Service reservation (4003) : orchestration ==");
let r1;
await t("POST / -> 201 + reservation enrichie, prix total correct", async () => {
  const r = await reservations.post("/", { clientId: c1._id, equipmentId: e1._id, quantity: 2, startDate: "2026-08-01", endDate: "2026-08-03" });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  assert.equal(r.data.status, "CONFIRMED");
  assert.equal(r.data.clientName, "Marie T.");
  assert.equal(r.data.equipmentName, "Projecteur 4K Pro");
  assert.equal(r.data.days, 3, "1er et dernier jour inclus");
  assert.equal(r.data.totalPrice, 3 * 2 * 50);
  r1 = r.data;
});
await t("la quantite disponible a diminue (10 -> 8)", async () => {
  assert.equal((await equipments.get(`/${e1._id}`)).data.availableQuantity, 8);
});
await t("une notification RESERVATION_CONFIRMED a ete enregistree", async () => {
  const r = await notifications.get("/");
  assert.equal(r.data[0].type, "RESERVATION_CONFIRMED");
  assert.match(r.data[0].message, /Reservation confirmee/);
});
await t("historique des notifications : plus recente en premier", async () => {
  const r = await notifications.get("/");
  const dates = r.data.map((n) => new Date(n.createdAt).getTime());
  assert.deepEqual(dates, [...dates].sort((a, b) => b - a));
});
await t("POST / date de fin < date de debut -> 400", async () => {
  const r = await reservations.post("/", { clientId: c1._id, equipmentId: e1._id, quantity: 1, startDate: "2026-08-05", endDate: "2026-08-01" });
  assert.equal(r.status, 400); assert.match(r.data.message, /date de fin/i);
});
await t("POST / quantite < 1 -> 400", async () => {
  assert.equal((await reservations.post("/", { clientId: c1._id, equipmentId: e1._id, quantity: 0, startDate: "2026-08-01", endDate: "2026-08-02" })).status, 400);
});
await t("POST / client inexistant -> 404", async () => {
  const r = await reservations.post("/", { clientId: "aaaaaaaaaaaaaaaaaaaaaaaa", equipmentId: e1._id, quantity: 1, startDate: "2026-08-01", endDate: "2026-08-02" });
  assert.equal(r.status, 404); assert.match(r.data.message, /Client/i);
});
await t("POST / materiel inexistant -> 404", async () => {
  const r = await reservations.post("/", { clientId: c1._id, equipmentId: "aaaaaaaaaaaaaaaaaaaaaaaa", quantity: 1, startDate: "2026-08-01", endDate: "2026-08-02" });
  assert.equal(r.status, 404); assert.match(r.data.message, /Materiel/i);
});
await t("POST / quantite indisponible -> 409 et stock inchange", async () => {
  const r = await reservations.post("/", { clientId: c1._id, equipmentId: e1._id, quantity: 500, startDate: "2026-08-01", endDate: "2026-08-02" });
  assert.equal(r.status, 409);
  assert.equal((await equipments.get(`/${e1._id}`)).data.availableQuantity, 8);
});
await t("reservation d'une seule journee = 1 jour facturable", async () => {
  const r = await reservations.post("/", { clientId: c1._id, equipmentId: e1._id, quantity: 1, startDate: "2026-09-10", endDate: "2026-09-10" });
  assert.equal(r.status, 201); assert.equal(r.data.days, 1); assert.equal(r.data.totalPrice, 50);
  await reservations.put(`/${r.data._id}/cancel`);
});
await t("GET / -> 200 + tableau des reservations", async () => {
  const r = await reservations.get("/"); assert.equal(r.status, 200); assert.ok(r.data.length >= 1);
});
await t("PATCH /:id/cancel (appel du frontend fourni) -> 200 CANCELLED", async () => {
  const r = await reservations.patch(`/${r1._id}/cancel`);
  assert.equal(r.status, 200); assert.equal(r.data.status, "CANCELLED");
});
await t("la quantite est remise dans l'inventaire (-> 10)", async () => {
  assert.equal((await equipments.get(`/${e1._id}`)).data.availableQuantity, 10);
});
await t("une notification RESERVATION_CANCELLED a ete enregistree", async () => {
  assert.equal((await notifications.get("/")).data[0].type, "RESERVATION_CANCELLED");
});
await t("annuler deux fois -> 409", async () => {
  assert.equal((await reservations.put(`/${r1._id}/cancel`)).status, 409);
});
await t("PUT /:id/cancel (verbe de l'enonce) -> 200", async () => {
  const created = (await reservations.post("/", { clientId: c1._id, equipmentId: e1._id, quantity: 1, startDate: "2026-08-01", endDate: "2026-08-02" })).data;
  assert.equal((await reservations.put(`/${created._id}/cancel`)).status, 200);
});
await t("DELETE /:id -> 204 et stock libere", async () => {
  const created = (await reservations.post("/", { clientId: c1._id, equipmentId: e1._id, quantity: 4, startDate: "2026-08-01", endDate: "2026-08-02" })).data;
  assert.equal((await equipments.get(`/${e1._id}`)).data.availableQuantity, 6);
  assert.equal((await reservations.delete(`/${created._id}`)).status, 204);
  assert.equal((await equipments.get(`/${e1._id}`)).data.availableQuantity, 10);
});
await t("PUT /:id -> 200, total et stock recalcules", async () => {
  const created = (await reservations.post("/", { clientId: c1._id, equipmentId: e1._id, quantity: 2, startDate: "2026-08-01", endDate: "2026-08-02" })).data;
  assert.equal(created.totalPrice, 2 * 2 * 50);
  const r = await reservations.put(`/${created._id}`, { quantity: 3, startDate: "2026-08-01", endDate: "2026-08-04" });
  assert.equal(r.status, 200); assert.equal(r.data.quantity, 3); assert.equal(r.data.days, 4); assert.equal(r.data.totalPrice, 4 * 3 * 50);
  assert.equal((await equipments.get(`/${e1._id}`)).data.availableQuantity, 7);
  await reservations.put(`/${created._id}/cancel`);
});
await t("route inconnue -> 404 au format { message }", async () => {
  const r = await reservations.get("/introuvable/xyz");
  assert.equal(r.status, 404); assert.ok(r.data.message);
});

console.log("\n== Parcours frontend fourni (App.jsx) ==");
await t("chargement initial : 4 appels GET en parallele", async () => {
  const [a, b, c, d] = await Promise.all([clients.get("/"), equipments.get("/"), reservations.get("/"), notifications.get("/")]);
  for (const r of [a, b, c, d]) { assert.equal(r.status, 200); assert.ok(Array.isArray(r.data)); }
});
await t("champs attendus par les tableaux du frontend", async () => {
  const c = (await clients.get("/")).data[0];
  ["_id", "name", "email", "phone"].forEach((k) => assert.ok(k in c, `client.${k}`));
  const e = (await equipments.get("/")).data[0];
  ["_id", "name", "category", "dailyPrice", "availableQuantity"].forEach((k) => assert.ok(k in e, `equipment.${k}`));
  const r = (await reservations.get("/")).data[0];
  ["_id", "clientName", "equipmentName", "quantity", "startDate", "endDate", "totalPrice", "status"].forEach((k) => assert.ok(k in r, `reservation.${k}`));
  const n = (await notifications.get("/")).data[0];
  ["_id", "recipient", "message", "createdAt"].forEach((k) => assert.ok(k in n, `notification.${k}`));
});
await t("les erreurs remontent dans data.message (ErrorBox)", async () => {
  const r = await clients.post("/", { name: "", email: "", phone: "" });
  assert.equal(r.status, 400); assert.equal(typeof r.data.message, "string");
});

console.log(`\n===== ${pass} tests reussis, ${fail} echecs =====`);
servers.forEach((s) => s.close());
process.exit(fail ? 1 : 0);
