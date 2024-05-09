const express = require('express');
const path = require('path');
const { scrapeMercadoLibre, scrapeAlkosto } = require('./scraper'); // Asegúrate de que el nombre del archivo sea correcto

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true })); // Middleware para procesar datos del formulario

app.get('/', (req, res) => {
    res.render('index', { title: 'PriceHive', content: null});
});

app.post('/search', async (req, res) => {
    const productName = req.body.productName; // Obtiene el texto de la barra de búsqueda
    try {
        contentAlk = await scrapeAlkosto(productName); // Llama a la función scrapeAlkosto con el producto buscado
        contentML = await scrapeMercadoLibre(productName); // Llama a la función scrapeMercadoLibre con el producto buscado
        content = contentAlk.concat(contentML); // Concatena los resultados de las tiendas
        let contentsorted = content;
        contentsorted.sort(function(a, b) {
            return a.priceint - b.priceint; //Ordenar por precio para el filtro
        });
        console.log(contentsorted);
        res.render('index', { title: 'Tienda', contentsorted });
    } catch (error) {
        console.error('Failed to scrape Amazon:', error);
        res.send('Error scraping Amazon');
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
