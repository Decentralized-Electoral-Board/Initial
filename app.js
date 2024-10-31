import express from "express";
import cors from "cors";
import {config} from "dotenv";
import cookieParser from 'cookie-parser';
import {db} from "./config/db.js"

//ROUTES
import adminAuthRoute from "./routes/authenticationRoute.js"
import newElectionRoute from "./routes/addElection.js"

const app = express();
config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/v1/admin', adminAuthRoute);
app.use('/api/v1/admin', newElectionRoute); 


const port = process.env.PORT
app.listen(port, ()=>{
    console.log("Election server up and running")
});
