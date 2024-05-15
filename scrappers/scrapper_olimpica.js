const { chromium } = require('playwright');

const scrapeOlimpica = async (productName, refPrice) => {
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
    await new Promise(resolve => setTimeout(resolve, 4000));  
    let morebtn = await page.$$(".vtex-button__label.flex.items-center.justify-center.h-100.ph5:has-text('Mostrar Más')", { timeout: 5000 }); //Consigo los botones de mostrar más
    try{
         while(morebtn.length > 0){ //Mientras exista el botn de mostrar más, se da mueve hacia él
            //await morebtn[0].scrollIntoViewIfNeeded(); //El botón se activa cuando se scrollea más abajo de él
            await morebtn[0].click();
            await page.waitForLoadState('domcontentloaded');
            await new Promise(resolve => setTimeout(resolve, 3000));  //Esperar a que cargue bien la página
            morebtn = await page.$$(".vtex-button__label.flex.items-center.justify-center.h-100.ph5:has-text('Mostrar Más')", { timeout: 4000 }); //Verificar si hay más por mostrar   
         }
        } catch (error) {} //Si ya no está el botón, se sigue con el proceso (por si acaso)

    // Seleccionar los productos de la lista
    await page.waitForLoadState('domcontentloaded');  
    await new Promise(resolve => setTimeout(resolve, 3000));                       
    const items = await page.$$('span.vtex-product-summary-2-x-productBrand.vtex-product-summary-2-x-brandName.t-body', { timeout: 15000 });
    const productNameLowercase = productNameori.toLowerCase(); // Convertir el nombre del producto a minúsculas
    // Usar Promise.all para esperar que todas las llamadas asíncronas se completen
    const filteredItems = await Promise.all(items.map(async (element) => {
        let elementTextLowercase = await element.innerText();
        elementTextLowercase = elementTextLowercase.toLowerCase();
        return productNameLowercase.split(' ').every(word =>
            elementTextLowercase.includes(word)
          ) && !elementTextLowercase.includes("reacondicionado"); //Se filtran los productos que contienen el nombre del producto y no son reacondicionados
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

module.exports = scrapeOlimpica;