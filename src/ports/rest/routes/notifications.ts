import express, { NextFunction, Request, Response } from "express";
import { body } from "express-validator";
import { NotificationsController } from "../../../controllers/notificationsController";
import { AuthRequest, verifyToken } from "../../../middleware/auth";

const router = express.Router();
const notificationsController = new NotificationsController();

router.post(
	"/sale",
	verifyToken,
	body("productId")
		.isInt({ min: 1 })
		.withMessage("Product ID must be a positive integer"),
	(req: AuthRequest, res: Response, next: NextFunction) =>
		notificationsController.sendSaleNotification(req, res, next)
);

router.post(
	"/order-status",
	verifyToken,
	body("user_id")
		.isInt({ min: 1 })
		.withMessage("User ID must be a positive integer"),
	body("order_id")
		.isInt({ min: 1 })
		.withMessage("Order ID must be a positive integer"),
	body("status")
		.isIn(["Pending", "Processing", "Shipped", "Delivered"])
		.withMessage("Invalid status"),
	(req: AuthRequest, res: Response, next: NextFunction) =>
		notificationsController.sendOrderStatusNotification(req, res, next)
);

router.post(
	"/low-stock",
	verifyToken,
	body("productId")
		.isInt({ min: 1 })
		.withMessage("Product ID must be a positive integer"),
	(req: AuthRequest, res: Response, next: NextFunction) =>
		notificationsController.sendLowStockNotification(req, res, next)
);

export = router;
