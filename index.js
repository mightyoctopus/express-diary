require('dotenv').config()

const express = require('express');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const app = express();
const pg = require('pg');

const port = process.env.PORT || 8080; 

const logger = require('./logger');

app.set('view engine', 'ejs');

const basePath = '/express-diary';
app.use(basePath, express.static('public'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Method Override middleware setup:
app.use(methodOverride('_method'));


logger.info(`DB_PASSWORD-logger info: ${process.env.DB_PASSWORD}`);

// DATABASE -- Production
const db = new pg.Client({
    user: 'mhhoymjo_postgres',                
    host: 'localhost',                         
    database: 'mhhoymjo_express_diary',        
    password: process.env.DB_PASSWORD,  
    port: 5432,                               
});


db.connect()
  .then(() => logger.info("PostgreSQL connected"))
  .catch(err => { logger.error("Connection error", err.stack);
   process.exit(1);
  })

// ROUTING

// Route for Homepage:
app.get(`${basePath}/`, (req, res) => {
    res.render('home');
});

// Route for About:
app.get(`${basePath}/about`, (req, res) => {
    res.render('about');
});

// Route for Diary:
app.get(`${basePath}/diary`, async (req, res) => {
    logger.info("Request received for /diary");
    try {
        const result = await db.query('SELECT * FROM "public"."diaries"');
        logger.info("Query successful: %o", result.rows);
        res.render('diary', { data: result.rows, basePath });
    } catch (err) {
        logger.error("Error executing query", err);
        res.status(500).send("Error loading data")
    }
});

// Route for the ADD Page Template:
app.get(`${basePath}/add`, (req, res) => {
    res.render('add', { basePath });
});

// Route for Saving/Adding Diary:
app.post(`${basePath}/add-diary`, async (req, res) => {
    const { title, description, date } = req.body;
    logger.info(`Received data: title: ${title}, description: ${description}, data=${date}`)
    try {
        await db.query('INSERT INTO "public"."diaries" (title, description, date) VALUES ($1, $2, $3)', [title, description, date]);
        res.redirect(`${basePath}/diary`);
    } catch (err) {
        logger.error("Error inserting data", err);
        res.status(500).send("Please fill out all the input fields.");
    }
});

// Route for Post Details Page:
app.get(`${basePath}/diary/:id`, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM "public"."diaries" WHERE id = $1', [req.params.id]);
        res.render('details', { data: result.rows[0], basePath });
    } catch (err) {
        logger.error("Error fetching details(post details)", err);
        res.status(500).send("Error loading post details");
    }
});

// Route for the Edit page:
app.get(`${basePath}/diary/edit/:id`, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM "public"."diaries" WHERE id = $1', [req.params.id]);
        res.render('edit', { data: result.rows[0], basePath });
    } catch (err) {
        logger.error("Error loading edit page", err);
        res.status(500).send("Error loading edit page")
    }
});

// Edit Data:
app.put(`${basePath}/diary/edit/:id`, async (req, res) => {
    const { title, description, date } = req.body;
    const { id } = req.params;
    logger.info(`Received data for update: id: ${id}, title: ${title}, description: ${description}, date: ${date}`)
    try {
        await db.query('UPDATE "public"."diaries" SET title = $1, description = $2, date = $3 WHERE id = $4', [title, description, date, req.params.id]);
        res.redirect(`${basePath}/diary`);
    } catch (err) {
        logger.error("Error updating data", err);
        res.status(500).send("Please fill out all the input fields.");
    }
});

// Delete Data:
app.delete(`${basePath}/diary/delete/:id`, async (req, res) => {
    try {
        await db.query('DELETE FROM "public"."diaries" WHERE id = $1', [req.params.id]);
        res.redirect(`${basePath}/diary`);
    } catch (err) {
        logger.error("Error deleting data", err);
        res.status(500).send("Error deleting data");
    }
});

// CREATE A SERVER:
app.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
});


