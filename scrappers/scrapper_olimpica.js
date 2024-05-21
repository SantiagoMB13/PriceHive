const { chromium } = require('playwright');
const { JSDOM } = require('jsdom');

const scrapeOlimpica = async (productName) => {
    let index = 0;
    let count = 0;
    let keepsearching = true;
    let productos = [];
    while(keepsearching==true & count < 5) {
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
        if (productos.length == 0){
            console.log("No se encontraron productos en Olímpica");
        }
        return productos;
    };

const getOliproduct = async (productName, prodindex) => {
    const browser = await chromium.launch({
        headless: true,
        slowMo: 500
    });
   let found = false;
   const productNameori = productName.trim();
    const page = await browser.newPage();
    let link = "https://www.olimpica.com/product"; //Navegar a olimpica, ya aplicando orden por precio
    productName = productName.replace(/ /g, "%20");
    let nuevoLink = link.replace("product", productName);
    await page.goto(nuevoLink, { timeout: 60000 }); // Tiempo de espera de 60 segundos porque la pagina es pesada
    await page.waitForLoadState('domcontentloaded');
    let morebtn;
    try{
        await page.waitForSelector(".vtex-button__label.flex.items-center.justify-center.h-100.ph5:has-text('Mostrar Más')", { timeout: 18000 }); //Esperar a que cargue bien la página
        morebtn = await page.$$(".vtex-button__label.flex.items-center.justify-center.h-100.ph5:has-text('Mostrar Más')"); 
    } catch(error) {} //Si no se encuentra el botón, se sigue con el proceso  
    try{
         while(morebtn.length > 0){ //Mientras exista el botn de mostrar más, se da mueve hacia él
            await morebtn[0].click();
            await page.waitForLoadState('domcontentloaded');
            await page.waitForSelector(".vtex-button__label.flex.items-center.justify-center.h-100.ph5:has-text('Mostrar Más')", { timeout: 7500 });  //Esperar a que cargue bien la página
            morebtn = await page.$$(".vtex-button__label.flex.items-center.justify-center.h-100.ph5:has-text('Mostrar Más')"); //Verificar si hay más por mostrar   
         }
        } catch (error) {} //Si ya no está el botón, se sigue con el proceso (por si acaso)

    // Seleccionar los productos de la lista
    await page.waitForLoadState('domcontentloaded');  
    await new Promise(resolve => setTimeout(resolve, 4000));                       
    const items = await page.$$('span.vtex-product-summary-2-x-productBrand.vtex-product-summary-2-x-brandName.t-body', { timeout: 15000 });
    const productNameLowercase = productNameori.toLowerCase(); // Convertir el nombre del producto a minúsculas
    // Usar Promise.all para esperar que todas las llamadas asíncronas se completen
    const filteredItems = await Promise.all(items.map(async (element) => {
        let elementTextLowercase = await element.innerText();
        elementTextLowercase = elementTextLowercase.toLowerCase();
        const productWords = productNameLowercase.split(' ');
        const wordBoundaryCheck = (word, text) => {
            const regex = new RegExp(`\\b${word}\\b`, 'i');
            return regex.test(text);
        };
        return productWords.every(word => wordBoundaryCheck(word, elementTextLowercase)) && !elementTextLowercase.includes("reacondicionado") && //Se filtran los productos que contienen el nombre del producto y no son reacondicionados
        !elementTextLowercase.includes("cargador") && !elementTextLowercase.includes("charger") && !elementTextLowercase.includes("cable") && !elementTextLowercase.includes("repuesto") && !elementTextLowercase.includes("adaptador") &&//Se filtran los productos que no sean cargadores o respuestos
        !elementTextLowercase.includes("forro") && !elementTextLowercase.includes("case") && !elementTextLowercase.includes("estuche") && !elementTextLowercase.includes("protector") && !elementTextLowercase.includes("templado") && !elementTextLowercase.includes("carcasa"); //Se filtran los productos que no sean forros o protectores
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
            await page.waitForSelector('.vtex-store-components-3-x-productNameContainer.vtex-store-components-3-x-productNameContainer--quickview.mv0.t-heading-4', { timeout: 20000 });
            title = await page.$eval('.vtex-store-components-3-x-productNameContainer.vtex-store-components-3-x-productNameContainer--quickview.mv0.t-heading-4', element => element.innerText.trim()); 
        } catch (error) {
            await browser.close();
            console.log("Error en el producto " + prodindex + " de Olimpica, intentando con el siguiente...");
            return null;
        }

        // Extraer precio
        let price;
        try {
            await page.waitForSelector('.olimpica-fractional-selling-0-x-fractional_selling__wrapper .vtex-product-price-1-x-sellingPrice--hasListPrice--dynamicF', { timeout: 20000 });
            price = await page.$eval('.olimpica-fractional-selling-0-x-fractional_selling__wrapper .vtex-product-price-1-x-sellingPrice--hasListPrice--dynamicF', element => element.innerText.trim());
            price = price.replaceAll(/\s/g, '');
        } catch (error) {
            await browser.close();
            console.log("Error en el producto " + prodindex + " de Olimpica, intentando con el siguiente...");
            return null;
        }

        // Imagen
        let image;
        try{
            await page.waitForSelector('.vtex-store-components-3-x-productImageTag.vtex-store-components-3-x-productImageTag--main', { timeout: 20000 });
            image = await page.$eval('.vtex-store-components-3-x-productImageTag.vtex-store-components-3-x-productImageTag--main', element => element.getAttribute('src'));
            image = "<img src='" + image + "' alt='Imagen del producto'>";
        } catch (error) {
                await browser.close();
                console.log("Error en el producto " + prodindex + " de Olimpica, intentando con el siguiente...");
                return null;
            }

        //Descripción
        let description;
        try {
            await page.waitForSelector('.vtex-store-components-3-x-content.h-auto', { timeout: 20000 });
            description = await page.$eval('.vtex-store-components-3-x-content.h-auto', element => element.innerHTML);
        } catch (error) {
            await browser.close();
            console.log("Error en el producto " + prodindex + " de Olimpica, intentando con el siguiente...");
            return null;
        }

        // Extraer especificaciones
        let specifications;
        try { //Tratar de mostrar las especificaciones en la página
            await page.waitForSelector(".vtex-disclosure-layout-1-x-trigger.vtex-disclosure-layout-1-x-trigger--product-specifications.vtex-disclosure-layout-1-x-trigger--hidden.vtex-disclosure-layout-1-x-trigger--product-specifications--hidden", { timeout: 10000 });
            const filtronuevo = await page.waitForSelector(".vtex-disclosure-layout-1-x-trigger.vtex-disclosure-layout-1-x-trigger--product-specifications.vtex-disclosure-layout-1-x-trigger--hidden.vtex-disclosure-layout-1-x-trigger--product-specifications--hidden");
            await filtronuevo.click(); 
        } catch (error) { 
            await browser.close();
            console.log("Error en el producto " + prodindex + " de Olimpica, intentando con el siguiente...");
            return null;
        }  

        try { //Tratar de obtener las especificaciones que conseguimos mostrar en la página
            await page.waitForSelector('.vtex-store-components-3-x-specificationsTable.vtex-store-components-3-x-specificationsTable--product-specifications.w-100.bg-base.border-collapse', { timeout: 10000 });
            specifications = await page.$eval('.vtex-store-components-3-x-specificationsTable.vtex-store-components-3-x-specificationsTable--product-specifications.w-100.bg-base.border-collapse', element => element.innerHTML);
            specifications = "<table>" + specifications + "</table>";
            specifications = tableToUl(specifications);
        } catch (error) {
                await browser.close();
                console.log("Error en el producto " + prodindex + " de Olimpica, intentando con el siguiente...");
                return null;           
        }
        const url = page.url();
        const seller = "Olímpica"
        found = true;
        await browser.close();
        // Retorna los datos del producto
        return { title, price, image, description, specifications, url, found, seller };
    }    else {
            await browser.close();
            return { found }; 
    }
};

function tableToUl(tableHtml) {
    // Crear un documento en memoria usando JSDOM
    const dom = new JSDOM(`<!DOCTYPE html><body>${tableHtml}</body>`);
    const document = dom.window.document;

    // Seleccionar la tabla y las filas
    const table = document.querySelector('table');
    const rows = table.getElementsByTagName('tr');

    // Crear el elemento de lista desordenada
    const ul = document.createElement('ul');

    // Recorrer cada fila de la tabla
    for (let i = 0; i < rows.length; i++) {
        const li = document.createElement('li');
        const cells = rows[i].getElementsByTagName('td');
        let rowContent = '';

        // Concatenar el contenido de cada celda en una cadena de texto
        for (let j = 0; j < cells.length; j++) {
            rowContent += cells[j].textContent;
            if (j < cells.length - 1) {
                rowContent += ': ';  // Separador entre celdas
            }
        }

        // Asignar el contenido concatenado al elemento <li>
        li.textContent = rowContent;
        ul.appendChild(li);
    }

    // Serializar el <ul> a una cadena HTML
    return ul.outerHTML;
}

module.exports = scrapeOlimpica;