import express from "express";
import cors from "cors";
import {config} from "dotenv";
import cookieParser from 'cookie-parser';
//import {db} from "./config/db.js"

const app = express();
config();

const port = process.env.PORT
app.listen(port, ()=>{
    console.log("Election server up and running")
});
