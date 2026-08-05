import express from 'express';
import session from 'express-session';
import rutas from './app/routes/routes.views.js';

const app = express();
const PORT = 4000;

app.set('view engine', 'ejs');
app.set('views', './views');

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret           : 'secreto_planes_accion',
    resave           : false,
    saveUninitialized: false,
    cookie           : { maxAge: 2 * 60 * 60 * 1000 }
}));

app.use('/', rutas);

app.listen(PORT, () => {
    console.log(`Frontend corriendo en http://localhost:${PORT}`);
    console.log(`Asegúrate de que el backend esté corriendo en http://localhost:3000`);
});
