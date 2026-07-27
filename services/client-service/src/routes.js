import { Router } from "express";
const router=Router();
const todo=(req,res)=>res.status(501).json({message:"À implémenter par les étudiants"});
router.get("/",todo); router.get("/:id",todo); router.post("/",todo); router.put("/:id",todo); router.patch("/:id/cancel",todo); router.delete("/:id",todo);
export default router;
