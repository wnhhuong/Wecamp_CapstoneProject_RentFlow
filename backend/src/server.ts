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
import userRequestRouter from "./routes/user/request.routes.js";
import approvalRoutes from "./routes/admin/approval.routes.js";
import AdminDashBoardRoutes from "./routes/admin/dashboard.routes.js";
import guessRouter from "./routes/guest.routes.js";
import userTicketRouter from "./routes/user/ticket.routes.js";
import userProfileRouter from "./routes/user/profile.routes.js";
import adminInvoiceRouter from "./routes/admin/invoice.routes.js";
import userContractRouter from "./routes/user/contract.routes.js";
import userDashboard from "./routes/user/dashboard.routes.js";
import userMoveoutRouter from "./routes/user/moveout.routes.js";
import userCheckoutRouter from "./routes/user/checkout.routes.js";
import userExtendRouter from "./routes/user/extend.routes.js";
import adminUserRouter from "./routes/admin/user.routes.js";

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

// GUEST ROUTES
app.use(`/api/guess`, guessRouter)
app.use(`/api/auth`, authRouter)

// USER ROUTES
// consumrequest route
app.use(`/api/user/consumption-requests`, consumpRequestRouter)
// invoice route
app.use(`/api/user/invoices`, userInvoiceRouter)
app.use(`/api/user/requests`, userRequestRouter)
app.use(`/api/user/dashboard`, userDashboard)

// ticket route
app.use(`/api/user/tickets`, userTicketRouter)

// User profile routes
app.use(`/api/user/profile`, userProfileRouter)

// User contract routes
app.use(`/api/user/contract`, userContractRouter)

// User move-out request routes
app.use(`/api/user/moveout-requests`, userMoveoutRouter)

// User checkout request routes
app.use(`/api/user/checkout-requests`, userCheckoutRouter)

// User contract extension request routes
app.use(`/api/user/extend-requests`, userExtendRouter)

// ADMIN ROUTES
//Admin user routes
app.use(`/api/admin/users`, adminUserRouter)

//Parameter routes
app.use(`/api/admin/parameters`, adminParameterRoutes)

//Dashboard routes
app.use(`/api/admin/dashboard`, AdminDashBoardRoutes)

//Room routes
app.use(`/api/admin/rooms`, adminRoomRoutes)
    
//Approval routes
app.use(`/api/admin/requests`, approvalRoutes)

//Admin invoice route
app.use(`/api/admin/invoices`, adminInvoiceRouter)

// Global Error Handler
app.use(errorHandler)

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});