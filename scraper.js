const { query } = require('express');
const { chromium } = require('playwright');


//Funciones main de scrapping
const scrapeMercadoLibre = async (productName) => {
    let index = 0;
    let count = 0;
    let keepsearching = true;
    let productos = [];
    while (keepsearching == true & count < 3) {
        const product = await getMLproduct(productName, index);
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

const scrapeAlkosto = async (productName) => {
    let index = 0;
    let count = 0;
    let keepsearching = true;
    let productos = [];
    while (keepsearching == true & count < 3) {
        const product = await getAlkproduct(productName, index);
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
const scrapeExito = async (productName) => {
    let index = 0;
    let count = 0;
    let keepsearching = true;
    let productos = [];
    while (keepsearching == true & count < 3) {
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
        if (index - count > 4) {
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
    productName = productName.replace(/ /g, "-");
    const page = await browser.newPage();
    let link = "https://listado.mercadolibre.com.co/product_OrderId_PRICE_NoIndex_True";
    let nuevoLink = link.replace("product", productName);
    await page.goto(nuevoLink);
    await page.waitForLoadState('domcontentloaded');
    try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Filtrar por productos nuevos
        const filtronuevo = await page.waitForSelector("span.ui-search-filter-name:text('Nuevo')", { timeout: 8000 });
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
        try {
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
            price = "$" + price;
        } catch (error) {
            await browser.close();
            console.log("Error en el producto " + prodindex + " de Mercado Libre, intentando con el siguiente...");
            return null;
        }

        // Imagen
        let image;
        try {
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
        } catch (error) { }

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
            try {
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
    } else {
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
    let link = "https://www.alkosto.com/search?text=product&sort=price-asc";
    productName = productName.replace(/ /g, "+");
    let nuevoLink = link.replace("product", productName);
    await page.goto(nuevoLink, { timeout: 60000 }); // Aumentamos el tiempo de espera a 60 segundos
    await page.waitForLoadState('domcontentloaded');

    // Seleccionar el primer producto de la lista
    await new Promise(resolve => setTimeout(resolve, 2500));
    const items = await page.$$('.product__item__top__title.js-algolia-product-click.js-algolia-product-title', { timeout: 4000 });

    if (items.length > prodindex) {
        try {
            await items[prodindex].click();
            await new Promise(resolve => setTimeout(resolve, 6000));
            await page.waitForLoadState('domcontentloaded');
        } catch (error) {
            console.log(error);
        }
        // Extraer los datos del producto

        // Título
        let title;
        try {
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
        try {
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
            try {
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
    } else {
        await browser.close();
        return { found };
    }
};
const getExproduct = async (productName, prodindex) => {
    const browser = await chromium.launch({
        headless: false,
        slowMo: 500
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
    const items = await page.$$('h3[data-fs-product-card-title="true"]');
    if (items.length > prodindex) {
        await items[prodindex].click();
        await page.waitForLoadState('networkidle');
        // Extraer los datos del producto

        // Título
        let title;
        try {
            title = await page.$eval('.product-title_product-title__heading___mpLA', element => element.innerText.trim(), { timeout: 10000 });
        } catch (error) {
            await browser.close();
            console.log("Error en title en el producto " + prodindex + " de Exito, intentando con el siguiente...");
            return null;
        }

        // Precio
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
            console.log("Error en description en el producto " + prodindex + " de Mercado Libre, intentando con el siguiente...");
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
        await browser.close();
        return { found };
    }
};
module.exports = { scrapeMercadoLibre, scrapeAlkosto, scrapeExito };