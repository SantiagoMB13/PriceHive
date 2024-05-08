const { query } = require('express');
const { chromium } = require('playwright');


//Funciones main de scrapping
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
     if(index-count > 4){
        keepsearching = false;
    }
}
    return productos;
};

const scrapeAlkosto = async (productName) => {
    let index = 0;
    let count = 0;
    let keepsearching = true;
    let productos = [];
    while(keepsearching==true & count < 3) {
         const product = await getAlkproduct(productName, index);
         if(product !== null){
             if(product.found == false){
                keepsearching = false;
             } else {
               productos.push(product);
               count++;
             }
         }
         index++;
         if(index-count > 4){
            keepsearching = false;
        }
    }
        return productos;
    };


//Funciones de scrapping para un producto    
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
    try {
        // Filtrar por precio y productos nuevos
        await new Promise(resolve => setTimeout(resolve, 500));
        await page.click('#\\:R2m55e6\\:\\-display\\-values');
        await page.click('#\\:R2m55e6\\:\\-menu\\-list\\-option\\-price_asc');
        await page.waitForLoadState('domcontentloaded');
        await new Promise(resolve => setTimeout(resolve, 500));
        // Filtrar por productos nuevos
        const filtronuevo = await page.waitForSelector("span.ui-search-filter-name:text('Nuevo')", { timeout: 2000 });
        await filtronuevo.click(); 
    } catch (error) {
        await browser.close();
        console.log("Error en el producto " + prodindex + " de Mercado Libre, intentando con el siguiente...");
        return null;
    }   
        // Seleccionar el primer producto de la lista
        await page.waitForLoadState('domcontentloaded');
    const items = await page.$$('.ui-search-item__group__element.ui-search-link__title-card.ui-search-link');
    if (items.length > prodindex) {
        await items[prodindex].click();
        await page.waitForLoadState('domcontentloaded');
        // Extraer los datos del producto

        // Título
        let title;
        try{
            title = await page.$eval('.ui-pdp-title', element => element.innerText.trim());
        } catch (error) {
            await browser.close();
            console.log("Error en el producto " + prodindex + " de Mercado Libre, intentando con el siguiente...");
            return null;
        }

        // Precio
        let price;
        try {
            price = await page.$eval('.ui-pdp-price__second-line', element => element.innerText.trim());
            let lineas = price.split('\n');
            price = lineas[1];
            priceint = parseInt(price.replaceAll('.', ''));
            price = "$"+price;
            console.log(priceint);
        } catch (error) {
            await browser.close();
            console.log("Error en el producto " + prodindex + " de Mercado Libre, intentando con el siguiente...");
            return null;
        }

        // Imagen
        let image;
        try{
            image = await page.$eval('.ui-pdp-gallery__figure', element => element.innerHTML);
        } catch (error) {
                await browser.close();
                console.log("Error en el producto " + prodindex + " de Mercado Libre, intentando con el siguiente...");
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
            console.log("Error en el producto " + prodindex + " de Mercado Libre, intentando con el siguiente...");
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
                console.log("Error en el producto " + prodindex + " de Mercado Libre, intentando con el siguiente...");
                return null;
            }
            
        }
        const url = page.url();
        found = true;
        await browser.close();
        // Retorna los datos del producto
        return { title, price, image, description, specifications, url, found, priceint };
    }    else {
            await browser.close();
            return { found };
    }
};

const getAlkproduct = async (productName, prodindex) => {
    const browser = await chromium.launch({
        headless: false,
        slowMo: 500
    });

   let found = false;
    const page = await browser.newPage();
    await page.goto('https://www.alkosto.com/', { timeout: 60000 }); // Aumentamos el tiempo de espera a 60 segundos
    await page.waitForLoadState('domcontentloaded');

    // Ingresa el nombre del producto en el campo de búsqueda y envía la búsqueda
    await page.click('#js-site-search-input');
    await page.fill('#js-site-search-input', productName);
    await page.press('#js-site-search-input', 'Enter');
    await page.waitForLoadState('domcontentloaded'); 

    // Filtrar por precio y productos nuevos
    await page.click('#sort-by');  
    sortprice = await page.waitForSelector('.js-custom-option[data-value="alkostoIndexAlgoliaPRD_price_asc"]', { timeout: 3000 });
    await new Promise(resolve => setTimeout(resolve, 700));
    sortprice.click();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Seleccionar el primer producto de la lista
    await page.waitForLoadState('domcontentloaded');
    await new Promise(resolve => setTimeout(resolve, 500));
    const items = await page.$$('.product__item__top__title.js-algolia-product-click.js-algolia-product-title');
    if (items.length > prodindex) {
        await items[prodindex].click();
        await page.waitForLoadState('domcontentloaded');
        // Extraer los datos del producto

        // Título
        let title;
        try{
            title = await page.$eval('.new-container__header__title', element => element.innerText.trim()); 
        } catch (error) {
            await browser.close();
            console.log("Error en el producto " + prodindex + " de Alkosto, intentando con el siguiente...");
            return null;
        }

        // Precio
        let price;
        try {
            price = await page.$eval('#js-original_price', element => element.innerText.trim());
            price = price.replace(/\s/g, '');
            price = price.replace('Hoy', '');
            priceint = parseInt(price.replace('$', '').replaceAll('.', ''));
            console.log(priceint);
        } catch (error) {
            await browser.close();
            console.log("Error en el producto " + prodindex + " de Alkosto, intentando con el siguiente...");
            return null;
        }

        // Imagen
        let image;
        try{
            image = await page.$eval('.owl-lazy.js-zoom-desktop-new', element => element.getAttribute('src'));
            image = "https://www.alkosto.com" + image;
            image = "<img src='" + image + "' alt='Imagen del producto'>";
        } catch (error) {
                await browser.close();
                console.log("Error en el producto " + prodindex + " de Alkosto, intentando con el siguiente...");
                return null;
            }

        //Descripción
        let description;
        try {
            description = await page.$eval('#wc-product-characteristics', element => element.innerHTML);
            description = "<p>" + description + "</p>";
        } catch (error) {
            await browser.close();
            console.log("Error en el producto " + prodindex + " de Alkosto, intentando con el siguiente...");
            return null;
        }

        //Especificaciones
        let specifications;
        try {
            specifications = await page.$eval('.tab-details__keyFeatures--list', element => element.innerHTML);
            specifications = "<ul>" + specifications + "</ul>";
        } catch (error) {
            try{
                specifications = await page.$eval('.new-container__table__classifications___type__wrap.new-container__table__classifications___type__wrap--mobile', element => element.innerText.trim());
            } catch (error) {
                await browser.close();
                console.log("Error en el producto " + prodindex + " de Alkosto, intentando con el siguiente...");
                return null;
            }
            
        }
        const url = page.url();
        found = true;
        await browser.close();
        // Retorna los datos del producto
        return { title, price, image, description, specifications, url, found, priceint };
    }    else {
            await browser.close();
            return { found };
    }
};

module.exports = { scrapeMercadoLibre, scrapeAlkosto };