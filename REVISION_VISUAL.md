# Modernizacion visual controlada

Fecha: 2026-11-02. Rama: develop. Skill utilizado: frontend-design.

## Verificación Docker final y entrega (03/11/2026)

Sin nuevo bloque funcional ni cambios de interfaz. Dockerfiles existentes de ambos
repositorios construidos y ejecutados con MariaDB nueva, red propia y 3015/4015.
43 tablas, 86 FK y 20 disparadores instalados sin datos iniciales. Fixtures de
cuentas/RBAC se limitaron a ese contenedor; login scrypt/JWT y sesión real del BFF,
diez rutas principales, plan con CSRF, actividad/seguimiento pendiente, evidencia
privada, CSV y página de impresión: parte de 44 comprobaciones aprobadas.
CI, aprobación de seguimiento y publicación institucional siguieron bloqueados.

Se corrigió solo el healthcheck del descriptor del ensayo: ping no acreditaba SQL
autenticado al inicializar MariaDB; SELECT 1 por TCP resolvió el arranque. Los dos
intentos previos y el exitoso retiraron sus propios recursos. No se modificaron
credenciales ni el código de autenticación para hacerlo pasar. No se repitió la
matriz visual ni las suites históricas; esta etapa verificó ejecución Docker.

Ensayo de respaldo únicamente sintético: cifrado AES-256-GCM/scrypt en Windows,
descifrado en proceso independiente y Linux, SQL restaurado con checksums de las
43 tablas coincidentes, clave incorrecta/manipulación rechazadas. Prueba adicional
de paquete SQL+evidencia recuperó y verificó el archivo en Linux sin red. Ningún
respaldo real DPAPI se leyó, descifró o convirtió. Custodia y simulacro externo
siguen pendientes; no se declara aceptación o producción.

El contenedor original conserva ID a1ab064c0fe9 y los procesos originales PID
74584/3000 y 27328/4000. La base persistente no se utilizó ni consultó: 43 tablas/
171 registros es el último recuento K, no una nueva prueba de esta actividad.
Contenedores, volúmenes, red y etiquetas de aplicación del ensayo retirados; recursos
preexistentes preservados, sin prune de imágenes base o caché.

Archivos: nuevo `test-db/verify-docker.mjs` en backend, evidencia local ignorada
`test-db/docker-final.tmp/`, actualizaciones de `GUIA_INSTALACION.md`,
`OPERACION_Y_RECUPERACION.md`, `LISTA_ENTREGA_OPERATIVA.md`,
`INSTITUTIONAL_REPORTS.md`, `ARQUITECTURA.md` y este informe. La utilidad mantenida
se comprobó sintácticamente y en su modo de descifrado sintético; el ensayo completo
se ejecutó con el precursor equivalente temporal. No hubo push, merge, despliegue
ni cambios a cálculos, permisos, reglas o datos comerciales.

## Bloque K — cierre técnico sin cambios visuales (03/11/2026)

Se mantuvo la validación guiada del propietario de J, sin solicitar otra sesión ni
capturar credenciales. Sin cambios de vistas, fórmulas o autoridades institucionales.
Instalación limpia de dependencias backend/frontend con `npm.cmd ci --offline` en
copias separadas, imports correctos y lockfiles intactos. Plantillas `.env.example`
con secretos vacíos, `npm start` y `start:local` preparados sin alterar archivos reales.
Dockerfiles usan `npm ci`; Compose pasa configuración explícita y dirige al backend
por su nombre de servicio. Se validó configuración completa/incompleta, sin build/up.

Nuevo comprobador local: seis HTTP sin sesión ni escrituras correctos, cinco
pruebas propias backend y cuatro regresiones de configuración aprobadas. No se
repitieron las 617 pruebas históricas ni los 24 escenarios visuales de J. Baseline
autocontenido sin datos instalado en base desechable: 43 tablas/86 FK/20 disparadores,
cero registros. Fuente intacta: 43 tablas y 171 registros. Copia eliminada.
Sin migraciones persistentes, cambios de credenciales, registros o permisos, ni
reinicios, respaldos completos adicionales, push, merge o despliegues.

Archivos K: `package.json`, `.gitignore`, `.dockerignore`, `.env.example`, Dockerfile y README de
ambos repositorios; raíz `docker-compose.yml`, `docker-compose.env.example` y
advertencia de vigencia en `ARQUITECTURA.md`. Backend: `scripts/check-local.mjs`,
`test/operations/check-local.test.js`, `schema/through-block-f.sql`/`.json`,
`test-db/verify-installation.mjs`, aviso en `test-db/README.md`, guías nuevas
`GUIA_INSTALACION.md`, `OPERACION_Y_RECUPERACION.md` y actualización de
`LISTA_ENTREGA_OPERATIVA.md`/`INSTITUTIONAL_REPORTS.md`. Este informe también actualizado.

Se mantienen pendientes build/red Docker en otro entorno, producción, custodia de
respaldos fuera del perfil Windows, soporte operativo y aceptación institucional.
La estructura vacía no crea administradores ni sustituye aprovisionamiento autorizado.

## Bloque J — consolidación y comprobación guiada (03/11/2026)

`frontend-design` conservando la identidad azul/blanco y los componentes existentes.
Nuevo parcial `views/partials/record-state.ejs`: presenta estados/actuaciones en
español sin traducir valores de formularios, datos almacenados ni reglas. Informes
ofrece enlaces privados para evidencias con metadatos de archivo autorizados;
la versión de impresión conserva el nombre sin enlaces de descarga. El backend
sigue revalidando permisos al descargar.

`views/control-interno.ejs` conserva plan/actividad al consultar el contexto y el
plan al volver a hallazgos; agrega destino de foco al contenido y muestra fechas
explícitamente UTC mediante `workflow-instant` en hora colombiana. No se asigna
zona horaria a fechas históricas desconocidas. Estados y eventos reutilizan el
parcial nuevo. Registro, recomendaciones y demás escrituras CI siguen bloqueados.

Se corrigió la validación del informe histórico de calificaciones: consulta y
CSV rechazan trimestre fuera de 1–4 antes de consultar SQL, igual que el filtro
visible y el informe integrado. No cambia la fórmula de ningún indicador.
Una utilidad temporal de I llamada `test-focused.mjs` era recogida indebidamente
por `node --test`; se renombró a `verify-focused.mjs`. Su intento accidental falló
antes de preparar ninguna copia. La suite normal ya no inicia ese ensayo operativo.

Pruebas: 419 backend y 198 frontend = **617 aprobadas**. Nuevas pruebas de estados
escapados, cero aprobado, descarga autorizada/impresión, contexto CI y UTC; rechazo
de trimestres inválidos en consulta/CSV. Se ejecutaron primero las focalizadas y
después regresiones de la suite. Edge con datos sintéticos: 24 combinaciones de
informe, impresión, detalle CI y listado vacío a 320/390/768/1440 px, con menú
abierto/contraído cuando corresponde; sin desbordamiento ni excepciones JS,
controles etiquetados y PDF generado. Capturas escritorio/móvil inspeccionadas.
No se reconstruyeron ni repitieron auditorías de panel, usuarios, planes o E.

Sesión real: el propietario inició sesión por su cuenta en `localhost:4000` y
confirmó «todos los módulos permitidos abren». Se registra como **confirmación
guiada del propietario**, no como observación automática del navegador ni prueba
de permisos efectivos de módulos concretos. No se pidió ni capturó contraseña,
correo, cookie, token o información de registros. No hubo usuarios nuevos.

Persistencia: comparación completa de contenido y definiciones contra I, 43 tablas,
171 registros y 86 relaciones sin cambios. No se ejecutaron migraciones ni se
introdujeron fixtures en la fuente. Solo se reinició el backend, conservando su
entorno, para cargar la corrección de trimestre: PID 74584/3000; frontend PID
27328/4000 sin reiniciar, manteniendo la sesión del propietario. Tres comprobaciones
HTTP posteriores correctas. Sin cambios de credenciales, permisos, cálculos o
aprobaciones, ni dependencias nuevas, push, merge o despliegue.

Archivos J: frontend `views/informe-institucional.ejs`, `views/control-interno.ejs`,
parcial nuevo `views/partials/record-state.ejs` y `test/final-consolidation.test.js`;
backend `app/controllers/controller.readmodels.js` y
`test/plans/controller.readmodels.test.js`; herramienta temporal renombrada citada.
Documentación: este informe, sección J en `INSTITUTIONAL_REPORTS.md`, anotación en
`ACTIVACION_PERSISTENTE_BLOQUE_I.md` y nueva `LISTA_ENTREGA_OPERATIVA.md`.
Siguiente bloque recomendado: cierre de la lista de entrega y aceptación operativa
institucional en entorno autorizado; mantener cerradas las actuaciones pendientes
de autoridad, sin revisar de nuevo roles o permisos ya aprobados.

## Bloque I — migración autorizada completada (03/11/2026)

UP F aplicado al destino aislado autorizado tras restauración del respaldo indicado
y de uno nuevo inmediato. Fuente: 43 tablas/171 registros originales íntegros/86
relaciones sin huérfanos, sin datos de prueba nuevos. Cuatro tablas F vacías,
ocho relaciones y cuatro disparadores disponibles. Reinicio necesario de backend
y frontend conservando entornos: PID 81776/3000 y 27328/4000.

Consultas con RBAC real y SELECT exclusivo sobre destino, seis comprobaciones HTTP
y 31 pruebas autenticadas reales focalizadas en réplica idéntica: informes/CSV/PDF,
consulta CI, permisos y bloqueos. La sesión web de una cuenta existente sobre 4000
queda pendiente por no disponer de credenciales; no se cambiaron ni extrajeron.
Sin repetir matriz visual ni suite histórica y sin cambios funcionales de código.
Copias y procesos auxiliares retirados, respaldos conservados. Actuaciones
institucionales siguen bloqueadas. Informe vigente:
`../proyecto backend erick/ACTIVACION_PERSISTENTE_BLOQUE_I.md`.

## Bloque I — preparación de activación (03/11/2026)

Sin cambios de interfaz ni código funcional. Respaldo nuevo cifrado restaurado,
ensayo UP F sobre copia y comparación de integridad completos. La fuente conserva
39 tablas/171 registros/78 relaciones sin huérfanos; la copia migrada tuvo 43
tablas/171 registros/86 relaciones. Copia eliminada, respaldos conservados.
Cuatro comprobaciones HTTP de continuidad aprobadas. No se repitieron pruebas
visuales/autenticadas de H/G ni se iniciaron sesiones persistentes nuevas.
La migración persistente exige autorización expresa aún pendiente; procesos
3000/4000 intactos. Sin cambios a permisos, cálculos, credenciales o restricciones.
Informe: `../proyecto backend erick/PREPARACION_ACTIVACION_BLOQUE_I.md`.

## Bloque H — ensayo operativo autenticado (03/11/2026)

F se ensayó sobre una restauración completa, nunca sobre la base persistente.
Backend/frontend reales en 3010/4010, scrypt y sesiones reales con cuentas nuevas
sintéticas. Se comprobaron formularios C, seguimiento/evidencias E, informes/CSV/
PDF y consulta CI, permisos, logout y bloqueos: 59 comprobaciones aprobadas.
El login detectó una discrepancia: el middleware aún verificaba contra 3000;
se corrigió para usar la misma BACKEND_API_URL validada del controlador.
PORT y APP_HOST permiten instancias separadas; valores predeterminados intactos.
Sin cambios a autenticación crítica, roles, cálculos, autoridad o diseño visual.

612 pruebas automatizadas aprobadas (418 backend/194 frontend). Esta fase no
repitió la matriz responsive G: validó recorridos reales y PDF autenticado.
Respaldo nuevo DPAPI restaurado, cuatro tablas/ocho FK/cuatro disparadores F
verificados en la copia. Fuente conserva 39 tablas/171 registros; PID originales
40988 y 20728 en 3000/4000 sin reiniciar. Copia, perfil y archivos sintéticos
retirados; respaldos conservados. Activación persistente sigue pendiente.
Informe: `../proyecto backend erick/VALIDACION_OPERATIVA_BLOQUE_H.md`.

## Bloque G — integración y consolidación (03/11/2026)

Se utilizó `frontend-design` preservando azul/blanco, tipografía, menú y C/D/E/F.
Se corrigió la pérdida de filtros al abrir detalle y su descarte silencioso antes
de consultar/exportar. Los filtros inválidos ahora se rechazan; errores de consulta
conservan valores editables en una pantalla accesible. Nuevo parcial de consultas
relacionadas entre actividad, seguimiento, informe y contexto CI, condicionado por
permisos y con plan/actividad/período. El contexto CI mantiene su navegación activa.

El backend informa disponibilidad real de exportación con las estructuras F; si
faltan se conserva la consulta y se explica el bloqueo de CSV/PDF. Consultas GET
anuncian carga y recuperan controles al volver por historial. Sin cambios en login,
comportamiento del menú, cálculos, datos, credenciales o autoridades institucionales.

Pruebas G: 417 backend + 191 frontend = 608 aprobadas; 74 comprobaciones desechables
con respaldo sintético restaurado y fuente intacta (39 tablas, 171 registros).
Edge: 24 combinaciones de informe/impresión/contexto/error a 320, 390, 768 y 1440 px,
menú abierto/contraído; sin desbordamientos ni errores JS, etiquetas y PDF sintético
verificados; capturas revisadas. No se probó una sesión autenticada real.

F permanece sin activar. No se reiniciaron procesos ni hubo migración persistente,
DOWN, cambio de permisos, dependencias nuevas, commit, push, merge o despliegue.
Archivos, errores corregidos y siguiente etapa documentados en la sección G de
`../proyecto backend erick/INSTITUTIONAL_REPORTS.md`.

## Bloque F — Informes y Control Interno (preparado, no activado)

Implementación en `develop` con `frontend-design` y Documento Maestro de Reglas.
Consulta integrada por plan, proceso, responsable, objetivo, actividad, período,
año/trimestre y estados. Avance aprobado y cobertura usan servicios oficiales
existentes, sin promediar trimestres ni asignar cero a pendientes. Datos aprobados,
provisionales y carácter analítico se identifican; publicación oficial bloqueada.

CSV autorizado y auditado con filtros, UUID, usuario, hora y hash de contenido;
vista privada de impresión/Guardar PDF del navegador, probada con PDF real en
Edge. No hay servicio PDF binario nuevo ni dependencias instaladas.

Control Interno consulta ámbito autorizado y expedientes separados: hallazgos,
observaciones, recomendaciones, respuestas, atención e historial. Persistencia y
conflictos de revisión implementados y probados con autoridad sintética; las rutas
reales conservan esa autoridad cerrada y la interfaz informa el bloqueo.
No se asimila consulta de auditoría a autorización de datos de negocio ni aprobación.

Archivos F: backend servicios `institutional-report.rules.js`,
`institutional-report.service.js`, `internal-control.service.js`, controlador y
rutas `institutional-reports`, `index.js`, migraciones `20261104_reports_control`,
pruebas y `test-db/verify-reports-control.mjs`. Frontend:
`institutional-reports.views.js`, controladores/rutas, vistas nuevas
`informe-institucional.ejs`, `control-interno.ejs`, enlace en `informes.ejs`,
navegación CI condicionada por capacidad existente, `style.css`, `app.js` y pruebas.

Pruebas: 416 backend + 181 frontend = 597 aprobadas. Bases desechables: 72
comprobaciones con respaldo sintético restaurado, UP real, persistencia, SQL RBAC
real con asignaciones temporales sintéticas, escenarios simulados y rechazos.
Edge: 24 configuraciones a 320/390/768/1440 px y menú abierto/contraído, sin
desbordamiento ni errores JS; PDF real, etiquetas y capturas revisados. Se corrigió
un desbordamiento de texto a 320 px mediante estilos exclusivos de `.report-page`.

Cuatro tablas, ocho FK y cuatro disparadores nuevos preparados. No se migró F a
`planes_accion_test`, que conserva sus 39 tablas y 171 registros. No se reiniciaron
los procesos activos ni se realizó prueba autenticada real de F. Sin cambios de
credenciales, roles, permisos reales, porcentajes, reglas de aprobación ni datos
comerciales; sin dependencias, DOWN, commit, push, merge o despliegue.
Límites y activación: `../proyecto backend erick/INSTITUTIONAL_REPORTS.md`.

## Activación local del Bloque E — completada

El 02/11/2026 se activó E en `127.0.0.1:3307/planes_accion_test` después de
respaldar con DPAPI y restaurar/verificar en una base desechable. Solo se aplicó
el UP E. Se conservaron los datos completos de las 32 tablas y 171 registros;
ahora hay 39 tablas y los mismos 171 registros. Las 78 relaciones no tienen
huérfanos. Nuevas estructuras: 15 relaciones y 14 disparadores inmutables.

Backend y frontend reiniciados con el entorno anterior conservado, puertos 3000
y 4000. Pruebas: 384 backend y 174 frontend aprobadas; 19 comprobaciones HTTP;
lecturas y renderizado EJS con datos actuales para C/D/E. Diez actuaciones
institucionales rechazadas sin DML. No se inició una sesión HTTP de usuario ni se
guardaron formularios o registros de prueba. La revisión autenticada se realiza
desde `http://localhost:4000/seguimiento` con el acceso normal autorizado.

Aprobaciones, recepción/devolución, apertura/cierre y reapertura institucional
permanecen bloqueadas. No se modificaron credenciales, roles, permisos, porcentajes
o datos comerciales. No se editó `.env`, instaló dependencias ni ejecutó DOWN,
commit, push, merge o despliegue. Informe y recuperación:
`../proyecto backend erick/ACTIVACION_LOCAL_BLOQUE_E.md`.

Esta activación actualiza el estado histórico de «preparado, sin activación»
descrito a continuación; los límites institucionales continúan vigentes.

## Bloque E: seguimiento trimestral integrado — preparado, sin activación local

Implementado en `develop` con `frontend-design`, conservando C/D, diseño azul/blanco
y comportamiento del menú. No se aplicó la migración E al entorno abierto.

Frontend modificado: controladores/rutas de vistas, `index.js`,
`views/actividad-detalle.ejs`, `public/app.js`, `public/style.css`; nueva vista
`views/seguimiento-integrado.ejs` y parcial `views/partials/evidence-upload.ejs`.
Pruebas de vista, BFF binario, CSRF y recuperación de formularios.

Backend: nuevos servicios `quarterly-integration.rules.js`, `.context.js` y
`.service.js`, controlador y rutas `quarterly-integration`; integración en
seguimiento, evidencias, almacenamiento e `index.js`. Exclusiones de archivos
privados en `.gitignore`/`.dockerignore`. Migraciones UP/DOWN
`20261103_quarterly_integration`, pruebas unitarias/HTTP y herramienta
`test-db/verify-quarterly-integration.mjs`. Documentación técnica:
`QUARTERLY_INTEGRATION.md` en backend y `ARQUITECTURA.md`.

Avance trimestral y general separados, cero distinto de ausencia de aprobación,
referencias de objetivos/indicadores C, instantáneas e historial. Fórmulas
oficiales intactas. Carga binaria privada de 10 MiB; API anterior de 64 KiB
conservada. Los errores mantienen selección y observaciones en el navegador.
Se informa el fallo de consulta integrado, distinguiéndolo del esquema ausente.

Solicitar reapertura no abre períodos. Aprobar, decidir, abrir/cerrar, reabrir y
verificar evidencias institucionalmente siguen bloqueados por defecto en backend.
La terminación integral no se certifica sin requisitos de evidencia formalmente
definidos/verificados y nunca cierra un plan. No se inventa un calendario de
obligaciones trimestrales ni se evalúa la fórmula del indicador como código.

Pruebas: 384 backend y 174 frontend aprobadas; 41 comprobaciones en bases
desechables con respaldo sintético restaurado, UP real, carga de 10485760 bytes,
integridad y bloqueos. Las decisiones RBAC de esas cuentas son simuladas; no se
cambian permisos reales. Edge: 24 combinaciones a 320, 390, 768 y 1440 px, menú
abierto/contraído, sin desbordamiento ni errores JavaScript; etiquetas y retención
del archivo ante error comprobadas. Capturas de escritorio/móvil inspeccionadas.
No equivale a una sesión autenticada real de E.

Fuente C/D sin cambios: 32 tablas, 171 registros; no recibió E. No se reiniciaron
procesos ni se modificaron credenciales, roles, permisos, datos comerciales o
cálculos. No hubo dependencias nuevas, commit, push, merge ni despliegue.
Activación futura: respaldo completo nuevo restaurable y autorización separada.
El DOWN no se ejecuta automáticamente. Véase el procedimiento técnico citado.

## Bloque D — expediente y flujo institucional preparado

### Activación local posterior autorizada

UP de D aplicado exclusivamente a `127.0.0.1:3307/planes_accion_test`, tras crear un
respaldo completo nuevo cifrado, comprobar su SHA256, restaurarlo y ensayar UP en
esa restauración. Las 30 tablas anteriores y sus 171 registros se conservaron
exactamente. Ambas tablas D, cuatro claves foráneas y ambos triggers están
verificados; las tablas nuevas permanecen vacías. No se ejecutó DOWN.

Backend y frontend reiniciados con su configuración aislada conservada, sin editar
`.env`: PID 56968/puerto 3000 y PID 20632/puerto 4000. Pasaron 361 pruebas backend,
168 frontend y 23 comprobaciones HTTP. Lectura y renderizado con datos existentes
C/D correctos; las cinco actuaciones se rechazan por autoridad no configurada y
sus controles permanecen deshabilitados. No se fabricó una sesión web ni se
guardaron formularios de prueba; queda pendiente la comprobación HTTP con la
sesión del usuario. Es necesario iniciar sesión nuevamente tras el reinicio.

C continúa en `/planes` y `/actividades`; D está disponible en `/planeacion` y
`/planes/ID/gestion`, accesible desde Gestión institucional de cada plan.
La activación no autoriza aprobación, recepción, devolución, presentación formal,
observaciones institucionales ni designaciones oficiales de responsables. No se
modificaron credenciales, roles, permisos, datos comerciales o cálculos.

Respaldo completo, manifiesto, verificaciones y recuperación en
`../proyecto backend erick/ACTIVACION_LOCAL_BLOQUE_D.md`.
Las secciones siguientes describen la entrega técnica previa a esta activación.

### Entrega técnica anterior a la activación

Se utilizó `frontend-design`, el Documento Maestro (secciones 3 y 4), el código
actual y la documentación del Bloque C. Trabajo en `develop` en ambos repositorios.
El diseño conserva azul/blanco, tipografía y navegación existente.

### Implementación técnica

Motor backend para Borrador, Presentado a Planeación, En revisión, Devuelto para
correcciones y Aprobado. Presentación, recepción, observación, devolución, nueva
presentación y decisión de aprobación tienen servicios, rutas, validación,
persistencia e historial. **Las actuaciones institucionales están cerradas por
defecto en el servidor**: no se habilitan por un nombre de rol, permiso de edición,
un parámetro de cliente ni una variable de entorno.

El catálogo contiene `plans.submit`/`plans.approve`, pero los perfiles operativos
están documentados como asumidos. Faltan confirmar autoridades/ámbitos y capacidades
para recepción, observación y devolución. También falta la fuente autorizada de
designaciones de responsables y los requisitos condicionales de meta/indicador.
No se sustituyeron esas decisiones con reglas técnicas ni asignaciones de permisos.

La consulta y preparación opcional del borrador quedan implementadas con los
permisos existentes de lectura/edición, para cuando se active D. Se guardan fechas
de calendario del plan y cuenta responsable propuesta; una cuenta activa no implica
designación institucional. La validación separa datos faltantes de confirmaciones
institucionales. No exige todos los campos para guardar ni inventa obligatoriedad
universal de fórmula, unidad, fuente o evidencias esperadas.

Se agregaron revisión concurrente y huella del contenido presentado. Los guardas
en la API C bloquean edición de planes y creación/edición de actividades mientras
el plan esté presentado, en revisión o aprobado; Devuelto permite correcciones.
No se modifican estados de actividades, períodos, seguimientos ni cálculos.

El historial es transaccional y acumulativo, con actor, fecha UTC, estados,
observación/motivo, referencia institucional e instantánea con SHA256. Triggers
rechazan UPDATE/DELETE de eventos. No hay rutas para sobrescribir observaciones.
El instante se presenta en hora colombiana, conservando su `datetime` original.

### Vistas e interacción

Bandeja de Planeación con filtros y paginación; expediente con estado explícito,
datos pendientes por campo, propuesta de responsabilidad, actuaciones e historial
con autor/fecha. Los estados heredados se identifican por separado y no se convierten
automáticamente. Una migración incompleta o consulta fallida se muestra como
indisponibilidad, no como lista vacía. La disponibilidad requiere tablas y ambos
triggers. Los enlaces nuevos se muestran solo cuando el backend confirma esa
disponibilidad; C sigue operativo antes de migrar D.

Se reutiliza CSRF y se conservan los campos permitidos ante errores en la sesión,
sin credenciales ni tokens. La propuesta conservada se puede consultar aun si el
estado dejó de permitir edición. Cambios sin guardar en preparación bloquean las
actuaciones del navegador. Las comprobaciones del servidor son independientes.

### Archivos de esta etapa

- Backend: `index.js`, `controller.plan.js`, `controller.activity.js`, nuevo
  `controller.plan-workflow.js`, nuevo `routes.plan-workflow.js`, nuevos servicios
  `plan-workflow.rules.js`, `.guard.js` y `.service.js`.
- Migraciones `20261103_plan_workflow.up.sql` y `.down.sql`; nuevo comprobador
  `test-db/verify-plan-workflow.mjs`. Pruebas de controladores C actualizadas para
  simular la ausencia de D y nuevas `test/plans/plan-workflow.test.js` y
  `test/plans/routes.plan-workflow.test.js`.
- Frontend: `controller.views.js`, nuevo `plan-workflow.views.js`, `routes.views.js`,
  `views/planes.ejs`, `views/actividades.ejs`, nuevo `views/planeacion.ejs`, nuevo
  `views/plan-gestion.ejs`, parcial nuevo `workflow-instant.ejs` y ajuste acotado de
  `institutional-read.ejs`, `public/app.js`, `public/style.css` y nueva prueba
  `test/plan-workflow.test.js`.
- Documentación: este informe, `ARQUITECTURA.md` y nuevo documento backend
  `PLAN_WORKFLOW.md`, con contratos, decisiones pendientes y activación posterior.

### Verificación y límites

- 361 pruebas backend y 168 frontend aprobadas, cero fallos.
- MariaDB real en bases desechables: 40 comprobaciones aprobadas, con respaldo
  de esquema/datos sintéticos y restauración verificada antes de UP. Se conservan
  los fixtures C anteriores a migrar y no se realizan transiciones sobre ellos.
- Presentación, revisión, observación, devolución y nueva presentación probadas
  solo sobre planes nuevos del comprobador, con autorizaciones simuladas. Las
  claves, transacciones, mutex, concurrencia y triggers son reales. Las simulaciones
  no certifican una autoridad institucional. No se asignan roles/permisos.
- No se aprobó ningún plan real ni de prueba. Se verificaron denegaciones de
  aprobación; el camino exitoso queda pendiente de habilitación y prueba autorizadas.
- Edge: 24 configuraciones con datos simulados a 320, 390, 768 y 1440 px, incluyendo
  menú abierto/contraído, borrador, devolución y ausencia de migración. Sin
  desbordamiento de página, controles sin etiqueta ni errores JavaScript.
  Capturas de escritorio y móvil inspeccionadas.
- Se conservaron datos, credenciales, roles/permisos y registros existentes.
  Las 30 tablas y 171 registros del entorno C coinciden con sus huellas verificadas
  tras la activación anterior; no hay tablas D en esa base.
  No se migró `planes_accion_test`, no se ejecutó DOWN ni se reiniciaron sus procesos.
  No se instalaron dependencias, ni hubo commit, push, merge o despliegue.

UP/DOWN quedaron preparados; solo UP se ensayó en bases desechables. Para activar
D se requiere una autorización específica y un respaldo completo nuevo restaurado
del entorno C actual. Tras esa activación, `/planeacion` y `/planes/ID/gestion`
permitirán consultar y preparar borradores; las actuaciones seguirán cerradas hasta
confirmar sus autoridades. Procedimiento y pendientes exactos en
`../proyecto backend erick/PLAN_WORKFLOW.md`.

---

## Bloque C — formulación institucional (2026-11-02)

### Activación local posterior

UP aplicado exclusivamente a `127.0.0.1:3307/planes_accion_test`, tras crear un
respaldo completo cifrado con Windows DPAPI, verificar su SHA256, restaurarlo en
otra base aislada y ensayar UP sobre esa restauración. Se conservaron exactamente
las 23 tablas anteriores y sus 171 registros. Las siete tablas nuevas están
disponibles y vacías; no se crearon datos de prueba permanentes ni se ejecutó DOWN.

Backend y frontend reiniciados con su configuración efectiva anterior, sin editar
`.env`: PID 64168/puerto 3000 y PID 37904/puerto 4000. Ambos responden correctamente.
La cuenta ID 78 conserva su estado y permisos. Suites: 323 pruebas backend y 159
frontend aprobadas. También pasaron 16 comprobaciones HTTP, lecturas y renderizado
de formularios con datos existentes; no se enviaron formularios ni se autenticaron
sesiones artificiales. Queda pendiente la comprobación HTTP con una sesión del
usuario. El reinicio requiere iniciar sesión nuevamente.

Acceso: `http://localhost:4000/planes` y `http://localhost:4000/actividades`.
Respaldo, manifiesto, comprobaciones y recuperación controlada documentados en
`../proyecto backend erick/ACTIVACION_LOCAL_BLOQUE_C.md`. Las menciones a migraciones
no aplicadas en la entrega original describen su estado anterior a esta activación.

No se modificaron cuentas, credenciales, roles, permisos, datos comerciales,
producción, aprobaciones ni cálculos. Sin dependencias nuevas, commit, push, merge
o despliegue.

Implementado en `develop` en ambos repositorios con `frontend-design`, el Documento
Maestro recuperado y el modelo existente. Se conserva el diseño azul/blanco.

Planes incorpora ficha de borrador: proceso del catálogo autorizado, problema,
causas, consecuencias, objetivo general, objetivos específicos, meta/valor/unidad,
indicador principal (nombre, descripción, fórmula, unidad, fuente) y responsable
propuesto separado del creador. Actividades incorpora nombre, resultado esperado,
objetivo e indicador del mismo plan, prioridad, verificación, evidencias esperadas,
observaciones, instrucciones y recursos con cantidades/costos. La descripción,
responsable y fechas de actividad mantienen sus campos existentes.

Los campos nuevos se crean, consultan y editan con persistencia transaccional en
tablas complementarias. Guardar una ficha incompleta no cambia el estado oficial
ni representa una aprobación. No se ejecutan fórmulas ni se recalculan indicadores.
Los objetivos y recursos tienen IDs estables; no se eliminan por omisión. Las
referencias se validan en servidor y los conflictos de revisión devuelven 409,
revirtiendo también la fila base. El frontend conserva los campos permitidos ante
errores en su sesión, sin credenciales ni CSRF; permite descartar explícitamente
la recuperación. Su duración depende de la sesión y los límites HTTP existentes.

### Archivos de esta etapa

Frontend: `app/controllers/controller.views.js`, nuevo `institutional-form.js`,
`views/planes.ejs`, `views/actividades.ejs`, `views/actividad-detalle.ejs`, nuevos
parciales `institutional-fields.ejs` e `institutional-read.ejs`, `public/style.css`,
`public/app.js`, pruebas `test/auth/controller.views.test.js` y nueva
`test/institutional-form.test.js`, y este informe.

Backend: controladores `controller.plan.js` y `controller.activity.js`,
`routes.plan.js`, nuevo servicio `institutional-draft.service.js`, migraciones
`20261102_institutional_drafts.up.sql`/`.down.sql`, pruebas de controladores/rutas,
nueva `test/plans/institutional-draft.test.js`, comprobador
`test-db/verify-institutional.mjs` e `INSTITUTIONAL_DRAFTS.md`.
También se actualiza `ARQUITECTURA.md` en la raíz.

### Verificación y activación

- Backend: 323 pruebas aprobadas; frontend: 159 aprobadas; cero fallos.
- MariaDB aislado: 25 comprobaciones reales de creación, consulta, edición,
  campos incompletos, ceros/decimales, fechas, referencias, conflictos, reversión
  transaccional, historial y migración subida/reversión/nueva subida.
- Antes de migrar se verificó el puerto 3307, se respaldó el esquema vacío y se
  comprobó su SHA256 y restauración en otra base desechable. No se copiaron cuentas
  ni datos existentes. Las bases `planes_blockc_*` generadas se eliminaron al final.
- Edge con datos simulados: Planes, Actividades y detalle a 320, 390, 768 y 1440 px,
  con menú abierto/contraído en tableta/escritorio: 18 combinaciones sin
  desbordamiento de página, controles sin etiqueta ni errores JavaScript.
  Adición de objetivos/recursos comprobada y capturas inspeccionadas.
- Sintaxis JavaScript y `git diff --check`: correctos.

No se aplicaron migraciones a `planes_accion_test` ni a producción, y no se
reiniciaron procesos. Para activar la aplicación local hace falta un respaldo
completo recuperable verificado de su base aislada, aplicar UP y cargar el código
actualizado. El respaldo del comprobador solo cubre sus bases vacías. Comando,
contratos y procedimiento en `../proyecto backend erick/INSTITUTIONAL_DRAFTS.md`.
La persistencia real y las pruebas de navegador son verificaciones separadas;
queda pendiente una sesión autenticada completa con la aplicación actualizada.

### Decisiones institucionales pendientes y conservación

El catálogo no se rellena con procesos inventados. La designación oficial de
responsables activos/autorizados requiere su mecanismo institucional; el texto
propuesto no concede permisos. No se implementan código institucional,
presentación, aprobación, transiciones, validación de completitud para presentar,
eliminación ni fórmulas nuevas. Esta entrega implementa formulación de borradores,
no el ciclo completo de aprobación institucional.

No se modificaron datos comerciales, credenciales, roles, permisos, políticas de
seguridad, login, navegación, cálculos ni reglas de aprobación. No se instalaron
dependencias ni hubo commit, push, merge o despliegue. Se conservaron los cambios
previos, incluido `controller.followup.js`.

---

## Alcance

Cambios en views/login.ejs, views/menu.ejs, views/partials/navigation.ejs,
public/app.js y public/style.css. Pruebas nuevas en test/visual-access.test.js.
Se conservaron los cambios previos del repositorio.

El acceso tiene dos columnas en escritorio, disposicion vertical hasta 760 px,
identidad azul y blanca, fecha es-CO y reloj automatico America/Bogota.
El formulario conserva POST /login y sus campos y errores originales.
La causa del fallo del ojo era la ausencia de /app.js en login.ejs.
Ahora carga con defer, alterna el tipo del campo sin cambiar su valor,
actualiza el icono y los atributos accesibles, y conserva el foco del boton.

El panel conserva las metricas recibidas sin recalcular resultados. Se retiran
clima, reloj y fecha del panel; otros modulos conservan su cabecera previa.
Los accesos usan iconos y ocupan el ancho disponible.

## Navegacion y permisos

navigationFor del controlador existente obtiene los modulos de los permisos
retornados por /roles/capacidades. La plantilla compartida usa navigation.plans,
activities, followup, reports, users y roles. El panel tambien recibe indicadores
canRead* y canManage*. No se modificaron estas condiciones ni sus fuentes.
Una cuenta con navigation.followup como unica capacidad muestra Panel principal
y Seguimiento; las pruebas reproducen ese escenario. No se consulto una sesion
real del usuario de la captura, por lo que no se certifican sus permisos efectivos.

## Clima

El endpoint existente /api/clima requiere verificarSesion. No se reutiliza desde
el acceso ni se elimina su proteccion. El acceso muestra Clima no disponible,
sin temperatura ni estado meteorologico inventados y sin solicitudes externas.
No se verifico una suscripcion comercial autorizada. No se agrego un endpoint
publico porque el alcance prohibe cambios en servidor y endpoints. La activacion
futura necesita proveedor autorizado y mecanismo publico limitado con validacion,
cache y limite de solicitudes. El servicio existente no fue modificado.

## Verificacion

node --check public/app.js: correcto.
node --experimental-test-module-mocks --test --test-reporter=dot:
73 pruebas aprobadas, incluidas autenticacion, permisos y renderizado existentes.
Las pruebas nuevas verifican alternancia doble de password, valor intacto,
atributos accesibles, icono, hora colombiana, script diferido, formulario original,
clima sin consultas privadas y panel sin fecha/reloj/clima.
git diff --check: sin errores de espacios.

Pendientes: comprobacion visual real en escritorio y movil y acceso con una
cuenta real. No se instalaron herramientas de navegador ni dependencias.
Las pruebas de autenticacion usan respuestas simuladas; no equivalen a una
sesion real con backend y base de datos.

No se modificaron backend, base de datos, planes comerciales, roles, permisos,
calculos, endpoints ni controles CSRF. No hubo commit, push, merge o despliegue.

## Segunda fase: optimización de pantallas internas

Fecha: 2026-11-02. Rama: `develop`. Se aplicó `frontend-design`.
Esta sección actualiza el estado de las cabeceras internas y la verificación
visual descritos en la primera fase; el diseño aprobado del login se conserva.

### Cambios

- `views/partials/navigation.ejs`: cabecera sin reloj ni fecha decorativa en todos
  los módulos; nombres accesibles en enlaces, control de cierre móvil y asociación
  del botón de contracción con el menú. Las condiciones de permisos no cambian.
- `public/app.js`: menú expandido por defecto en escritorio; preferencia booleana
  `planes.sidebarCollapsed` en almacenamiento local, con funcionamiento alternativo
  si está bloqueado. En móvil, menú cerrado inicialmente, cierre con Escape o botón,
  foco contenido en el diálogo y contenido de fondo inerte mientras está abierto.
  El comportamiento del reloj y la contraseña del login no fue modificado.
- `public/style.css`: mejoras limitadas a `.app-body` para ancho disponible,
  formularios, tablas, mensajes y estados. Las tablas tienen desplazamiento propio;
  el menú contraído libera espacio y conserva iconos y nombres accesibles.
  Se conserva la regla existente de movimiento reducido y el padding del contenedor
  principal de las tarjetas para no desplazar los encabezados aprobados.
- `views/seguimiento.ejs`: cinco tarjetas compactas con los valores recibidos,
  sin fórmulas nuevas; cero sigue siendo cero y la ausencia de datos se explica.
  Selector de período y botón alineados en escritorio y apilados en móvil.
  Fechas originales identificadas como inicio y fin, porcentajes destacados,
  estados semánticos e historial desplazable mediante teclado.
- Plantillas internas revisadas: `planes.ejs`, `actividades.ejs`,
  `actividad-detalle.ejs`, `informes.ejs`, `listar.ejs`, `crear.ejs`, `editar.ejs`
  y `role-admin.ejs`. Se agruparon etiquetas con controles existentes donde era
  necesario; se conservaron nombres, acciones, métodos, parámetros y CSRF.
  Las tablas incorporan encabezados de columna y regiones accesibles; el enlace
  para saltar al contenido tiene destino real. Observaciones permanece dentro de
  actividades, evidencias e informes: no existe un módulo independiente nuevo.
- En `actividades.ejs` se corrigió un defecto existente: el valor del input Estado
  contenía HTML de una insignia. Ahora contiene `activity.estado` escapado, sin
  traducción del valor enviado ni cambios en las reglas de actualización.
- Pruebas nuevas: `test/internal-layout.test.js`.

### Verificación de esta fase

- `node --check public/app.js`: correcto.
- `node --experimental-test-module-mocks --test`: 77 pruebas aprobadas, cero fallos.
  Incluyen las pruebas previas de autenticación, CSRF, permisos y formularios;
  pruebas nuevas de tarjetas, datos ausentes/cero, fechas funcionales, estados,
  menú restringido/completo, persistencia, foco y cierre móvil.
- `git diff --check`: sin errores de espacios. Los cambios previos permanecen.
- Edge real en modo headless, con plantillas EJS renderizadas y datos simulados:
  diez pantallas (panel, planes, actividades, detalle, seguimiento, informes,
  usuarios, crear usuario, editar usuario y roles) a 320, 390, 768 y 1440 px.
  Las 40 combinaciones no presentan desbordamiento horizontal de la página,
  errores JavaScript, relojes internos ni asociaciones de etiquetas rotas.
- Se inspeccionaron capturas reales de Seguimiento en escritorio y móvil.
  Se comprobó expansión/contracción, liberación de ancho, cierre móvil con Escape,
  fondo inerte y persistencia al navegar entre planes y actividades.
- `login.ejs` conserva exactamente la huella SHA256 anterior:
  `1D911353FE346F469C006DDFEC7420EEDF63C9FE5C9206399DF922E59C410635`.
  Sus pruebas de reloj y contraseña continúan aprobadas; los estilos nuevos no
  alteran sus selectores de autenticación.

### Límites y conservación

Las pruebas de navegador no usaron credenciales reales ni enviaron formularios
al servidor. La comprobación autenticada de extremo a extremo con datos reales
queda pendiente. No se modificaron servidor frontend, backend, bases de datos,
planes comerciales, endpoints, permisos, reglas de aprobación ni cálculos.
No se instalaron paquetes, no se alteró el entorno de pruebas y no hubo commit,
push, merge ni despliegue. Edge utilizó perfiles temporales aislados.

## Correcciones finales de Seguimiento

Se aplicó `frontend-design` conservando la composición, paleta y tipografía
aprobadas. Cambios limitados a estos archivos:

- `public/style.css`: las insignias de `.followup-table` y `.followup-history`
  usan ancho según contenido, sin contracción ni saltos de línea o de palabra.
  Se conservan los colores semánticos, incluido el verde de Aprobado. El ancho
  adicional queda dentro del desplazamiento horizontal existente de las tablas.
- `views/seguimiento.ejs`: función local `formatFollowupDate`, aplicada solamente
  a las fechas visibles de inicio y fin. Reordena los componentes ISO como
  DD/MM/AAAA, sin instanciar Date ni convertir zonas horarias. Las fechas con hora
  conservan el día de calendario recibido. Valores vacíos muestran Sin fecha;
  valores no reconocidos se conservan escapados. No se cambian los datos originales,
  controles de fecha, parámetros de consulta ni valores enviados por formularios.
- `test/internal-layout.test.js`: expectativas actualizadas y casos para fechas
  simples, marcas de tiempo con zona, año bisiesto, cambio de año, fechas ausentes,
  escape de contenido e inmutabilidad de los datos de entrada.
- Este informe, `REVISION_VISUAL.md`.

Verificación: 78 pruebas automatizadas aprobadas, cero fallos; `git diff --check`
sin errores. Edge real con datos simulados: seis configuraciones (1440 y 768 px
con menú abierto y contraído, y móviles de 390 y 320 px). En todas, Aprobado ocupa
una línea, el texto cabe en la insignia, conserva el color verde y las tablas
mantienen desplazamiento horizontal propio sin desbordar la página. Las fechas
visibles son Inicio: 02/11/2026 y Fin: 06/11/2026. Sin errores JavaScript.
Se revisaron capturas de escritorio con ambas posiciones del menú y de móvil.

No se modificaron backend, base de datos, planes comerciales, roles, permisos,
reglas de negocio, cálculos, login ni comportamiento del menú. Las verificaciones
no enviaron operaciones al servidor. No se instalaron dependencias ni se realizaron
commits, push, merge o despliegues. Se conservaron los cambios previos.

## Etapa 1: correcciones funcionales del frontend

Alcance: tres problemas funcionales de la auditoría, en la rama `develop`.
Se consultó `frontend-design` para presentar estados con los componentes existentes,
sin rediseñar el panel ni cambiar CSS o el comportamiento del menú.

### Causas y correcciones

1. Panel: `getMenu` sustituía respuestas fallidas por listas vacías y después las
   contaba. Ahora verifica primero `/roles/capacidades`, consulta únicamente los
   módulos autorizados y aísla el resultado de cada servicio. Las listas vacías
   válidas conservan el cero y muestran No hay registros disponibles; los fallos
   de red, HTTP, JSON o estructura dejan el indicador sin valor y muestran el error
   correspondiente. Los indicadores válidos sobreviven a fallos parciales.
   Sin períodos se informa disponibilidad, no un error ni un cero inventado.
   Las respuestas 401 conservan el cierre de sesión; las denegaciones no muestran
   valores protegidos. Si fallan las capacidades, se informa del fallo y no se
   presentan módulos como si se hubiera confirmado que el usuario carece de ellos.
   Se mantienen los conteos existentes y los resultados oficiales del resumen.
2. Formularios: las respuestas de error de creación/edición de usuarios omitían
   `navigation`. Un renderizado común de errores recupera las capacidades actuales
   del endpoint existente. Ante fallo de recuperación no concede accesos; ante 401
   invalida la sesión como antes. Las respuestas 403 de la operación conservan su
   denegación existente. No se introdujo caché de permisos ni permisos alternativos.
3. Datos: una lista explícita conserva únicamente nombre, correo y motivo en los
   errores recuperables. Las vistas escapan estos valores con EJS. El password no
   se incluye en los datos de renderizado, HTML o sesión. Se mantienen las reglas
   de validación y el token CSRF; el usuario decide cuándo volver a enviar.
   Los fallos HTTP 5xx o de comunicación vuelven a mostrar el formulario con 503.

### Archivos modificados en esta etapa

- `app/controllers/controller.views.js` (servidor del frontend, no backend).
- `views/menu.ejs`, `views/crear.ejs`, `views/editar.ejs`.
- `test/auth/controller.views.test.js` y `test/visual-access.test.js`.
- Este informe, `REVISION_VISUAL.md`.

### Verificación

- 120 pruebas aprobadas, cero fallos: 78 previas y 42 nuevas. Se actualizó una
  expectativa del mensaje de disponibilidad en la prueba existente del panel.
- Pruebas de panel con registros/cero, fallos parciales HTTP/red/JSON/estructura,
  ausencia de períodos/datos, permisos restringidos, denegación y sesión expirada.
- Pruebas de creación/edición con errores de validación, HTTP 5xx y comunicación;
  capacidades completas/restringidas/ilegibles/no disponibles/expiradas;
  escape de valores, password ausente, CSRF intacto, envío único y ruta de éxito.
- `node --check app/controllers/controller.views.js`: correcto.
- `git diff --check`: sin errores de espacios.
- Edge headless con páginas renderizadas en memoria y datos simulados:
  21 combinaciones, a 390 y 1440 px, incluyendo menú abierto y contraído.
  Se comprobaron estados parcial/cero/capacidades no disponibles, creación con
  permisos completos/restringidos y edición con capacidades completas/fallidas.
  Nombre, correo, motivo y CSRF se conservan; password vacío y navegación acorde
  con las capacidades. Sin desbordamiento horizontal ni errores JavaScript.
  Se inspeccionaron capturas en memoria del panel y del formulario de error.
- Comparación de huellas con el estado de la auditoría: solo cambiaron los archivos
  indicados; login, Seguimiento, estilos, navegación compartida y script del menú
  permanecen intactos en esta etapa.

### Conservación y límites

No se modificaron backend, base de datos, planes comerciales, roles, permisos,
reglas de aprobación, cálculos oficiales, endpoints ni dependencias. Se conservaron
los cambios anteriores. No hubo commit, push, merge o despliegue.
Las verificaciones usan servicios simulados; queda pendiente la comprobación
integral autenticada en un entorno aislado. No se utilizaron cuentas reales ni
se enviaron operaciones a datos comerciales.

## Grupo A: modernización del Panel principal

Se aplicó `frontend-design` en `develop`, conservando la identidad azul y blanca,
la tipografía existente, los accesos por permisos y los cambios anteriores.

### Cambios y archivos

- `views/menu.ejs`: solo los números finitos usan la jerarquía visual del valor.
  Las explicaciones del servicio, datos ausentes y errores tienen texto propio,
  sin competir en tamaño con los números. Cada tarjeta tiene título asociado.
  Los ceros válidos permanecen visibles; las listas vacías se explican y los
  errores parciales no se ocultan. Las tarjetas no autorizadas siguen omitidas.
- `public/style.css`: reglas limitadas a `.dashboard` para números destacados,
  mensajes legibles, saltos entre palabras y alturas alineadas dentro de cada fila.
  Los textos se muestran completos: su longitud puede aumentar la altura de una
  fila, sin recortarlos ni utilizar tamaños de número para las explicaciones.
- `app/controllers/controller.views.js`: el frontend traslada únicamente metadatos
  verificados del período del resumen; no modifica los valores ni los cálculos.
- `test/auth/controller.views.test.js`: ocho casos nuevos de metadatos de período.
- `test/dashboard-view.test.js`: seis pruebas nuevas de presentación y permisos.
- Este informe, `REVISION_VISUAL.md`.

### Origen y alcance del período

El endpoint existente `/informes/seguimiento?periodId=...` devuelve `period` junto
con los indicadores. Se comprobaron por lectura su implementación y sus campos
`id_periodo`, `anio` y `trimestre`. El frontend verifica que el identificador
corresponda al solicitado y que año/trimestre sean válidos antes de mostrarlos.
Se conserva la selección existente del período; no se deduce de la fecha actual.

El texto, por ejemplo Cuarto trimestre de 2026, aparece individualmente en las
contabilizaciones pendientes, avance aprobado y cobertura provenientes de ese
mismo resumen. Los totales generales de planes y actividades no reciben período.
Si el servicio no devuelve metadatos verificables, falla o no hay períodos, las
correspondientes tarjetas indican Período no disponible, sin inventar información.
Los errores de consulta conservan además su mensaje específico.

### Verificación

- Suite completa: 134 pruebas aprobadas, cero fallos (120 anteriores y 14 nuevas).
- Casos nuevos: período válido/numérico en texto/ausente/de otro identificador/
  sin identificador/trimestre inválido/año inválido/booleano. Se mantiene intacto
  el indicador recibido y nunca se toma el año del reloj o de otro resultado.
- Renderizado: números normales/cero, listas vacías, mensajes explicativos largos,
  escape de HTML, fallos parciales, permisos restringidos y período no disponible.
- Edge real en modo headless, con datos simulados y renderizado en memoria:
  36 configuraciones, combinando seis estados con 320, 390, 768 y 1440 px,
  incluyendo menú abierto/contraído en escritorio y tableta.
  Sin errores JavaScript ni desbordamiento horizontal de página. Las explicaciones
  usan aproximadamente 14,72 px frente a 32-36 px de los valores comprobados.
  Se inspeccionaron capturas en memoria con ceros en móvil y texto largo en escritorio.
- `node --check app/controllers/controller.views.js` y `git diff --check`: correctos.

### Conservación y límites

No se modificaron backend, bases de datos, planes comerciales, roles, permisos,
cálculos oficiales, endpoints, aprobación, CSRF, login, Seguimiento ni el
comportamiento del menú lateral. No se instalaron dependencias ni hubo commit,
push, merge o despliegue. Las verificaciones no usaron cuentas reales ni enviaron
operaciones al servidor. La comprobación integral autenticada sigue pendiente.

## Grupo B1: Planes y Actividades

Se utilizó `frontend-design` sobre `develop`, conservando azul/blanco, tipografía,
encabezados y los avances anteriores. No fue necesario modificar controladores.

### Archivos modificados

- `views/planes.ejs`, `views/actividades.ejs`.
- `views/actividad-detalle.ejs`, únicamente fechas y clase compartida de estados.
- Nuevo parcial reutilizable `views/partials/record-date.ejs`.
- `public/style.css`, con reglas limitadas a Planes/Actividades y su clase de estado.
- `public/app.js`, únicamente interacción de los nuevos desplegables de edición.
- Nuevas pruebas `test/records-view.test.js`.
- Este informe, `REVISION_VISUAL.md`.

### Presentación y edición

Las insignias conservan sus valores y colores existentes. En tablas su ancho se
adapta al texto sin cortes; el desplazamiento adicional queda dentro de la tabla.
En el detalle pueden envolver entre palabras y cuentan con contención local para
textos excepcionalmente largos, sin desbordar toda la página.

Los formularios de creación alinean sus etiquetas por arriba, ofrecen una zona
amplia para descripciones e indican qué campos son obligatorios/opcionales según
las validaciones existentes. El ancho real del contenedor determina cuándo usar
una columna; a 768 px con menú expandido se verificó esa disposición. Los filtros
mantienen su distribución independiente y todos sus parámetros.

Los formularios de edición existentes se trasladaron debajo de la tabla, en
secciones desplegables nativas identificadas por el ID del registro. Cada botón
Editar está asociado mediante aria-controls y aria-expanded. Al abrir, se muestra
el editor y se enfoca el primer campo; Cancelar o Escape cierran y devuelven el
foco. Cancelar no envía ni restablece campos: conserva el borrador local. El resumen
nativo también permite acceder a la edición sin depender del botón de la tabla.
Las filas mantienen su altura al abrir/cerrar. No se incorporaron modales ni
nuevas operaciones; guardar utiliza el mismo envío nativo y autorización previa.

### Fechas y semántica

El parcial reutilizable presenta fechas de calendario como DD/MM/AAAA con elemento
time y atributo datetime. Valida el día, mes y año sin convertir zonas horarias,
conserva valores no reconocidos escapados y distingue ausencia de fecha.

La inspección de solo lectura confirmó que las actividades entregan inicio/fin
mediante DATE_FORMAT(..., '%Y-%m-%d'), y los caminos actuales de creación de planes
y evidencias utilizan UTC_DATE(). Estos campos representan días de calendario;
por eso no se añade una hora ni se convierten a America/Bogota. Se toma el día
recibido incluso si MySQL lo serializa como ISO. No se incorporó un formato de
instante temporal donde los campos revisados no aportan esa semántica.

Los inputs date siguen conteniendo sus valores originales YYYY-MM-DD. No se
modificaron filtros, acciones, métodos, nombres, límites, atributos required,
identificadores ni tokens CSRF. Los datos y las fechas enviadas permanecen iguales.

### Pruebas y comprobaciones

- Suite completa: 151 pruebas aprobadas, cero fallos; 17 pruebas nuevas.
- Cobertura nueva de fechas válidas/ausentes/no reconocidas/bisiestas/inválidas,
  escape de contenido, formularios de creación/edición, IDs, valores, acciones,
  métodos, CSRF, restricciones, fechas nativas, permisos y errores existentes.
- Prueba automatizada de apertura/cierre visual, conservación del borrador,
  aria-expanded, Escape y devolución del foco sin envío.
- Edge real con datos simulados y páginas renderizadas en memoria: 18 combinaciones
  de Planes, Actividades y detalle, a 320, 390, 768 y 1440 px, incluidos menú abierto
  y contraído en tableta/escritorio. Se compararon firmas DOM de los formularios
  originales con los actuales: coincidencia de acciones, métodos, campos, valores
  y validaciones. No se enviaron formularios al servidor.
- Apertura mediante Enter, cierre mediante Escape/Cancelar y retorno del foco:
  correctos. Altura de filas intacta; ninguna tabla contiene formularios de edición.
  Insignias largas completas y fechas visibles formateadas. Sin desbordamiento
  horizontal de página ni errores JavaScript. Se inspeccionaron capturas en memoria
  de edición de planes en escritorio y de actividades a 768 px con menú expandido.
- `node --check public/app.js` y `git diff --check`: correctos.
- Huellas verificadas: login, Panel principal, Seguimiento, navegación compartida,
  controlador frontend y rutas permanecen idénticos a su estado anterior a B1.

### Límites y conservación

Las validaciones y operaciones se comprobaron con servicios/datos simulados y las
pruebas existentes. La verificación integral autenticada en un entorno aislado
continúa pendiente. Los formatos de fecha no reconocidos se conservan; no se
adivina la zona o la semántica de datos históricos desconocidos.

No se modificaron backend, base de datos, planes comerciales, permisos, reglas de
negocio, aprobación, cálculos, endpoints ni CSRF. El menú conserva su funcionamiento.
No se instalaron dependencias ni hubo commit, push, merge o despliegue.


## Preparaci?n de prueba privada Railway

Se a?adi? un perfil optativo `railway-private-test` sin modificar vistas, estilos,
login, Seguimiento ni el comportamiento del men?. Sin ese perfil, las sesiones
locales conservan su funcionamiento. En cloud se exige HTTPS, cookie Secure,
HttpOnly y SameSite=Lax, proxy de un salto y origen p?blico expl?cito; sesiones
persistentes MySQL con una cuenta t?cnica que solo accede a `web_sessions`.
No se utiliza MemoryStore como alternativa si falla la persistencia cloud.

Cambios frontend: `index.js`, `app/services/railway-profile.js`, `package.json`,
`package-lock.json`, `.dockerignore`, `.railwayignore`, plantilla de variables
`deployment/railway/frontend.variables.example`, pruebas de perfil y documentaci?n.
Se a?adi? express-mysql-session 3.0.3, con mysql2 3.24.6 fijado por override;
se actualizaron dependencias transitivas vulnerables. Audit de ejecuci?n: cero
vulnerabilidades reportadas. Regresi?n ampliada por esas actualizaciones:
202 pruebas frontend y 427 backend aprobadas, total 629. La simulaci?n Docker
comprueba formularios, sesiones persistentes y comunicaci?n privada entre servicios;
HTTPS de Railway real queda pendiente de publicaci?n autorizada.

Procedimiento: `../proyecto backend erick/RAILWAY_PRUEBA_PRIVADA.md`.
No se cre? dominio ni recurso cloud; no se modificaron la base local persistente,
credenciales, roles, permisos o c?lculos. Los procesos originales 3000/4000 no se
reiniciaron. No hubo commit, push, merge ni despliegue externo.
