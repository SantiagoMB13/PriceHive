function renderSearchResults(productName, order) {
    const params = {
        productName: productName,
        order: order
    };

    // Realizamos la solicitud POST usando fetch
    fetch('/search', {
         method: 'POST',
         headers: {
             'Content-Type': 'application/json'
         },
         body: JSON.stringify(params) // Convertimos el objeto de parámetros a JSON y lo enviamos en el cuerpo
     })
     .then(response => {
         if (response.ok) {
             window.location.href = '/search';
         } else {
            window.location.href = '/error';
         }
     })
     .catch(error => {
         console.error('Hubo un error al cargar la información de los productos:', error);
     });
}

function renderSearchP2Results(productName, order) {
    const params = {
        productName: productName,
        order: order
    };

    // Realizamos la solicitud POST usando fetch
    fetch('/search-p2', {
         method: 'POST',
         headers: {
             'Content-Type': 'application/json'
         },
         body: JSON.stringify(params) // Convertimos el objeto de parámetros a JSON y lo enviamos en el cuerpo
     })
     .then(response => {
         if (response.ok) {
             window.location.href = '/search-p2';
         } else {
            window.location.href = '/error';
         }
     })
     .catch(error => {
         console.error('Hubo un error al cargar la información de los productos:', error);
     });
}

function renderSearchP3Results(productName, order) {
    const params = {
        productName: productName,
        order: order
    };

    // Realizamos la solicitud POST usando fetch
    fetch('/search-p3', {
         method: 'POST',
         headers: {
             'Content-Type': 'application/json'
         },
         body: JSON.stringify(params) // Convertimos el objeto de parámetros a JSON y lo enviamos en el cuerpo
     })
     .then(response => {
         if (response.ok) {
             window.location.href = '/search-p3';
         } else {
            window.location.href = '/error';
         }
     })
     .catch(error => {
         console.error('Hubo un error al cargar la información de los productos:', error);
     });
}

function navigateToMain() {
    window.location.href = '/';
}

function navigateToP1() {
    window.location.href = '/search';
}

function navigateToP2() {
    window.location.href = '/search-p2';
}

function navigateToP3() {
    window.location.href = '/search-p3';
}


