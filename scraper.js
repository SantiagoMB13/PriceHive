const { query } = require('express');
const { chromium } = require('playwright');

const scrapeMercadoLibre = async (productName) => {
    const browser = await chromium.launch({
        headless: false,
        slowMo: 500
    });

    const prod1 = {
        title: '',
        price: '',
        description: '',
        specifications: '',
        url: '',
        found: 'no'
    };

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
        // Extraer los datos del producto
        const title = await page.$eval('.ui-pdp-title', element => element.innerText.trim());
        const price = await page.$eval('.ui-pdp-price__main-container', element => element.innerHTML);
        const fulldesc = await page.waitForSelector("a.ui-pdp-collapsable__action[title='Ver descripción completa']", { timeout: 5000 });
        if (fulldesc) {
            await fulldesc.click();
        }
        const description = await page.$eval('p.ui-pdp-description__content', element => element.innerHTML);
        const specifications = await page.$eval('.ui-vpp-highlighted-specs__features', element => element.innerHTML);
        prod1.title = title;
        prod1.description = description;
        prod1.price = price;
        prod1.specifications = specifications;
        prod1.url = page.url();
        prod1.found = 'yes';
    }
        
        

        await browser.close();
        // Retorna los datos del producto
        return { prod1 };
};

module.exports = { scrapeMercadoLibre };
