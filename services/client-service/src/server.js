import express from "express";
import cors from "cors";
import routes from "./routes.js";
const app=express(); app.use(cors()); app.use(express.json()); app.get("/health",(req,res)=>res.json({service:"client-service",status:"UP"})); app.use("/api/clients",routes); app.listen(4001,()=>console.log("client-service sur le port 4001"));
