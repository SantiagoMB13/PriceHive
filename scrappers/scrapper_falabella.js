const { chromium } = require('playwright');

const scrapeFalabella = async (productName) => {
    let index = 0;
    let count = 0;
    pagenum = 0;
    let keepsearching = true;
    let productos = [];
    while (keepsearching == true & count < 5) {
        const product = await getFLproduct(productName, index, pagenum);
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
    const page = await browser.newPage();
    let url = "https://www.falabella.com.co/falabella-co/search?Ntt=product";
    url = url.replace('product', productName.replace(/ /g, '+'));
    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    await page.click('.jsx-1051336967');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.click("button:text('Recomendados')");
    await page.waitForLoadState('domcontentloaded');
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
    await new Promise(resolve => setTimeout(resolve, 2000));
    const items = await page.$$('.jsx-1484439449'); // Obtener todos los productos de la página
    const productNameLowercase = productName.toLowerCase().trim(); // Convertir el nombre del producto a minúsculas
    if (items.length == 0) { //Si no se encuentran productos en la página se detiene la búsqueda
        await browser.close();
        return { found };
    }
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
        await finalFilteredItems[prodindex].click();
        await page.waitForLoadState('domcontentloaded');
        // Extraer los datos del producto

        // Extraer título
        let title;
        try {
            title = await page.$eval('.jsx-1680787435', element => element.innerText.trim(), { timeout: 10000 });
            console.log(title);
        } catch (error) {
            await browser.close();
            console.log("Error en title en el producto " + prodindex + " de Falabella, intentando con el siguiente...");
            return null;
        }

        // Extraer precio
        let price;
        try {
            price = await page.$eval('.copy17', element => element.innerText.trim());
        } catch (error) {
            try {
                price = await page.$eval('.copy12', element => element.innerText.trim());
            } catch (error) {
                await browser.close();
                console.log("Error en price en el producto " + prodindex + " de Falabella, intentando con el siguiente...");
                return null;
            }
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
        return { title, price, image, description, specifications, url, found };
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