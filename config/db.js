import mysql from "mysql2";
import { config } from "dotenv";
config();

export const db = mysql.createConnection({
    host: 'mysql-3a644005-pilot.l.aivencloud.com',
    user: 'avnadmin',
    password: 'AVNS_VIB1VS2hy4I8iqElLqX',
    database: 'defaultdb', 
    port: 25469 
});
 
function handleDisconnect() {
    db.connect((err) => {
        if (err) {
            console.error('Error connecting to MySQL:', err); 
            setTimeout(handleDisconnect, 2000);
        } else { 
            console.log('Connected to MySQL'); 
        } 
    }); 

    db.on('error', (err) => {
        console.error('MySQL error:', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            handleDisconnect(); 
        } else {
            throw err;
        }
    });
}

handleDisconnect();
export default db
