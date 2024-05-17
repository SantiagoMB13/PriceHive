const { chromium } = require('playwright');

const scrapeExito = async (productName) => {
    let index = 0;
    let count = 0;
    let keepsearching = true;
    let productos = [];
    while (keepsearching == true & count < 5) {
        const product = await getExproduct(productName, index);
        if (product !== null) {
            if (product.found == false) {
                keepsearching = false;
            } else {
                productos.push(product);
                count++;
            }
        }
        index++;
        if (index - count > 3) {
            keepsearching = false;
        }
    }
    return productos;
};

const getExproduct = async (productName, prodindex) => {
    const browser = await chromium.launch({
        headless: false,
        slowMo: 2000
    });
    let found = false;
    const page = await browser.newPage()
    const baseUrl = "https://www.exito.com/s";
    const query = productName.split(' ').join('+');
    const url = `${baseUrl}?q=${query}`;
    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('h3[data-fs-product-card-title="true"]');
        await page.waitForSelector('h3[data-fs-product-card-title="true"]', { timeout: 15000 });
        await new Promise(resolve => setTimeout(resolve, 2000));
        const items = await page.$$('h3[data-fs-product-card-title="true"]'); // Obtener todos los productos de la página
        const productNameLowercase = productName.toLowerCase().trim(); // Convertir el nombre del producto a minúsculas
        
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
            !elementTextLowercase.includes("cargador") && !elementTextLowercase.includes("charger") && !elementTextLowercase.includes("cable") && !elementTextLowercase.includes("repuesto") && //Se filtran los productos que no sean cargadores o respuestos
            !elementTextLowercase.includes("forro") && !elementTextLowercase.includes("case") && !elementTextLowercase.includes("estuche") && !elementTextLowercase.includes("protector") && !elementTextLowercase.includes("templado") && !elementTextLowercase.includes("carcasa"); //Se filtran los productos que no sean forros o protectores
        }));
        
        // Filtrar los elementos basados en el resultado de las llamadas asíncronas
        const finalFilteredItems = items.filter((element, index) => filteredItems[index]);
    await page.waitForLoadState('domcontentloaded');
    if (finalFilteredItems.length > prodindex) {
                await finalFilteredItems[prodindex].click();
                await page.waitForLoadState('domcontentloaded');
                await new Promise(resolve => setTimeout(resolve, 2000));
        // Extraer los datos del producto
        // Extraer título
        let title;
        try {
            title = await page.$eval('.product-title_product-title__heading___mpLA', element => element.innerText.trim());
        } catch (error) {
            await browser.close();
            console.log("Error en title en el producto " + prodindex + " de Exito, intentando con el siguiente...");
            return null;
        }

        // Extraer precio
        let price;
        try {
            price = await page.$eval('.ProductPrice_container__price__XmMWA', element => element.innerText.trim());
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
            description = 'No se encontró descripción'; //Si no se encuentra descripción, se asigna un mensaje de error
        }
        let specifications;
        try {
            specifications = await page.$$eval('div[data-fs-specification-gray-block="true"]', elements => {
                // Extraer las especificaciones del producto
                return elements.map(element => {
                    const title = element.querySelector('p[data-fs-title-specification="true"]').innerText.trim();
                    const text = element.querySelector('p[data-fs-text-specification="true"]').innerText.trim();
                    return `<li>${title}: ${text}</li>`;
                }).join('');
            });

            // Si no se encontraron especificaciones, se asigna un mensaje de error
            if(specifications == '<ul></ul>'){
                specifications = 'No se encontraron especificaciones';
            }
            specifications = `<ul>${specifications}</ul>`;
            if(specifications == '<ul><li>Referencia: SIN REF</li></ul>'){
                specifications = 'No se encontraron especificaciones';
            }   
        } catch (error) {
            await browser.close();
            console.log("Error en especificaciones en el producto " + prodindex + " de Exito, intentando con el siguiente...");
            return null;
        }
        const url = page.url();
        found = true;
        await browser.close();
        // Retorna los datos del producto
        return { title, price, image, description, specifications, url, found };
    } else {
        await browser.close();
        return { found };
    }
};

module.exports = scrapeExito;