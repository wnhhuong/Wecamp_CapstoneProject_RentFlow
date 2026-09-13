import "dotenv/config";
import express, { NextFunction, Request, Response } from 'express';
import cors from "cors";
import path from "path";
import connectDB from "./config/db.js";

const app = express();

// Connect to MongoDB
await connectDB()

// Middleware
app.use(cors())
app.use(express.json());
app.use(
    "/uploads",
    express.static(path.join(process.cwd(), "uploads"))
);

const port = process.env.PORT || 3000;

app.get('/', (req: Request, res: Response) => {
    res.send('Server is Live!');
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error("Unhandle Error:", err);
    res.status(500).json({
        message: err.message || "Internal Server Error",
        stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
    })
})

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});