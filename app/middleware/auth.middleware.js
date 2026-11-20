const verificarSesion = (req, res, next) => {
    if (!req.session.token) {
        return res.redirect('/');
    }
    next();
};

export default verificarSesion;
