import express, { NextFunction, Request, Response } from "express";
import multer from "multer";
import authMiddleware from "../middleware/auth";
import asyncHandler from "../middleware/asyncHandler";
import mediaController from "../controllers/media.controller";
import respond from "../utils/respond";
import { uploadSingle } from "../services/mediaStorage";

const router = express.Router();
router.use(authMiddleware.requireAuth);

router.post("/upload", (req: Request, res: Response, next: NextFunction) => {
  uploadSingle(req, res, error => {
    if (!error) return next();
    if (error instanceof multer.MulterError) return respond.fail(res, 400, error.message);
    return respond.fail(res, 400, error.message || "Invalid upload");
  });
}, asyncHandler(mediaController.upload));

router.delete("/:id", asyncHandler(mediaController.remove));

export = router;
