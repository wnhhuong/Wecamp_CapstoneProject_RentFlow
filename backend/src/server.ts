import "dotenv/config";
import express, { Request, Response } from 'express';
import cors from "cors";
import path from "path";
import connectDB from "./config/db.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import authRouter from "./routes/auth.routes.js";
import adminParameterRoutes from "./routes/admin/parameter.routes.js";
import adminRoomRoutes from './routes/admin/room.routes.js';

const app = express();

// Connect to MongoDB
await connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(
    "/uploads",
    express.static(path.join(process.cwd(), "uploads"))
);

//Parameter routes
app.use(`/api/admin/parameters`, adminParameterRoutes)

//Room routes
app.use(`/api/admin/rooms`, adminRoomRoutes)

const port = process.env.PORT || 3000;

app.get('/', (_req: Request, res: Response) => {
    res.send('Server is Live!');
});

// use route
app.use(`/api/auth`, authRouter)

// Global Error Handler
app.use(errorHandler)

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});