const express = require('express');
const path = require('path');
const { scrapeMercadoLibre } = require('./scraper'); // Asegúrate de que el nombre del archivo sea correcto

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true })); // Middleware para procesar datos del formulario

app.get('/', (req, res) => {
    res.render('index', { title: 'PriceHive', contentAmazon: null});
});

app.post('/search', async (req, res) => {
    const productName = req.body.productName; // Obtiene el texto de la barra de búsqueda
    try {
        contentAmazon = await scrapeMercadoLibre(productName); // Llama a la función scrapeAmazon con el producto buscado
        console.log(contentAmazon);
        res.render('index', { title: 'Tienda', contentAmazon });
    } catch (error) {
        console.error('Failed to scrape Amazon:', error);
        res.send('Error scraping Amazon');
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
