import "dotenv/config";
import express, { Request, Response } from 'express';
import cors from "cors";
import path from "path";
import connectDB from "./config/db.js";
import { errorHandler } from "./middlewares/error.middleware.js";

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

const port = process.env.PORT || 3000;

app.get('/', (_req: Request, res: Response) => {
    res.send('Server is Live!');
});

// Global Error Handler
app.use(errorHandler)

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});