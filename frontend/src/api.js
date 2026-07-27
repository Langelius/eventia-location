import axios from "axios";
export const clientsApi = axios.create({ baseURL: "http://localhost:4001/api/clients" });
export const equipmentApi = axios.create({ baseURL: "http://localhost:4002/api/equipments" });
export const reservationsApi = axios.create({ baseURL: "http://localhost:4003/api/reservations" });
export const notificationsApi = axios.create({ baseURL: "http://localhost:4004/api/notifications" });