import express from "express";
import { ReportRoutes } from "../modules/report/report.routes";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/reports",
    route: ReportRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));
export default router;
