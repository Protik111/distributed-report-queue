import cors from "cors";
import express, { Application, NextFunction, Request, Response } from "express";
import routes from "./app/routes";
import cookieParser from "cookie-parser";

const app: Application = express();
const corsOptions = {
  origin: "*",
};

app.use(cors(corsOptions));
app.use(cookieParser());

//parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/health", (req: Request, res: Response) => {
  res.status(200).json({
    health: `Ok`,
  });
});

app.use("/api/v1", routes);

//handle not found
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(400).json({
    success: false,
    message: "Not Found",
    errorMessages: [
      {
        path: req.originalUrl,
        message: "API Not Found",
      },
    ],
  });
  next();
});

export default app;
