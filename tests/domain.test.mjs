/**
 * Tests unitaires des entites du domaine — Eventia Location.
 * Ces classes ne dependent ni d'Express, ni de Mongoose, ni d'Axios :
 * elles se testent donc sans aucune infrastructure.
 *
 * Execution :  cd tests && node --test domain.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";

const S = new URL("../services/", import.meta.url);
const Client = (await import(new URL("client-service/src/domain/Client.js", S).href)).default;
const Equipment = (await import(new URL("equipment-service/src/domain/Equipment.js", S).href)).default;
const Notification = (await import(new URL("notification-service/src/domain/Notification.js", S).href)).default;
const Reservation = (await import(new URL("reservation-service/src/domain/Reservation.js", S).href)).default;

test("Client : normalise et valide les donnees", () => {
  const client = new Client({ name: "  Marie  ", email: "  Marie@EVENTIA.ca ", phone: " 514-555-0134 " });
  assert.equal(client.name, "Marie");
  assert.equal(client.email, "marie@eventia.ca");
  assert.ok(client.isValid());
});

test("Client : refuse un courriel invalide ou des champs vides", () => {
  assert.ok(!new Client({ name: "A", email: "pasuncourriel", phone: "5145550134" }).isValid());
  assert.ok(!new Client({ name: "", email: "a@b.ca", phone: "5145550134" }).isValid());
  assert.ok(!new Client({ name: "A", email: "a@b.ca", phone: "12" }).isValid());
});

test("Equipment : convertit les nombres recus en chaine", () => {
  const equipment = new Equipment({ name: "Projecteur", category: "Video", dailyPrice: "45.5", availableQuantity: "10" });
  assert.equal(equipment.dailyPrice, 45.5);
  assert.equal(equipment.availableQuantity, 10);
  assert.ok(equipment.isValid());
});

test("Equipment : refuse un prix negatif et une quantite non entiere", () => {
  assert.ok(!new Equipment({ name: "A", category: "B", dailyPrice: -1, availableQuantity: 1 }).isValid());
  assert.ok(!new Equipment({ name: "A", category: "B", dailyPrice: 1, availableQuantity: 1.5 }).isValid());
});

test("Equipment.canReserve : respecte le stock disponible", () => {
  const equipment = new Equipment({ name: "A", category: "B", dailyPrice: 10, availableQuantity: 5 });
  assert.ok(equipment.canReserve(5));
  assert.ok(!equipment.canReserve(6));
  assert.ok(!equipment.canReserve(0));
  assert.ok(!equipment.canReserve(2.5));
});

test("Notification : type par defaut INFO et validation minimale", () => {
  assert.equal(new Notification({ recipient: "a@b.ca", message: "Bonjour" }).type, "INFO");
  assert.equal(new Notification({ recipient: "a@b.ca", message: "x", type: "reservation_confirmed" }).type, "RESERVATION_CONFIRMED");
  assert.ok(!new Notification({ recipient: "a@b.ca" }).isValid());
});

test("Reservation : duree incluant le premier et le dernier jour", () => {
  const reservation = new Reservation({ clientId: "c", equipmentId: "e", quantity: 2, startDate: "2026-08-01", endDate: "2026-08-03" });
  assert.equal(reservation.durationInDays(), 3);
  assert.equal(new Reservation({ clientId: "c", equipmentId: "e", quantity: 1, startDate: "2026-08-01", endDate: "2026-08-01" }).durationInDays(), 1);
});

test("Reservation : total = jours x quantite x prix quotidien", () => {
  const reservation = new Reservation({ clientId: "c", equipmentId: "e", quantity: 2, startDate: "2026-08-01", endDate: "2026-08-03" });
  assert.equal(reservation.computeTotal(45.5), 3 * 2 * 45.5);
  reservation.applyPricing(50);
  assert.equal(reservation.totalPrice, 300);
  assert.equal(reservation.days, 3);
});

test("Reservation : refuse une date de fin anterieure et une quantite < 1", () => {
  const inverse = new Reservation({ clientId: "c", equipmentId: "e", quantity: 1, startDate: "2026-08-05", endDate: "2026-08-01" });
  assert.ok(!inverse.isValid());
  assert.match(inverse.validate().errors.join(" "), /date de fin/i);
  assert.ok(!new Reservation({ clientId: "c", equipmentId: "e", quantity: 0, startDate: "2026-08-01", endDate: "2026-08-02" }).isValid());
  assert.ok(!new Reservation({ equipmentId: "e", quantity: 1, startDate: "2026-08-01", endDate: "2026-08-02" }).isValid());
});

test("Reservation : etat initial CONFIRMED puis annulation", () => {
  const reservation = new Reservation({ clientId: "c", equipmentId: "e", quantity: 1, startDate: "2026-08-01", endDate: "2026-08-02" });
  assert.equal(reservation.status, "CONFIRMED");
  reservation.cancel();
  assert.equal(reservation.status, "CANCELLED");
  assert.ok(reservation.isCancelled());
  assert.ok(reservation.cancelledAt instanceof Date);
});
