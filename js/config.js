/* ============================================================
   CONFIG — Recognition Points
   Acá centralizás todo lo configurable. No hace falta tocar
   los otros archivos para cambiar contraseña, modo de storage
   o las URLs de Power Automate.
   ============================================================ */

window.APP_CONFIG = {

  /* ------------------------------------------------------------
     MODO DE ALMACENAMIENTO
     ------------------------------------------------------------
     'local'         -> guarda en el navegador (localStorage)
                        + permite exportar / importar JSON manual.
                        Sirve para arrancar HOY sin nada extra.

     'powerautomate' -> envía cada voto vía POST al flow de
                        Power Automate, que lo escribe en el
                        Excel de SharePoint. Y la jefa lee con
                        un GET a otro flow.
                        Cambiar a este modo cuando los flows
                        estén creados y las URLs pegadas abajo.
     ------------------------------------------------------------ */
  STORAGE_MODE: 'local',


  /* ------------------------------------------------------------
     POWER AUTOMATE — URLs de los flows
     ------------------------------------------------------------
     Pegá acá las "HTTP POST URL" que te genera Power Automate
     cuando creás un flow con trigger
     "When a HTTP request is received".
     ------------------------------------------------------------ */
  POWER_AUTOMATE: {
    // Flow que recibe un voto y lo agrega como fila al Excel
    SUBMIT_VOTE_URL: 'PEGAR_AQUI_LA_URL_DEL_FLOW_DE_SUBMIT',

    // Flow que devuelve todos los votos (para el dashboard de la jefa)
    GET_VOTES_URL:   'PEGAR_AQUI_LA_URL_DEL_FLOW_DE_GET',

    // Token compartido — opcional pero recomendado.
    // Lo agregamos como header. En el flow validás que coincida.
    SHARED_TOKEN: 'cambiar-este-token-por-uno-largo-aleatorio'
  },


  /* ------------------------------------------------------------
     CREDENCIALES DE ADMIN (la jefa)
     ------------------------------------------------------------
     Como acordamos, va contraseña en código. NO es seguro
     contra alguien que abra el HTML, pero filtra al 99% de
     curiosos casuales. Cambiala por algo que no sea obvio.

     Si después querés algo más fuerte, podemos pasar a un
     hash SHA-256 (te puedo armar el cambio en 2 minutos).
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


  /* ------------------------------------------------------------
     STOPWORDS — palabras a ignorar en la nube de palabras
     ------------------------------------------------------------ */
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
