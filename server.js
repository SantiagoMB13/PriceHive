const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const scrapeAlkosto = require('./scrappers/scrapper_alkosto');
const scrapeExito = require('./scrappers/scrapper_exito');
const scrapeFalabella = require('./scrappers/scrapper_falabella');
const scrapeMercadoLibre = require('./scrappers/scrapper_mercadolibre');
const scrapeOlimpica = require('./scrappers/scrapper_olimpica');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

let content = [];
let contentsorted = [];
let prodname="";
let renderedorder="null";
let renderedcontent = [];
let isscrapping = false;
let firstsearch = true;

// Middleware para redirigir a la página principal si la URL no es '/' o '/search'
app.use((req, res, next) => {
    if (req.url !== '/' && req.url !== '/search' && req.url !== '/loading' && req.url !== '/error' && req.url !== '/search-p2' && req.url !== '/search-p3') {
        res.redirect('/');
    } else {
        if((req.url == '/search' && firstsearch == true) || (req.url == '/search-p2' && renderedcontent.length < 6) || (req.url == '/search-p3' && renderedcontent.length < 11)){
             res.redirect('/');
         } else {
             next();
         }
    }
});

app.get('/', (req, res) => {
    res.render('mainpage');
});

app.get('/error', (req, res) => {
    const referer = req.headers.referer; //Obtiene la URL de la página que hizo la solicitud
    if (referer && referer.endsWith('/loading')) { //Solo se debe poder a acceder a error desde /loading
        res.render('errorpage');
    } else {
        res.redirect('/');
    }
});

app.post('/loading', (req, res) => {
        firstsearch = false;
        const productName = req.body.productName;
        const order = req.body.order; // Obtener el parámetro 'order' de la solicitud
        res.render('loadingpage' , { productName: productName, order: order });  
});

app.get('/loading', (req, res) => {
    res.redirect('/');
});

app.get('/search', (req, res) => {
    res.render('page1', { content: renderedcontent, order: renderedorder, prodname: prodname});
});

app.get('/search-p2', (req, res) => {
    res.render('page2', { content: renderedcontent, order: renderedorder, prodname: prodname});
});

app.get('/search-p3', (req, res) => {
    res.render('page3', { content: renderedcontent, order: renderedorder, prodname: prodname});
});

app.post('/search', async (req, res) => { //post
   if(isscrapping == false){
    isscrapping = true;
    const productName = req.body.productName;
    const order = req.body.order; // Obtener el parámetro 'order' de la solicitud
    if (prodname != productName) { // Verificar si 'order' tiene valor null o si los productos buscados son diferentes
        try {
            content = []; // Limpiar la lista de productos
             let [contentAlk, contentExito, contentFalabella, contentOlimpica, contentML] = await Promise.all([
                scrapeAlkosto(productName),
                scrapeExito(productName),
                scrapeFalabella(productName),
                scrapeOlimpica(productName),
                scrapeMercadoLibre(productName)
            ]);

            //Añadimos los precios en formato int para hacer el sort
            for (let i = 0; i < contentAlk.length; i++){
                contentAlk[i].priceint = parseInt(contentAlk[i].price.replace('$', '').replaceAll('.', ''));
            }
            for (let i = 0; i < contentExito.length; i++){
                contentExito[i].priceint = parseInt(contentExito[i].price.replace('$', '').replaceAll('.', ''));
            }
            for (let i = 0; i < contentFalabella.length; i++){
                contentFalabella[i].priceint = parseInt(contentFalabella[i].price.replace('$', '').replaceAll('.', ''));
            }
            for (let i = 0; i < contentML.length; i++){
                contentML[i].priceint = parseInt(contentML[i].price.replace('$', '').replaceAll('.', ''));
            }
            for (let i = 0; i < contentOlimpica.length; i++){
                contentOlimpica[i].priceint = parseInt(contentOlimpica[i].price.replace('$', '').replaceAll('.', ''));
            }
            //Ordenamos los productos por precio
            contentAlk = contentAlk.sort(function(a, b) {
                return a.priceint - b.priceint;
            });
            contentExito = contentExito.sort(function(a, b) {
                return a.priceint - b.priceint;
            });
            contentFalabella = contentFalabella.sort(function(a, b) {
                return a.priceint - b.priceint;
            });
            contentML = contentML.sort(function(a, b) {
                return a.priceint - b.priceint;
            });
            contentOlimpica = contentOlimpica.sort(function(a, b) {
                return a.priceint - b.priceint;
            });

            let listatemp = [contentAlk, contentExito, contentFalabella, contentML, contentOlimpica]; // Crear una lista temporal para filtrar
            // Iteramos sobre cada lista en la lista principal
            for (let i = 0; i < listatemp.length; i++) {
                // Verificamos si la lista tiene más de 3 elementos
                if (listatemp[i].length > 3) {
                    // Si sí, cortamos la lista para que solo tenga los primeros 3 elementos
                    listatemp[i] = listatemp[i].slice(0, 3);
                }
                content = content.concat(listatemp[i]); // Unir la lista temporal a la lista principal
            } 

            contentsorted = content.slice(); // Crear una copia para ordenar la página por precio
                contentsorted.sort(function(a, b) {
                    return a.priceint - b.priceint;
                });
            prodname = productName;
            renderedcontent = content;
            renderedorder = "name";
            if(content.length == 0){
                isscrapping = false;
                console.log('No se encontraron productos que cumplan con el criterio deseado.');
                res.render('page1', { content: content, order: "name", prodname: productName});
            } else {
                isscrapping = false;
                res.render('page1', { content: content, order: "name", prodname: productName});
            }           
        } catch (error) {
            console.error('Error inesperado:', error);
            closeChromium();
            isscrapping = false;
            console.log("Redirigiendo a la página de error...");
            res.status(500).send('Error scraping');
        }
    } else {
        // Código para manejar el orden diferente si se proporciona 'order'
	if (order == "name"){
        renderedcontent = contentsorted;
        renderedorder = "price";
        isscrapping = false;
		res.render('page1', { content: contentsorted, order: "price", prodname: productName });
	} else {
        renderedcontent = content;
        renderedorder = "name";
        isscrapping = false;
		res.render('page1', { content: content, order: "name", prodname: productName });
	}
    }
   }
});

app.post('/search-p2', async (req, res) => { //post
    if(isscrapping == false){
     isscrapping = true;
     const productName = req.body.productName;
     const order = req.body.order; // Obtener el parámetro 'order' de la solicitud
        if (order == "name"){
            renderedcontent = contentsorted;
            renderedorder = "price";
            isscrapping = false;
            res.render('page2', { content: contentsorted, order: "price", prodname: productName });
        } else {
            renderedcontent = content;
            renderedorder = "name";
            isscrapping = false;
            res.render('page2', { content: content, order: "name", prodname: productName });
        }    
    }
 });

 app.post('/search-p3', async (req, res) => { //post
    if(isscrapping == false){
     isscrapping = true;
     const productName = req.body.productName;
     const order = req.body.order; // Obtener el parámetro 'order' de la solicitud
        if (order == "name"){
            renderedcontent = contentsorted;
            renderedorder = "price";
            isscrapping = false;
            res.render('page3', { content: contentsorted, order: "price", prodname: productName });
        } else {
            renderedcontent = content;
            renderedorder = "name";
            isscrapping = false;
            res.render('page3', { content: content, order: "name", prodname: productName });
        }    
    }
 });

function closeChromium() {
    console.log("Cerrando procesos de Chromium residuales...");
    exec('tasklist /FI "IMAGENAME eq chrome.exe" /V /FO CSV', (err, stdout, stderr) => {
      if (err) {
        console.error(`Error al obtener la lista de procesos: ${err}`);
        return;
      }
  
      // Filtrar los procesos para identificar Chromium
      const lines = stdout.split('\n');
      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split('","');
        const description = columns[8]; // El índice puede variar según el sistema operativo, este funciona en windows
        // Comprueba si la descripción contiene "Chromium"
        if(description){
            if (description.includes("Chromium")) {
            const pid = columns[1]; // Obtener el PID del proceso
            // Cerrar el proceso de Chromium por su PID
            exec(`taskkill /PID ${pid} /F`, (err, stdout, stderr) => {
                if (err) {
                console.error(`Error al cerrar Chromium: ${err}`);
                return;
                }
            });
            }
        }
      }
      console.log(`Chromium cerrado con éxito`);
    });
}

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
