# Roadmap de producto

> Hecho usando la app real como Futbolero y como AdminCancha (no solo
> leyendo código) — sesión de hoy, ambos roles, flujo completo de punta a
> punta. Prioridad de arriba a abajo dentro de cada fase. Entregable
> deliberadamente corto — el detalle técnico de cada ítem se decide al
> ejecutarlo, no acá.

## Fase 0 — Look & feel: que se vea como un negocio real

La app funciona, pero se ve vacía. Para un Futbolero eligiendo dónde jugar
₡15,000, "vacío" se lee como "no confío en esto".

1. **Fotos de cancha.** Hoy no existe ningún flujo para subirlas — toda
   `CanchaCard` muestra un ícono roto. Es lo primero que un Futbolero mira
   antes del precio. Sin esto, todo lo demás del look & feel es cosmético.
2. **Landing (`/`) sin identidad visual.** Título + un botón flotando en una
   pantalla casi vacía, sin logo, sin ícono de cancha/pelota, sin imagen.
   Es la primera impresión de cualquiera que llegue por un link compartido.
3. **Amenidades invisibles.** El dato existe en la base (`canchas.amenidades`)
   pero ninguna pantalla lo muestra — el detalle de cancha hoy es solo
   nombre + rating + horarios, más flaco de lo que el propio modelo de
   datos permite.
4. **Estados vacíos sin guía en Admin.** El dashboard de insights y la cola
   de validaciones dicen "no hay nada" sin explicar qué va a aparecer ahí
   ni cuándo — un AdminCancha nuevo no tiene forma de saber si está bien
   configurado o si algo falta.

## Fase 1 — Activación: la primera vez de cada rol tiene que ser fácil

Esto es lo que más amenaza la adopción (SPEC.md ya lo marca como riesgo #1
del producto, no técnico).

1. **Reglas de horario recurrentes.** Hoy un AdminCancha crea cada horario
   uno por uno, a mano, semana por semana. Para una cancha con horario fijo
   (ej. todos los días 18-22h) esto es horas de trabajo tedioso antes de
   poder recibir la primera reserva. Es la fricción de activación más
   grande que existe hoy.
2. **Editar/borrar cancha y horarios.** No hay forma de corregir un error
   de tipeo en el nombre, el número SINPE o un horario mal cargado sin
   tocar la base a mano. Cualquier error de carga queda pegado.
3. **Login real (o al menos verificación de email).** El login actual
   (cualquiera entra con cualquier email, sin probar que es suyo) fue una
   decisión explícita para simplificar el desarrollo — pero es lo único en
   esta lista que bloquea un lanzamiento público real, no solo pule la
   experiencia. Cualquiera puede ver las reservas y comprobantes de
   cualquier otro con solo saber su email.

## Fase 2 — Cerrar el loop: que confirmar una reserva no dependa de tener la pestaña abierta

1. **Notificaciones push/email.** Hoy el Realtime solo actualiza si el
   usuario tiene la app abierta en ese momento. Alguien que reserva, cierra
   el navegador y vuelve mañana no se entera de nada salvo que abra la app
   y revise "Mis reservas" a mano — justo el escenario de disputa
   ("pagué y no me confirmaron") que SPEC.md identifica como el riesgo
   central del producto.
2. **Calificar cancha.** La pantalla no existe todavía, así que el rating
   nunca se llena — lo cual retroalimenta directamente el problema de Fase
   0 (#1 y #3): la app se sigue viendo vacía incluso después de uso real.
3. **Perfil de usuario.** No hay dónde ver/editar el propio nombre o
   teléfono, ni preferencias de notificación — básico para que un usuario
   sienta que tiene una cuenta real, no solo una sesión de paso.

## Fase 3 — Escala y monetización

Ya tiene su propio documento: [plan-monetizacion-admin.md](plan-monetizacion-admin.md)
(suscripción SaaS + insights como palanca). No se repite acá — es la fase
que sigue una vez que Fases 0-2 den una primera experiencia sólida a ambos
roles.

## El riesgo que no está en ninguna fase de arriba

Cero tests automatizados sobre una máquina de estados que mueve pagos y
disputas reales (ver plan-mejoras.md #5). No es una fase — es una decisión
de tooling a tomar antes de que el volumen de código lo haga más caro de
resolver.
