# Guía del Panel de Administración (CMS) — Luis Quintana Studio

Esta guía explica cómo editar el contenido y las fotos del sitio web usando el
panel de administración. No necesitas saber programación: todo se hace desde el
navegador. Los cambios que guardes se publican solos en el sitio en unos minutos.

> Nota: el panel está en inglés. Esta guía te dice qué significa cada sección y
> cada campo, para que puedas ubicarte aunque los textos en pantalla estén en
> inglés.

---

## 1. Cómo entrar al panel

1. Abre el navegador (Chrome, Safari, etc.).
2. Ve a la dirección de tu sitio seguida de `/admin`. Por ejemplo:
   `https://luisquintanastudio.com/admin`
3. Haz clic en el botón **"Login with GitHub"** (Iniciar sesión con GitHub).
4. Se abrirá una ventana de GitHub. Inicia sesión con tu cuenta de GitHub y
   autoriza el acceso. (Solo la primera vez te pedirá autorizar.)
5. La ventana se cierra sola y ya estás dentro del panel.

Si el botón de GitHub no funciona o te da un error, avisa a tu desarrollador —
puede ser un problema de configuración, no algo que hiciste mal.

---

## 2. Cómo está organizado el panel

En el menú de la izquierda verás dos tipos de secciones:

- **Settings (Configuración):** listas de campos para páginas que ya existen.
  Aquí **cambias las fotos** de cada página (y algunos textos). No puedes crear
  páginas nuevas aquí, solo editar las que hay.
- **Muses** y **Wedding Stories:** colecciones de **historias**. Aquí sí puedes
  **crear entradas nuevas** (una musa nueva, una boda nueva) o editar las que
  existen.

---

## 3. Cómo cambiar una foto (lo más común)

Casi todas las fotos del sitio se cambian igual:

1. En el menú de la izquierda, entra a **Settings** y elige la página que quieres
   editar (ver la lista en la sección 5 de esta guía).
2. Verás una lista de campos con nombres como **Hero image** (imagen principal),
   **Closing CTA background** (fondo de la sección final), etc.
3. En el campo de la foto que quieres cambiar, haz clic en **"Choose an image"**
   (Elegir una imagen) o en la foto actual.
4. Se abre la galería de medios:
   - Para subir una foto nueva: haz clic en **"Upload"** (Subir) y elige el
     archivo desde tu computadora.
   - Para reutilizar una foto ya subida: selecciónala de la galería.
5. Haz clic en la foto para seleccionarla y confirma con **"Choose selected"**
   (Elegir seleccionada).
6. Arriba a la derecha, haz clic en **"Save"** (Guardar).
7. Luego haz clic en **"Publish" → "Publish now"** (Publicar → Publicar ahora)
   para que el cambio salga en vivo.

> Importante: **Save** solo guarda un borrador. Tienes que hacer **Publish** para
> que el cambio aparezca en el sitio real.

### Consejos para las fotos (IMPORTANTE para la velocidad del sitio)

Las fotos pesadas son la causa #1 de que un sitio vaya lento, sobre todo en
celulares. Antes de subir una foto, prepárala así:

- **Tamaño:** reduce la foto a unos **2000 px** en el lado más largo. Una foto
  directa de la cámara (4000–6000 px) es enorme e innecesaria para la web.
- **Formato:** usa **JPG** o **WebP** para fotografías. (WebP pesa menos con la
  misma calidad.) No subas PNG para fotos; el PNG es para logos.
- **Peso:** apunta a **menos de 400 KB** por foto, idealmente ~200 KB. Puedes ver
  el peso del archivo en tu computadora antes de subirlo.
- Cómo reducirla: en Mac, abre la foto en **Vista Previa (Preview) → Herramientas
  → Ajustar tamaño** y pon 2000 px de ancho, o en la app **Fotos** usa
  **Archivo → Exportar** y elige un tamaño menor. Cualquier editor sirve.

> Si olvidas reducir una foto y el sitio queda lento, avisa a tu desarrollador:
> existe un comando (`npm run optimize:images`) que reduce todas las fotos del
> sitio de una sola vez y guarda una copia de las originales por si acaso.

- Si dejas un campo de imagen **vacío**, el sitio usa la foto que ya tenía por
  defecto. No se rompe nada.

---

## 4. El menú de arriba a la derecha (botones clave)

- **Save** — Guarda tu trabajo como borrador (todavía no sale en vivo).
- **Publish → Publish now** — Publica los cambios en el sitio real.
- **Delete entry** — Borra la entrada (solo en Muses y Wedding Stories). Úsalo
  con cuidado.

---

## 5. Las páginas y qué foto es cada campo

Dentro de **Settings** encontrarás estas páginas. Cada campo dice en inglés dónde
va la foto; aquí la traducción:

### Sitio principal / Studio hub (/home) — images
La página de inicio del estudio (la que une Bodas y Glam Muse).
- **Hero image** — foto grande de arriba (la principal).
- **Weddings card image** — foto de la tarjeta de "Bodas y Compromisos".
- **Glam Muse card image** — foto de la tarjeta de "The Glam Muse Series".
- **Beauty section image** — foto de la sección "Beauty in Real Moments".
- **Beauty inset (B&W)** — foto pequeña en blanco y negro de esa misma sección.
- **Meet Luis portrait** — tu retrato en la sección "Meet Luis".
- **Closing CTA background** — foto de fondo de la sección final.

### Weddings — Home images (/weddings)
Página de inicio de Bodas.
- **Hero image** — foto principal de arriba.
- **Philosophy photo** — foto de la sección de filosofía.
- **Weddings card image** — tarjeta de Bodas.
- **Engagements card image** — tarjeta de Compromisos.
- **About portrait** — retrato de la sección "Sobre mí".
- **Closing CTA background** — fondo de la sección final.

### Weddings — Experience images (/weddings/experience)
- **Hero image** — foto principal.
- **"At ease" photo** — foto de la sección "sentirse a gusto".
- **Closing CTA background** — fondo de la sección final.

### Weddings — Portfolio images (/weddings/portfolio)
- **Hero image** — foto principal.
- **Video testimonial image** — imagen del testimonio en video.
- **Closing CTA background** — fondo de la sección final.
- **Gallery photos** — la galería de fotos de la página (la cuadrícula que al
  hacer clic se abre en grande). Es una **lista**: usa **"Add Photo"** (Agregar)
  para añadir cada foto, y arrastra para **reordenar** (el orden en la lista es
  el orden en la página y en la ventana ampliada). Cada foto tiene:
  - **Photo** — la imagen (súbela ya reducida, ver "Consejos para las fotos").
  - **Alt text** — una breve descripción de la foto (para accesibilidad y Google).
  - Si dejas la lista **vacía**, el sitio muestra una galería de ejemplo por
    defecto. En cuanto agregas tus propias fotos, estas reemplazan las de ejemplo.

### Weddings — Engagements images (/weddings/engagements)
- **Hero image** — foto principal.
- **Featured session image** — foto de la sesión destacada.
- **Closing CTA background** — fondo de la sección final.

### Weddings — Testimonials images (/weddings/testimonials)
- **Hero image** — foto principal.
- **Featured pull-quote photo** — foto junto a la cita destacada.
- **Video testimonial image** — imagen del testimonio en video.
- **Closing CTA background** — fondo de la sección final.

### Weddings — About images (/weddings/about)
- **Hero portrait** — tu retrato principal.
- **"A life inspired" photo** — foto de esa sección.
- **Philosophy band image** — foto de la franja de filosofía.
- **"A few words" video image** — imagen de la sección de video.
- **Closing CTA background** — fondo de la sección final.

### Weddings — FAQ images (/weddings/faq)
- **Hero image** — foto principal.
- **Closing CTA background** — fondo de la sección final.

### Weddings — Inquire images (/weddings/inquire)
Página de contacto de Bodas.
- **Hero image** — foto principal.
- **Form aside image** — foto al lado del formulario.
- **"A note from Luis" portrait** — tu retrato en la nota personal.
- **Closing CTA background** — fondo de la sección final.

### Weddings — Love Stories images (/weddings/stories)
- **Listing hero image** — foto principal del listado de historias.
- **Listing closing CTA background** — fondo de la sección final del listado.
- **Story detail closing CTA background** — fondo de la sección final en cada
  historia individual.

### Páginas del lado Glam Muse (Home, Portfolio, Experience, Inquire,
### Muse Stories, Landing, Instagram link)
Funcionan igual: entra a la página en **Settings**, cambia los campos de imagen
(**Hero image**, **Closing image**, etc.) y publica. En **Landing** y
**Instagram link** también hay campos de **texto** (títulos, descripciones) que
puedes editar escribiendo directamente.

En **Portfolio page — images** (la página /muse/portfolio) además de las fotos de
fondo tienes **Portrait gallery**: la cuadrícula de retratos que al hacer clic se
abren en grande. Es una **lista** igual que la galería de bodas — usa **"Add
Portrait"** para añadir, arrastra para reordenar, y cada retrato tiene:
- **Photo** — la imagen (ya reducida).
- **Alt text** — descripción breve.
- **Title** — título que se muestra en la ventana ampliada (opcional).
- **Caption** — frase que se muestra en la ventana ampliada (opcional).

Si dejas la lista vacía, el sitio usa los retratos de ejemplo por defecto.

---

## 6. Crear o editar una Historia de Boda (Wedding Stories)

Aquí puedes agregar bodas o compromisos nuevos que aparecen en la página
"Love Stories".

1. En el menú izquierdo, entra a **Wedding Stories**.
2. Para editar una existente, haz clic en ella. Para crear una nueva, haz clic
   en **"New Wedding Stories"** (Nueva historia).
3. Llena los campos:
   - **Order** — número de orden (1, 2, 3…). Controla en qué posición aparece.
     Usa un número que no esté repetido.
   - **Type** — elige **Wedding** (Boda) o **Engagement** (Compromiso).
   - **Names** — nombres de la pareja (ej. "Alex & Taylor").
   - **Place** — lugar (ej. "Lake Como, Italy").
   - **Featured** — actívalo **solo en UNA** historia: esa es la que aparece
     destacada arriba. Si lo activas en varias, puede verse raro.
   - **Card image** — foto de la tarjeta en el listado.
   - **Hero image** — foto grande de la página de esa historia.
   - **Intro title** — título de la introducción.
   - **Intro paragraphs** — párrafos de la introducción. Usa **"Add"** (Agregar)
     para añadir más de uno.
   - **Gallery** — galería de fotos. Usa **"Add"** para agregar cada foto.
   - **Quote text** — la cita/testimonio de la pareja.
   - **Quote attribution** — de quién es la cita (ej. "Alex & Taylor").
4. **Save** y luego **Publish → Publish now**.

> La dirección web de la historia se crea sola a partir del nombre del archivo.
> Al crear una entrada nueva, el panel te deja poner un identificador; usa algo
> sencillo como `maria-y-juan` (sin acentos, sin espacios, con guiones).

---

## 7. Crear o editar una Musa (Muses)

Igual que las historias de boda, pero para el lado Glam Muse. Campos principales:
- **Number** — texto del número (ej. "MUSE 001").
- **Order** — orden de aparición.
- **Name** — nombre.
- **Tagline** — frase corta.
- **Featured** — actívalo solo en UNA musa (la destacada). Si lo activas, llena
  también **Featured paragraph**.
- **Card image / Hero image** — fotos de la tarjeta y de la página.
- **Gallery** — galería de fotos (usa **"Add"**).
- **Before / After** — fotos de antes y después.
- **In Motion — video link** — enlace del video (opcional). Déjalo vacío si no
  hay video. Debe ser un enlace que contenga `/media/`; si no estás segura,
  déjalo vacío.
- Los campos de **párrafos** (Hero, Intro, Transform) son textos que puedes
  editar o dejar como están.

Guarda y publica igual que siempre.

---

## 8. Preguntas frecuentes

**¿Cuánto tarda en verse mi cambio en el sitio?**
Normalmente unos minutos después de hacer **Publish**. El sitio se reconstruye
solo. Si no lo ves, espera un poco y recarga la página (prueba Ctrl+Shift+R o
Cmd+Shift+R para forzar la recarga).

**Hice un cambio y no me gustó. ¿Cómo lo deshago?**
Vuelve a entrar a esa página/entrada, pon el valor anterior (o vuelve a elegir la
foto anterior) y publica de nuevo. Cada publicación queda guardada en el
historial, así que nada se pierde para siempre; tu desarrollador puede recuperar
una versión anterior si hace falta.

**Dejé un campo de foto vacío. ¿Se rompió algo?**
No. Si un campo de imagen queda vacío, el sitio usa la foto por defecto que ya
tenía. Nunca sale una imagen en blanco por dejar un campo vacío.

**¿Puedo borrar una página?**
Las páginas (Settings) no se borran desde aquí, solo se editan. Solo las entradas
de **Muses** y **Wedding Stories** se pueden crear y borrar.

**Subí una foto muy pesada y el sitio va lento.**
Reduce la foto antes de subirla (alrededor de 2000 px en el lado largo) y vuelve
a subirla. Puedes usar la app de Fotos o cualquier editor para exportarla más
pequeña.

**Me salió un error al iniciar sesión.**
No es culpa tuya. Avisa a tu desarrollador: suele ser un ajuste de configuración
del acceso con GitHub.

---

¿Dudas? Guarda esta guía y consúltala cuando edites. Cuando tengas confianza,
el flujo siempre es el mismo: **entrar → editar/cambiar foto → Save → Publish**.
