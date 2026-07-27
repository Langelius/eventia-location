import express from "express";
import cors from "cors";
import routes from "./routes.js";
const app=express(); app.use(cors()); app.use(express.json()); app.get("/health",(req,res)=>res.json({service:"reservation-service",status:"UP"})); app.use("/api/reservations",routes); app.listen(4003,()=>console.log("reservation-service sur le port 4003"));
