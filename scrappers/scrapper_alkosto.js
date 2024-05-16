const { chromium } = require('playwright');

const scrapeAlkosto = async (productName) => {
    let index = 0;
    let count = 0;
    let keepsearching = true;
    let productos = [];
    while(keepsearching==true & count < 5) {
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

    const getAlkproduct = async (productName, prodindex) => {
        const browser = await chromium.launch({
            headless: false,
            slowMo: 500
        });
    
        let found = false;
        let productNameori = productName.trim();
        const page = await browser.newPage();
        let link = "https://www.alkosto.com/search?text=product";
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
            return productNameLowercase.split(' ').every(word =>
                elementTextLowercase.includes(word)
              ) && !elementTextLowercase.includes("reacondicionado"); //Se filtran los productos que contienen el nombre del producto y no son reacondicionados
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
            return { title, price, image, description, specifications, url, found };
        }    else {
                await browser.close();
                return { found };
        }
    };

    module.exports = scrapeAlkosto;