const express = require('express');
const path = require('path');
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

// Middleware para redirigir a la página principal si la URL no es '/' o '/search'
app.use((req, res, next) => {
    if (req.url !== '/' && req.url !== '/search' && req.url !== '/loading' && req.url !== '/error' && req.url !== '/search-p2' && req.url !== '/search-p3') {
        res.redirect('/');
    } else {
        if((req.url == '/search-p2' && renderedcontent.length < 6) || (req.url == '/search-p3' && renderedcontent.length < 11)){
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
    res.render('errorpage');
});

app.post('/loading', (req, res) => {
        const productName = req.body.productName;
        const order = req.body.order; // Obtener el parámetro 'order' de la solicitud
        res.render('loadingpage' , { productName: productName, order: order });    
});

app.get('/search', (req, res) => {
    res.render('index', { content: renderedcontent, order: renderedorder, prodname: prodname});
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
    if (order == "null" || prodname != productName) { // Verificar si 'order' tiene valor null o si los productos buscados son diferentes
        try {
            const contentML = await scrapeMercadoLibre(productName);
            let priceRef;
            if(contentML.length > 0){ 
                priceRef = contentML[0].priceint * 0.7; // Tomar el precio del primer producto de Mercado Libre y aplicar un descuento del 30% para referencia de precios
            } else {
                priceRef = 500000; // Si no se encuentra el producto en Mercado Libre, se asigna un precio de referencia de 500000
            } 
            const [contentAlk, contentOlimpica, contentExito , contentFalabella] = await Promise.all([
                scrapeAlkosto(productName, priceRef),
                scrapeOlimpica(productName),
                scrapeExito(productName, priceRef),
                scrapeFalabella(productName, priceRef)
            ]);
            content = contentAlk.concat(contentExito , contentFalabella, contentML, contentOlimpica); // Unir los resultados de los scrapers en una lista 
            contentsorted = content.slice(); // Crear una copia para ordenar
                contentsorted.sort(function(a, b) {
                    return a.priceint - b.priceint;
                });
            prodname = productName;
            console.log('Scraped:', content);
            renderedcontent = content;
            renderedorder = "name";
            if(content.length == 0){
                isscrapping = false;
                console.log('No se encontraron productos que cumplan con el criterio deseado.');
                res.render('index', { content: content, order: "name", prodname: productName});
            } else {
                isscrapping = false;
                res.render('index', { content: content, order: "name", prodname: productName});
            }           
        } catch (error) {
            isscrapping = false;
            res.status(500).send('Error scraping');
        }
    } else {
        // Código para manejar el orden diferente si se proporciona 'order'
	if (order == "name"){
        renderedcontent = contentsorted;
        renderedorder = "price";
        isscrapping = false;
		res.render('index', { content: contentsorted, order: "price", prodname: productName });
	} else {
        renderedcontent = content;
        renderedorder = "name";
        isscrapping = false;
		res.render('index', { content: content, order: "name", prodname: productName });
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

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
