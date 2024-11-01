import express from "express";
import cors from "cors";
import {config} from "dotenv";
import cookieParser from 'cookie-parser';
import {db} from "./config/db.js"

//ROUTES
import adminAuthRoute from "./routes/authenticationRoute.js"
import newElectionRoute from "./routes/electionActionsRoute.js"
import userRoutes from "./routes/userRoutes.js"

const app = express();
config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/v1/admin', adminAuthRoute);
app.use('/api/v1/admin', newElectionRoute); 
app.use('/api/v1/auth', userRoutes); 


const port = process.env.PORT
app.listen(port, ()=>{
    console.log("Election server up and running")
});
