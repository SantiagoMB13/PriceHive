const { query } = require('express');
const { chromium } = require('playwright');


//Funciones main de scrapping
const scrapeMercadoLibre = async (productName) => {
let index = 0;
let count = 0;
let keepsearching = true;
let productos = [];
while(keepsearching==true & count < 3) { //Se buscan 3 productos siempre que haya disponibles
     const product = await getMLproduct(productName, index);
     if(product !== null){
         if(product.found == false){
            keepsearching = false; //Si no hay mas productos por ver, se detiene la busqueda
         } else {
           productos.push(product); //Se añade el producto a la lista
           count++;
         }
     }
     index++; //Se aumenta el indice para buscar el siguiente producto
     if(index-count > 3){ //Si se han encontrado 4 productos con errores en la misma tienda, se detiene la busqueda
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
         if(index-count > 3){
            keepsearching = false;
        }
    }
        return productos;
    };

    const scrapeOlimpica = async (productName) => {
        let index = 0;
        let count = 0;
        let keepsearching = true;
        let productos = [];
        while(keepsearching==true & count < 3) {
             const product = await getOliproduct(productName, index);
             if(product !== null){
                 if(product.found == false){
                    keepsearching = false;
                 } else {
                   productos.push(product);
                   count++;
                 }
             }
             index++;
             if(index-count > 3){
                keepsearching = false;
            }
        }
            return productos;
        };

        const scrapeExito = async (productName) => {
            let index = 0;
            let count = 0;
            pagenum = 0;
            let keepsearching = true;
            let productos = [];
            while (keepsearching == true & count < 3) {
                const product = await getExproduct(productName, index, pagenum);
                if (product !== null) {
                    if(product.found == null){
                        pagenum++;
                        index=-1; //Se reinicia el indice para buscar en la siguiente página
                    } else {
                    if (product.found == false) {
                        keepsearching = false;
                    } else {
                        productos.push(product);
                        count++;
                    }
                }
                }
                index++;
                if (index - count > 3) {
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
   productNameori = productName.trim();
   productName = productName.replace(/ /g, "-");//Reemplazar espacios por guiones para la URL
   const page = await browser.newPage();
   let link = "https://listado.mercadolibre.com.co/product_OrderId_PRICE_NoIndex_True"; //Navegar a mercado libre, ya aplicando orden por precio
   let nuevoLink = link.replace("product", productName);
   await page.goto(nuevoLink);
   await page.waitForLoadState('domcontentloaded');
    try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Filtrar por productos nuevos (se hace aqui para evitar que se pierda la categoria del producto)
        const filtronuevo = await page.waitForSelector("span.ui-search-filter-name:text('Nuevo')", { timeout: 8000 });
        await filtronuevo.click(); 
    } catch (error) { 
        await browser.close();
        console.log("Error en el producto " + prodindex + " de Mercado Libre, intentando con el siguiente...");
        return null;
    }   
        // Seleccionar los productos de la lista
        await page.waitForLoadState('domcontentloaded');
        const items = await page.$$('h2.ui-search-item__title');
        const productNameLowercase = productNameori.toLowerCase(); // Convertir el nombre del producto a minúsculas
    // Usar Promise.all para esperar que todas las llamadas asíncronas se completen
    const filteredItems = await Promise.all(items.map(async (element) => {
        let elementTextLowercase = await element.innerText();
        elementTextLowercase = elementTextLowercase.toLowerCase();
        return elementTextLowercase.includes(productNameLowercase) && !elementTextLowercase.includes("reacondicionado");
    }));
    // Filtrar los elementos basados en el resultado de las llamadas asíncronas
    const finalFilteredItems = items.filter((element, index) => filteredItems[index]);

    //Seleccionar elementos válidos según el índice
    if (finalFilteredItems.length > prodindex) {
        await finalFilteredItems[prodindex].click();
        await page.waitForLoadState('domcontentloaded');
        // Extraer los datos del producto

        // Extraer título
        let title;
        try{
            title = await page.$eval('.ui-pdp-title', element => element.innerText.trim());
        } catch (error) {
            await browser.close();
            console.log("Error en el producto " + prodindex + " de Mercado Libre, intentando con el siguiente...");
            return null;
        }

        // Extraer precio
        let price;
        try {
            price = await page.$eval('.ui-pdp-price__second-line', element => element.innerText.trim());
            let lineas = price.split('\n');
            price = lineas[1];
            priceint = parseInt(price.replaceAll('.', ''));
            price = "$"+price;
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

        // Extraer especificaciones
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
            return { found }; //Si no hay productos por ver, se retorna un objeto con el atributo found en false
    }
};

const getAlkproduct = async (productName, prodindex) => {
    const browser = await chromium.launch({
        headless: false,
        slowMo: 500
    });

   let found = false;
    let productNameori = productName.trim();
    const page = await browser.newPage();
    let link = "https://www.alkosto.com/search?text=product&sort=price-asc&range=600000-999999999";
    productName = productName.replace(/ /g, "+");
    let nuevoLink = link.replace("product", productName);
    await page.goto(nuevoLink, { timeout: 60000 }); // Aumentamos el tiempo de espera a 60 segundos
    await page.waitForLoadState('domcontentloaded');

    // Seleccionar el primer producto de la lista
    await new Promise(resolve => setTimeout(resolve, 3000));
    const items = await page.$$('.product__item__top__title.js-algolia-product-click.js-algolia-product-title', { timeout: 4000 });
        const productNameLowercase = productNameori.toLowerCase(); // Convertir el nombre del producto a minúsculas
    // Usar Promise.all para esperar que todas las llamadas asíncronas se completen
    const filteredItems = await Promise.all(items.map(async (element) => {
        let elementTextLowercase = await element.innerText();
        elementTextLowercase = elementTextLowercase.toLowerCase();
        elementTextLowercase = elementTextLowercase.replace(/[\s\u00A0\u00A0]/g, " "); //Reemplazar espacios y espacios no rompibles por un solo espacio
        return elementTextLowercase.includes(productNameLowercase) && !elementTextLowercase.includes("reacondicionado"); //Filtrar por el nombre del producto y que no sea reacondicionado
    }));
        // Filtrar los elementos basados en el resultado de las llamadas asíncronas
        const finalFilteredItems = items.filter((element, index) => filteredItems[index]);


    if (finalFilteredItems.length > prodindex) {
        try{
            await finalFilteredItems[prodindex].click();
            await new Promise(resolve => setTimeout(resolve, 5500));
            await page.waitForLoadState('domcontentloaded');
        } catch (error) {
            console.log(error);
        }
        // Extraer los datos del producto

        // Título
        let title;
        try{
            title = await page.$eval('.new-container__header__title', element => element.innerText.trim(), { timeout: 10000 }); 
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

const getOliproduct = async (productName, prodindex) => {
    const browser = await chromium.launch({
        headless: false,
        slowMo: 500
    });
   let found = false;
   const productNameori = productName.trim();
    const page = await browser.newPage();
    let link = "https://www.olimpica.com/product?order=OrderByPriceASC"; //Navegar a olimpica, ya aplicando orden por precio
    productName = productName.replace(/ /g, "%20");
    let nuevoLink = link.replace("product", productName);
    await page.goto(nuevoLink, { timeout: 60000 }); // Tiempo de espera de 60 segundos porque la pagina es pesada
    await page.waitForLoadState('domcontentloaded');
    await new Promise(resolve => setTimeout(resolve, 3000));  
    let morebtn = await page.$$(".vtex-button__label.flex.items-center.justify-center.h-100.ph5:has-text('Mostrar Más')", { timeout: 5000 }); //Consigo los botones de mostrar más
        try{
         while(morebtn.length > 0){ //Mientras exista el botn de mostrar más, se da mueve hacia él
            await morebtn[0].scrollIntoViewIfNeeded(); //El botón se activa cuando se ve en la pantalla
            await page.waitForLoadState('domcontentloaded');
            await new Promise(resolve => setTimeout(resolve, 3000));  //Esperar a que cargue bien la página
            morebtn = await page.$$(".vtex-button__label.flex.items-center.justify-center.h-100.ph5:has-text('Mostrar Más')", { timeout: 4000 }); //Virificar si hay más por mostrar   
         }
        } catch (error) {}
    // Seleccionar los productos de la lista
    await page.waitForLoadState('domcontentloaded');                         
    const items = await page.$$('span.vtex-product-summary-2-x-productBrand.vtex-product-summary-2-x-brandName.t-body', { timeout: 15000 });
    const productNameLowercase = productNameori.toLowerCase(); // Convertir el nombre del producto a minúsculas
    // Usar Promise.all para esperar que todas las llamadas asíncronas se completen
    const filteredItems = await Promise.all(items.map(async (element) => {
        let elementTextLowercase = await element.innerText();
        elementTextLowercase = elementTextLowercase.toLowerCase();
        return elementTextLowercase.includes(productNameLowercase) && !elementTextLowercase.includes("reacondicionado"); //Filtrar por el nombre del producto y que no sea reacondicionado
    }));
    // Filtrar los elementos basados en el resultado de las llamadas asíncronas
    const finalFilteredItems = items.filter((element, index) => filteredItems[index]);
    if (finalFilteredItems.length > prodindex) {
        try{ //Se trata de acceder a uno de los elementos (segun el indice)
            await finalFilteredItems[prodindex].click();
            await page.waitForLoadState('domcontentloaded');
        } catch (error){}
        // Extraer los datos del producto
        await new Promise(resolve => setTimeout(resolve, 5000));
        // Extraer título
        let title;
        try{
            title = await page.$eval('.vtex-store-components-3-x-productNameContainer.vtex-store-components-3-x-productNameContainer--quickview.mv0.t-heading-4', element => element.innerText.trim(), { timeout: 20000 }); 
        } catch (error) {
            await browser.close();
            console.log("Error en el producto " + prodindex + " de Olimpica, intentando con el siguiente...");
            return null;
        }

        // Extraer precio
        let price;
        try {
            price = await page.$eval('.vtex-product-price-1-x-sellingPrice--hasListPrice--dynamicF', element => element.innerText.trim(), { timeout: 20000 });
            price = price.replaceAll(/\s/g, '');
            priceint = parseInt(price.replace('$', '').replaceAll('.', ''));
        } catch (error) {
            await browser.close();
            console.log("Error en el producto " + prodindex + " de Olimpica, intentando con el siguiente...");
            return null;
        }

        // Imagen
        let image;
        try{
            image = await page.$eval('.vtex-store-components-3-x-productImageTag.vtex-store-components-3-x-productImageTag--main', element => element.getAttribute('src'), { timeout: 20000 });
            image = "<img src='" + image + "' alt='Imagen del producto'>";
        } catch (error) {
                await browser.close();
                console.log("Error en el producto " + prodindex + " de Olimpica, intentando con el siguiente...");
                return null;
            }

        //Descripción
        let description;
        try {
            description = await page.$eval('.vtex-store-components-3-x-content.h-auto', element => element.innerHTML, { timeout: 20000 });
        } catch (error) {
            await browser.close();
            console.log("Error en el producto " + prodindex + " de Olimpica, intentando con el siguiente...");
            return null;
        }

        // Extraer especificaciones
        let specifications;
        try { //Tratar de mostrar las especificaciones en la página
            await new Promise(resolve => setTimeout(resolve, 1000));
            const filtronuevo = await page.waitForSelector(".vtex-disclosure-layout-1-x-trigger.vtex-disclosure-layout-1-x-trigger--product-specifications.vtex-disclosure-layout-1-x-trigger--hidden.vtex-disclosure-layout-1-x-trigger--product-specifications--hidden", { timeout: 10000 });
            await filtronuevo.click(); 
        } catch (error) { 
            await browser.close();
            console.log("Error en el producto " + prodindex + " de Olimpica, intentando con el siguiente...");
            return null;
        }  

        try { //Tratar de obtener las especificaciones que conseguimos mostrar en la página
            specifications = await page.$eval('.vtex-store-components-3-x-specificationsTable.vtex-store-components-3-x-specificationsTable--product-specifications.w-100.bg-base.border-collapse', element => element.innerHTML, { timeout: 20000 });
            specifications = "<table>" + specifications + "</table>";
        } catch (error) {
                await browser.close();
                console.log("Error en el producto " + prodindex + " de Olimpica, intentando con el siguiente...");
                return null;           
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

const getExproduct = async (productName, prodindex, pagenum) => {
    const browser = await chromium.launch({
        headless: false,
        slowMo: 2000
    });
    let found = false;
    const page = await browser.newPage()
    const baseUrl = "https://www.exito.com/s";
    const query = productName.split(' ').join('+');
    const priceFilter = `600000-to-20000000`;
    const url = `${baseUrl}?q=${query}&price=${priceFilter}&facets=price&sort=score_desc&page=0`;
    await page.goto(url)
    await page.waitForLoadState('domcontentloaded')
    await page.click('.sort_fs-sort__UWGKA')
    await page.click("span:text('Menor precio')")
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('h3[data-fs-product-card-title="true"]');
        for (let i = 0; i < pagenum; i++) { //Movernos de pagina segun se necesite
            nextpage = await page.waitForSelector('.Pagination_nextPreviousLink__f7_2J', { timeout: 10000 }); //Esperar a que cargue el botón de siguiente página
            nextpagebtns = await page.$$('.Pagination_nextPreviousLink__f7_2J'); //Obtener todos los botones de siguiente página
            if (nextpagebtns.length > 1) {
                await nextpagebtns[1].click(); //Clic en el botón de siguiente página
            } else {
            await nextpage.click(); //Clic en el botón de siguiente página
            }
            await page.waitForLoadState('domcontentloaded');
        } 
        await page.waitForSelector('h3[data-fs-product-card-title="true"]', { timeout: 10000 });
        const items = await page.$$('h3[data-fs-product-card-title="true"]'); // Obtener todos los productos de la página
        const productNameLowercase = productName.toLowerCase().trim(); // Convertir el nombre del producto a minúsculas
        
        // Usar Promise.all para esperar que todas las llamadas asíncronas se completen
        const filteredItems = await Promise.all(items.map(async (element) => {
            let elementTextLowercase = await element.innerText();
            elementTextLowercase = elementTextLowercase.toLowerCase();
            return elementTextLowercase.includes(productNameLowercase) && !elementTextLowercase.includes("reacondicionado");
        }));
        
        // Filtrar los elementos basados en el resultado de las llamadas asíncronas
        const finalFilteredItems = items.filter((element, index) => filteredItems[index]);




    await page.waitForLoadState('domcontentloaded');
    if (finalFilteredItems.length > prodindex) {
            await finalFilteredItems[prodindex].click();
            await page.waitForLoadState('networkidle');

        await page.waitForLoadState('networkidle');
        // Extraer los datos del producto

        // Extraer título
        let title;
        try {
            title = await page.$eval('.product-title_product-title__heading___mpLA', element => element.innerText.trim(), { timeout: 10000 });
        } catch (error) {
            await browser.close();
            console.log("Error en title en el producto " + prodindex + " de Exito, intentando con el siguiente...");
            return null;
        }

        // Extraer precio
        let price;
        try {
            price = await page.$eval('.ProductPrice_container__price__XmMWA', element => element.innerText.trim());
            priceint = parseInt(price.replace('$', '').replaceAll('.', ''));
        } catch (error) {
            await browser.close();
            console.log("Error en price en el producto " + prodindex + " de Exito, intentando con el siguiente...");
            return null;
        }

        // Imagen
        let image;
        try {
            image = await page.$eval('.ImgZoom_ContainerImage__0r4y9 img', element => element.src);
            image = "<img src='" + image + "' alt='Imagen del producto'>";
        } catch (error) {
            await browser.close();
            console.log("Error en image en el producto " + prodindex + " de Exito, intentando con el siguiente...");
            return null;
        }

        //Descripción
        let description;
        try {
            description = await page.$eval('div[data-fs-description-text=true]', element => element.innerText.trim());
        } catch (error) {
            await browser.close();
            console.log("Error en description en el producto " + prodindex + " de Éxito, intentando con el siguiente...");
            return null;
        }
        let specifications;
        try {
            specifications = await page.$$eval('div[data-fs-specification-gray-block="true"]', elements => {
                // Map each specification div to extract title and text
                return elements.map(element => {
                    const title = element.querySelector('p[data-fs-title-specification="true"]').innerText.trim();
                    const text = element.querySelector('p[data-fs-text-specification="true"]').innerText.trim();
                    return `<li>${title}: ${text}</li>`;
                }).join('');
            });

            // Format the extracted specifications as an unordered list
            if(specifications == '<ul></ul>')
                specifications = 'No se encontraron especificaciones'
            specifications = `<ul>${specifications}</ul>`;
            if(specifications == '<ul><li>Referencia: SIN REF</li></ul>')
                specifications = 'No se encontraron especificaciones'
        } catch (error) {
            await browser.close();
            console.log("Error en especificaciones en el producto " + prodindex + " de Exito, intentando con el siguiente...");
            return null;
        }
        const url = page.url();
        found = true;
        await browser.close();
        // Retorna los datos del producto
        return { title, price, image, description, specifications, url, found, priceint };
    } else {
        let nextpage;
        try{
            nextpage = await page.waitForSelector('span[data-fs-pagination-seguiente="true"]', { timeout: 10000 });
            await browser.close();
            output = "newpage";
            return { nextpage };
        } catch (error) {
            await browser.close();
            return { found };
        }
    }
};

module.exports = { scrapeMercadoLibre, scrapeAlkosto, scrapeOlimpica, scrapeExito};