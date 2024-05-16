const { chromium } = require('playwright');

const scrapeMercadoLibre = async (productName) => {
    let index = 0;
    let count = 0;
    let keepsearching = true;
    let productos = [];
    while(keepsearching==true & count < 5) { //Se buscan 3 productos siempre que haya disponibles
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

    const getMLproduct = async (productName, prodindex) => {
        const browser = await chromium.launch({
            headless: false,
            slowMo: 500
        });
    
       let found = false;
       let productNameori = productName.trim();
       productName = productName.replace(/ /g, "-");//Reemplazar espacios por guiones para la URL
       const page = await browser.newPage();
       let link = "https://listado.mercadolibre.com.co/product"; //Navegar a mercado libre, ya aplicando orden por precio
       let nuevoLink = link.replace("product", productName);
       await page.goto(nuevoLink);
       await page.waitForLoadState('domcontentloaded');
        try {
            await new Promise(resolve => setTimeout(resolve, 2500));
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
            return productNameLowercase.split(' ').every(word =>
                elementTextLowercase.includes(word)
              ) && !elementTextLowercase.includes("reacondicionado");
        }));
        // Filtrar los elementos basados en el resultado de las llamadas asíncronas
        const finalFilteredItems = items.filter((element, index) => filteredItems[index]);
        //Seleccionar elementos válidos según el índice
        if (finalFilteredItems.length > prodindex) {
            await finalFilteredItems[prodindex].click();
            await page.waitForLoadState('domcontentloaded');
            await new Promise(resolve => setTimeout(resolve, 2500));
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
            return { title, price, image, description, specifications, url, found };
        }    else {
                await browser.close();
                return { found }; //Si no hay productos por ver, se retorna un objeto con el atributo found en false
        }
    };

    module.exports = scrapeMercadoLibre;