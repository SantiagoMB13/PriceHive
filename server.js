const express = require('express');
const path = require('path');
const { scrapeMercadoLibre, scrapeAlkosto } = require('./scraper');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Middleware para redirigir a la página principal si la URL no es '/' o '/search'
app.use((req, res, next) => {
    if (req.url !== '/' && req.url !== '/search') {
        res.redirect('/');
    } else {
        next();
    }
});

app.get('/', (req, res) => {
    res.render('index', { title: 'PriceHive', content: null});
});

app.post('/search', async (req, res) => {
    const productName = req.body.productName;
    try {
        contentAlk = await scrapeAlkosto(productName);
        contentML = await scrapeMercadoLibre(productName);
        content = contentAlk.concat(contentML);
        let contentsorted = content;
        contentsorted.sort(function(a, b) {
            return a.priceint - b.priceint;
        });
        console.log(contentsorted);
        res.render('index', { title: 'Tienda', contentsorted });
    } catch (error) {
        console.error('Failed to scrape:', error);
        res.send('Error scraping');
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
