import "dotenv/config";
import express, { Request, Response } from 'express';
import cors from "cors";
import path from "path";
import connectDB from "./config/db.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import authRouter from "./routes/auth.routes.js";
import adminParameterRoutes from "./routes/admin/parameter.routes.js";
import adminRoomRoutes from './routes/admin/room.routes.js';
import consumpRequestRouter from "./routes/user/consumpRequest.routes.js";
import userInvoiceRouter from "./routes/user/userInvoice.routes.js";
import approvalRoutes from "./routes/admin/approval.routes.js";
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

// use route
app.use(`/api/auth`, authRouter)

// user route
// consumrequest route
app.use(`/api/user`, consumpRequestRouter)
// invoice route
app.use(`/api/user`, userInvoiceRouter)
//Parameter routes
app.use(`/api/admin/parameters`, adminParameterRoutes)

//Room routes
app.use(`/api/admin/rooms`, adminRoomRoutes)
    
//Approval routes
app.use(`/api/admin/requests`, approvalRoutes)

// Global Error Handler
app.use(errorHandler)

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});