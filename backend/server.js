const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Verbinding met MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // Jouw MySQL gebruikersnaam
    password: 'jouw_wachtwoord',
    database: 'metingen_db'
});

// Endpoint om metingen op te slaan
app.post('/opslaan', (req, res) => {
    const { droog, nat, percentage } = req.body;
    const sql = "INSERT INTO resultaten (droog_gewicht, nat_gewicht, percentage) VALUES (?, ?, ?)";
    
    db.query(sql, [droog, nat, percentage], (err, result) => {
        if (err) return res.status(500).send(err);
        res.status(200).send({ message: "Meting opgeslagen!" });
    });
});

app.listen(3001, () => console.log("Server draait op poort 3001"));
