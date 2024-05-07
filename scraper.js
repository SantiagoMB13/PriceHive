const { query } = require('express');
const { chromium } = require('playwright');

const scrapeMercadoLibre = async (productName) => {
let index = 0;
let count = 0;
let keepsearching = true;
let productos = [];
while(keepsearching==true & count < 3) {
     const product = await getMLproduct(productName, index);
     if(product !== null){
         if(product.found == false){
            keepsearching = false;
         } else {
           productos.push(product);
           count++;
         }
     }
     index++;
}
    return productos;
};

const getMLproduct = async (productName, prodindex) => {
    const browser = await chromium.launch({
        headless: false,
        slowMo: 500
    });

   let found = false;
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
    const filtronuevo = await page.waitForSelector("span.ui-search-filter-name:text('Nuevo')", { timeout: 3000 });
    if (filtronuevo) {
        await filtronuevo.click();
    }   

    // Seleccionar el primer producto de la lista
    await page.waitForLoadState('domcontentloaded');
    const items = await page.$$('.ui-search-item__group__element.ui-search-link__title-card.ui-search-link');
    if (items.length > prodindex) {
        await items[prodindex].click();
        // Extraer los datos del producto

        // Título
        let title;
        try{
            title = await page.$eval('.ui-pdp-title', element => element.innerText.trim());
        } catch (error) {
            await browser.close();
            return null;
        }

        // Precio
        let price;
        try {
            price = await page.$eval('.ui-pdp-price__main-container', element => element.innerHTML);
        } catch (error) {
            await browser.close();
            return null;
        }

        // Imagen
        let image;
        try{
            image = await page.$eval('.ui-pdp-gallery__figure', element => element.innerHTML);
        } catch (error) {
                await browser.close();
                return null;
            }

        // Desplegar descripción completa
        try {
            const fulldesc = await page.waitForSelector("a.ui-pdp-collapsable__action[title='Ver descripción completa']", { timeout: 3000 });
        await fulldesc.click();
        } catch (error) {}
        
        //Descripción
        let description;
        try {
            description = await page.$eval('p.ui-pdp-description__content', element => element.innerHTML);
        } catch (error) {
            await browser.close();
            return null;
        }

        //Especificaciones
        let specifications;
        try {
            specifications = await page.$eval('.ui-vpp-highlighted-specs__features-list', element => element.innerHTML);
            specifications = "<ul>" + specifications + "</ul>";
        } catch (error) {
            try{
                specifications = await page.$eval('.ui-vpp-highlighted-specs__attribute-columns', element => element.innerText.trim());
            } catch (error) {
                await browser.close();
                return null;
            }
            
        }
        const url = page.url();
        found = true;
        await browser.close();
        // Retorna los datos del producto
        return { title, price, image, description, specifications, url, found };
    }    else {
            await browser.close();
            return { found };
    }
};

module.exports = { scrapeMercadoLibre };