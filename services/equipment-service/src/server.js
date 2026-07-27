import express from "express";
import cors from "cors";
import routes from "./routes.js";
const app=express(); app.use(cors()); app.use(express.json()); app.get("/health",(req,res)=>res.json({service:"equipment-service",status:"UP"})); app.use("/api/equipments",routes); app.listen(4002,()=>console.log("equipment-service sur le port 4002"));
