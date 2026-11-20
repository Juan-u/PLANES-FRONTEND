# planes-frontend

Frontend del Sistema de Planes de Acción — Instituto del Huila.  
Motor de vistas: EJS. Diseño: Tailwind CSS.

## Requisitos
- Node.js
- El backend (`planes-backend`) corriendo en el puerto 3000

## Instalación

```bash
npm install
```

## Ejecutar

```bash
node index.js
```

El servidor corre en `http://localhost:4000`

## Vistas disponibles

| Ruta | Vista |
|------|-------|
| / | Login |
| /menu | Menú principal |
| /planes | Lista de planes de acción |
| /planes/nuevo | Crear plan |
| /planes/editar/:id | Editar plan |
| /planes/:id_plan/actividades | Actividades de un plan |
| /planes/:id_plan/actividades/nueva | Crear actividad |
| /actividades/editar/:id | Editar actividad |
