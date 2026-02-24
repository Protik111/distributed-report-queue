import express from "express";
import { TodoRoutes } from "../modules/todo/todo.route";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/todo",
    route: TodoRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));
export default router;
