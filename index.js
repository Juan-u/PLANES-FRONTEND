import express from 'express';
import session from 'express-session';
import rutas from './app/routes/routes.views.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.set('trust proxy', 1);

app.set('view engine', 'ejs');
app.set('views', './views');

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 2 * 60 * 60 * 1000,
        secure: process.env.NODE_ENV === "production"
    }
}));

app.use('/', rutas);

app.listen(PORT, "0.0.0.0",() => {
    console.log(`Frontend corriendo en ${PORT}`);
});
