
//Klientská logika košíku
export async function addToCart(id, name, price, quantity) {
    const product = { id, name, price, quantity: parseInt(quantity, 10) };

    const response = await fetch("/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product)
    });

    if (response.ok) {
        alert("Produkt přidán do košíku!");
    } else {
        alert("Chyba při přidávání produktu.");
    }
}

export async function removeFromCart(id) {
    const response = await fetch("/cart/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
    });

    if (response.ok) {
        alert("Produkt odstraněn z košíku!");
        await loadCart();
    } else {
        alert("Chyba při odstraňování produktu.");
    }
}

export async function loadCart() {
    try {
        const response = await fetch("/cart");

        if (!response.ok) {
            throw new Error(`Chyba načítání: ${response.statusText}`);
        }

        const cart = await response.json();
        console.log("Načtený košík:", cart);

        const cartItems = document.getElementById("cart_items");
        const clearCartBtn = document.getElementById("clear_cart_btn");

        if (cart.length === 0) {
            cartItems.innerHTML = "<p>Košík je prázdný.</p>";
            clearCartBtn.style.display = "none";
        } else {
            cartItems.innerHTML = cart.map(product => `
                <div class="cart-product">
                    <h3>${product.name}</h3>
                    <p>Cena: ${product.price} Kč</p>
                    <label for="quantity-${product.id}">Množství:</label>
                    <input type="number" id="quantity-${product.id}" min="1" value="${product.quantity}">
                    <button onclick="updateCartQuantity('${product.id}', document.getElementById('quantity-${product.id}').value)">Aktualizovat množství</button>
                    <button class="remove-from-cart" onclick="removeFromCart('${product.id}')">Odebrat</button> <!-- Opravené tlačítko -->
                </div>
            `).join('');

            clearCartBtn.style.display = "block";
        }

        updateTotalPrice(cart);
    } catch (error) {
        console.error("Chyba při načítání košíku:", error);
    }
}

export async function updateCartQuantity(id, quantity) {
    const response = await fetch("/cart/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, quantity: parseInt(quantity, 10) })
    });

    if (response.ok) {
        alert("Množství aktualizováno!");
        await loadCart();
    } else {
        alert("Chyba při aktualizaci množství.");
    }
}

export function updateTotalPrice(cart) {
    let totalPrice = cart.reduce((sum, product) => sum + product.price * product.quantity, 0);
    const totalPriceElement = document.getElementById("total_price");
    const totalPriceContainer = totalPriceElement.parentElement;
    const checkoutBtn = document.getElementById("checkout_btn");

    totalPriceElement.textContent = totalPrice;

    if (cart.length === 0) {
        totalPriceContainer.style.display = "none";
        checkoutBtn.style.display = "none";
    } else {
        totalPriceContainer.style.display = "block";
        checkoutBtn.style.display = "block";
    }
}

export async function clearCart() {
    const response = await fetch("/cart/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
    });

    if (response.ok) {
        alert("Košík byl vyprázdněn!");
        await loadCart(); // Znovu načti košík, aby se aktualizoval
    } else {
        alert("Chyba při vyprázdnění košíku.");
    }
}

// Přidáme funkci do globálního objektu, aby byla dostupná v onclick
window.clearCart = clearCart;
window.updateCartQuantity = updateCartQuantity;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
