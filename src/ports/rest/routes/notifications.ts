import express, { NextFunction, Request, Response } from "express";
import { body } from "express-validator";
import { NotificationsController } from "../../../controllers/notificationsController";

const router = express.Router();
const notificationsController = new NotificationsController();

router.post("/sale",
    body("productId").notEmpty().withMessage("Product ID is required"),
    (req: Request, res: Response, next: NextFunction) => notificationsController.sendSaleNotification(req, res, next)
);

export = router;