const { query } = require('express');
const { chromium } = require('playwright');

const scrapeMercadoLibre = async (productName) => {
    const browser = await chromium.launch({
        headless: false,
        slowMo: 500
    });

    const page = await browser.newPage();
    await page.goto('https://www.mercadolibre.com.co');
    await page.waitForLoadState('domcontentloaded');

    // Ingresa el nombre del producto en el campo de búsqueda y envía la búsqueda
    await page.click('#cb1-edit');
    await page.fill('#cb1-edit', productName);
    await page.press('#cb1-edit', 'Enter');
    await page.waitForLoadState('domcontentloaded');

    // Filtrar por precio y productos nuevos
    await page.click('#\\:R2m55e6\\:\\-display\\-values');
    await page.click('#\\:R2m55e6\\:\\-menu\\-list\\-option\\-price_asc');
    await page.waitForLoadState('domcontentloaded');
    const filtronuevo = await page.waitForSelector("span.ui-search-filter-name:text('Nuevo')", { timeout: 5000 });
    if (filtronuevo) {
        await filtronuevo.click();
    }   

    // Seleccionar el primer producto de la lista
    await page.waitForLoadState('domcontentloaded');
    const items = await page.$$('.ui-search-item__group__element.ui-search-link__title-card.ui-search-link');
    if (items.length > 0) {
        await items[0].click();
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    


        // Extraer los datos del producto
        const title = await page.$eval('#productTitle', element => element.innerText.trim());
        const price = await page.$eval('.a-price.aok-align-center.reinventPricePriceToPayMargin.priceToPay', element => element.innerText.trim());
        const description = await page.$eval('#feature-bullets', element => element.innerText.trim());
        const specifications = await page.$eval('#productOverview_feature_div', element => element.innerText.trim());

        await browser.close();

        // Retorna los datos del producto
        return { title, price, description, specifications };
};

module.exports = { scrapeMercadoLibre };
