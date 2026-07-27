import express from "express";
import cors from "cors";
import routes from "./routes.js";
const app=express(); app.use(cors()); app.use(express.json()); app.get("/health",(req,res)=>res.json({service:"notification-service",status:"UP"})); app.use("/api/notifications",routes); app.listen(4004,()=>console.log("notification-service sur le port 4004"));
