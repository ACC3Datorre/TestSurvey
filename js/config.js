/* ============================================================
   CONFIG — Recognition Points (v3 — mail + Power BI)
   El único archivo que necesitás editar.
   ============================================================ */

window.APP_CONFIG = {

  /* ------------------------------------------------------------
     MODO DE ALMACENAMIENTO (público)
     ------------------------------------------------------------
     'mailto' -> abre Outlook prellenado con el voto en el subject.
                 Cada submit = un mail al ADMIN_EMAIL. Power Automate
                 detecta el mail y agrega la fila al Excel en SharePoint.
                 Es el modo PRINCIPAL.

     'local'  -> guarda en localStorage (offline). Sirve como fallback
                 si Outlook no está disponible o si querés probar la UI
                 sin mandar mails reales.
     ------------------------------------------------------------ */
  STORAGE_MODE: 'mailto',


  /* ------------------------------------------------------------
     MAIL — destinatario y formato
     ------------------------------------------------------------ */
  MAIL: {
    // A quién llegan todos los votos. Coincide con el inbox que escucha
    // el flow de Power Automate.
    ADMIN_EMAIL: 'juan.i.da.torre@accenture.com',

    // Prefijo del subject. Tiene que coincidir con el "Subject Filter"
    // del trigger en Power Automate.
    SUBJECT_PREFIX: 'RP-FY26-VOTE',

    // Separador de campos dentro del subject.
    // Si lo cambiás acá, también cambialo en las expresiones split() del flow.
    FIELD_SEP: '|',

    // Cuerpo del mail (lo que ve el usuario). Solo informativo,
    // el flow no lo lee.
    BODY: 'Esta nominacion fue generada automaticamente por la pagina Recognition Points. No respondas este mail.\n\nGracias por participar.',

    // Límite de caracteres para la justificación.
    // Subjects de Outlook permiten ~255 chars. Reservamos espacio
    // para los otros campos (id, voter, nominee, timestamp, separadores).
    MAX_JUSTIFICATION_CHARS: 200
  },


  /* ------------------------------------------------------------
     POWER BI — link público al dashboard
     ------------------------------------------------------------
     Pegá acá el link del reporte de Power BI publicado.
     La jefa hace click en el botón "Abrir dashboard" y se abre
     en una pestaña nueva.

     Lo conseguís en Power BI Service:
     - Abrí el reporte publicado
     - File → Embed report → Website or portal
     - Copiás el "Link you can send in email"
     - O simplemente la URL del reporte si la jefa va a abrirlo
       desde su propia cuenta (recomendado para compliance).
     ------------------------------------------------------------ */
  POWER_BI: {
    DASHBOARD_URL: 'PEGAR_AQUI_LA_URL_DEL_DASHBOARD_PBI'
  },


  /* ------------------------------------------------------------
     CREDENCIALES DE ADMIN
     ------------------------------------------------------------
     Contraseña en código. Cambiala antes de publicar.
     Esto es solo una traba para curiosos casuales —
     no hay seguridad real porque el repo es público.
     ------------------------------------------------------------ */
  ADMIN: {
    USERNAME: 'admin',
    PASSWORD: 'CambiarEsto2026!'
  },


  /* ------------------------------------------------------------
     LISTA DEL EQUIPO (FinOps)
     ------------------------------------------------------------ */
  TEAM: [
    'alejandra.cristofano','antonella.s.costanzo','barby.levy','bernadette.v.estrin',
    'dafne.riera','eliana.a.esquer','f.m.martinez.thoss','fernanda.reca',
    'flavia.voloschin','francisco.podesta','g.truszkowski','i.sallaz.joannas',
    'jonathan.blejman','juan.i.da.torre','luca.besio','lucia.minones',
    'lucila.sanchez','mauro.vera','maximiliano.banegas','natalin.carballo',
    'patricia.b.volpini','ramiro.lopez','santiago.longo','sofia.lazzarin',
    'sol.faga','tobias.whelan'
  ],


  /* Stopwords para el word cloud (modo local solamente) */
  STOPWORDS: new Set([
    'a','al','algo','algun','alguna','algunas','alguno','algunos','ante','antes',
    'aqui','asi','ayuda','bien','cada','como','con','contra','cual','cuando',
    'de','del','desde','dentro','donde','dos','el','ella','ellas','ellos','en',
    'entre','era','eran','eres','es','esa','ese','eso','esos','esta','estaba',
    'estaban','estado','estamos','estan','estar','estas','este','esto','estos',
    'fue','fueron','ha','han','hace','hacer','hacia','hasta','hay','la','las',
    'le','les','lo','los','mas','me','mi','mis','mucha','muchas','mucho','muchos',
    'muy','nada','ni','no','nos','nosotros','nuestra','nuestras','nuestro',
    'nuestros','o','otra','otras','otro','otros','para','pero','poco','por',
    'porque','que','qué','quien','quienes','se','sea','sean','ser','si','sí',
    'siempre','sin','sobre','solo','son','su','sus','tambien','también','tan',
    'tanto','te','tener','tiene','tienen','toda','todas','todo','todos','tu',
    'tus','un','una','unas','uno','unos','va','van','vez','y','ya','yo',
    'persona','equipo','trabajo','año','vez'
  ])
};
