const { chromium } = require('playwright');

const scrapeFalabella = async (productName, refPrice) => {
    let index = 0;
    let count = 0;
    pagenum = 0;
    let keepsearching = true;
    let productos = [];
    while (keepsearching == true & count < 3) {
        const product = await getFLproduct(productName, index, pagenum, refPrice);
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
const getFLproduct = async (productName, prodindex, pagenum) => {
    const browser = await chromium.launch({
        headless: false,
        slowMo: 2000
    });
    let found = false;
    const page = await browser.newPage()
    const url = "https://www.falabella.com.co/falabella-co";
    await page.goto(url)
    await page.waitForLoadState('domcontentloaded')
    await page.click('.Search-module_search__3pmGP')
    await page.keyboard.type(productName)
    await page.keyboard.press('Enter')
    await page.waitForLoadState('domcontentloaded')
    await page.click('.jsx-1051336967')
    await page.click("button:text('Precio de menor a mayor')")
    await page.waitForLoadState('domcontentloaded')
    await page.click("h2:text('Precio')")
    await page.keyboard.press('Tab')
    await page.keyboard.type(`${refPrice}`)
    await page.keyboard.press('Enter')
    await page.click("button:text('Filtrar')")
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('.jsx-1484439449');
    for (let i = 0; i < pagenum; i++) { //Movernos de pagina segun se necesite
        nextpage = await page.waitForSelector('#testId-pagination-bottom-arrow-right', { timeout: 10000 }); //Esperar a que cargue el botón de siguiente página
        nextpagebtns = await page.$$('#testId-pagination-bottom-arrow-right'); //Obtener todos los botones de siguiente página
        if (nextpagebtns.length > 1) {
            await nextpagebtns[1].click(); //Clic en el botón de siguiente página
        } else {
            await nextpage.click(); //Clic en el botón de siguiente página
        }
        await page.waitForLoadState('domcontentloaded');
    }
    await page.waitForSelector('.jsx-1484439449');
    const items = await page.$$('.jsx-1484439449'); // Obtener todos los productos de la página
    const productNameLowercase = productName.toLowerCase().trim(); // Convertir el nombre del producto a minúsculas

    // Usar Promise.all para esperar que todas las llamadas asíncronas se completen
    const filteredItems = await Promise.all(items.map(async (element) => {
        let elementTextLowercase = await element.innerText();
        elementTextLowercase = elementTextLowercase.toLowerCase();
        return elementTextLowercase.includes(productNameLowercase) && !elementTextLowercase.includes("reacondicionado");
    }));

    // Filtrar los elementos basados en el resultado de las llamadas asíncronas
    const finalFilteredItems = items.filter((element, index) => filteredItems[index]);
    await page.waitForLoadState('networkidle');
    if (finalFilteredItems.length > prodindex) {
        await page.waitForLoadState('networkidle');
        await finalFilteredItems[prodindex].click();
        await page.waitForLoadState('networkidle');
        // Extraer los datos del producto

        // Extraer título
        let title;
        try {
            title = await page.$eval('.jsx-1680787435', element => element.innerText.trim(), { timeout: 10000 });
        } catch (error) {
            await browser.close();
            console.log("Error en title en el producto " + prodindex + " de Falabella, intentando con el siguiente...");
            return null;
        }

        // Extraer precio
        let price;
        try {
            price = await page.$eval('.copy17', element => element.innerText.trim());
            priceint = parseInt(price.replace('$', '').replaceAll('.', ''));
        } catch (error) {
            await browser.close();
            console.log("Error en price en el producto " + prodindex + " de Falabella, intentando con el siguiente...");
            return null;
        }

        // Imagen
        let image;
        try {
            image = await page.$eval('.jsx-2657190317 img', element => element.src);
            image = "<img src='" + image + "' alt='Imagen del producto'>";
        } catch (error) {
            await browser.close();
            console.log("Error en image en el producto " + prodindex + " de Falabella, intentando con el siguiente...");
            return null;
        }

        //Descripción
        let description;
        try {
            description = await page.$eval('.fb-product-information-tab__copy', element => element.innerText.trim());
        } catch (error) {
            await browser.close();
            console.log("Error en description en el producto " + prodindex + " de Falabella, intentando con el siguiente...");
            return null;
        }
        // Especificaciones
        let specifications;
        try {
            specifications = await page.$$eval('tr.jsx-960159652', elements => {
                // Map each specification div to extract title and text
                return elements.map(element => {
                    const title = element.querySelector('td.jsx-960159652.property-name').innerText.trim();
                    const text = element.querySelector('td.jsx-960159652.property-value').innerText.trim();
                    return `<li>${title}: ${text}</li>`;
                }).join('');
            });
            
            // Format the extracted specifications as an unordered list
            if (specifications == '<ul></ul>')
                specifications = 'No se encontraron especificaciones'
            specifications = `<ul>${specifications}</ul>`;
            if (specifications == '<ul><li>Referencia: SIN REF</li></ul>')
                specifications = 'No se encontraron especificaciones'
        } catch (error) {
            await browser.close();
            console.log("Error en especificaciones en el producto " + prodindex + " de Falabella, intentando con el siguiente...");
            return null;
        }
        const url = page.url();
        found = true;
        await browser.close();
        // Retorna los datos del producto
        return { title, price, image, description, specifications, url, found, priceint };
    } else {
        let nextpage;
        try {
            nextpage = await page.waitForSelector('#testId-pagination-bottom-arrow-right', { timeout: 10000 });
            await browser.close();
            output = "newpage";
            return { nextpage };
        } catch (error) {
            await browser.close();
            return { found };
        }
    }
};
module.exports = scrapeFalabella;