/* ============================================================
   CONFIG — Recognition Points (v4 — solo página pública)
   El único archivo que necesitás editar.

   Flujo:
   1. Votante usa la página → mailto abre Outlook con el voto.
   2. Power Automate detecta el mail → escribe en Excel SharePoint.
   3. Power BI lee el Excel y muestra el dashboard a los responsables.
      (Los responsables abren Power BI directamente desde su cuenta.)
   ============================================================ */

window.APP_CONFIG = {

  /* ------------------------------------------------------------
     MODO DE ALMACENAMIENTO
     ------------------------------------------------------------
     'mailto' -> abre Outlook prellenado con el voto en el subject.
                 Cada submit = un mail al ADMIN_EMAIL.
                 Es el modo PRINCIPAL.

     'local'  -> guarda en localStorage (offline). Útil para testear
                 la UI sin mandar mails reales.
     ------------------------------------------------------------ */
  STORAGE_MODE: 'mailto',


  /* ------------------------------------------------------------
     MAIL — destinatario y formato
     ------------------------------------------------------------ */
  MAIL: {
    // A quién llegan todos los votos. Tiene que ser la inbox que
    // escucha el flow de Power Automate.
    ADMIN_EMAIL: 'juan.i.da.torre@accenture.com',

    // Prefijo del subject. Tiene que coincidir con el "Subject Filter"
    // del trigger en Power Automate.
    SUBJECT_PREFIX: 'RP-FY26-VOTE',

    // Separador de campos dentro del subject.
    // Si lo cambiás acá, también cambialo en las expresiones split() del flow.
    FIELD_SEP: '|',

    // Cuerpo del mail (lo que ve el usuario antes de mandar).
    // Solo informativo, el flow no lo lee.
    BODY: 'Esta nominacion fue generada automaticamente por la pagina Recognition Points. No respondas este mail.\n\nGracias por participar.',

    // Límite de caracteres para la justificación.
    // Subjects de Outlook permiten ~255 chars. Reservamos espacio
    // para los otros campos (id, voter, nominee, timestamp, separadores).
    MAX_JUSTIFICATION_CHARS: 200
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
  ]
};
