const express = require('express');
const path = require('path');
const { scrapeMercadoLibre, scrapeAlkosto, scrapeOlimpica, scrapeExito } = require('./scraper');
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
    if (req.url !== '/' && req.url !== '/search' && req.url !== '/loading' && req.url !== '/error') {
        res.redirect('/');
    } else {
        next();
    }
});

app.get('/', (req, res) => {
    content = [];
    contentsorted = [];
    prodname="";
    renderedorder="null";
    renderedcontent = [];
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
    res.render('index', { content: renderedcontent, order: renderedorder });
});

app.post('/search', async (req, res) => { //post
   if(isscrapping == false){
    isscrapping = true;
    const productName = req.body.productName;
    const order = req.body.order; // Obtener el parámetro 'order' de la solicitud
    if (order == "null" || prodname != productName) { // Verificar si 'order' tiene valor null o si los productos buscados son diferentes
        try {
            const contentAlk = await scrapeAlkosto(productName);
            const contentExito = await scrapeExito(productName);
            const contentML = await scrapeMercadoLibre(productName);
            const contentOlimpica = await scrapeOlimpica(productName);
            content = contentAlk.concat(contentExito, contentML, contentOlimpica); // Unir los resultados de los scrapers en una lista
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
                res.status(500).send('Error scraping');
            } else {
                isscrapping = false;
                res.render('index', { content: content, order: "name" });
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
		res.render('index', { content: contentsorted, order: "price" });
	} else {
        renderedcontent = content;
        renderedorder = "name";
        isscrapping = false;
		res.render('index', { content: content, order: "name" });
	}
    }
   }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
