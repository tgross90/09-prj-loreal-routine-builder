/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineButton = document.getElementById("generateRoutine");

/* Set to track selected products */
const selectedProducts = new Set();

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card" data-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
    </div>
  `
    )
    .join("");

  // Add click event listeners to product cards
  const productCards = document.querySelectorAll(".product-card");
  productCards.forEach((card) => {
    card.addEventListener("click", () =>
      toggleProductSelection(card, products)
    );
  });
}

/* Toggle product selection */
function toggleProductSelection(card, products) {
  const productId = card.getAttribute("data-id");
  const product = products.find((p) => p.id == productId); // use loose equality

  if (selectedProducts.has(product)) {
    selectedProducts.delete(product);
    card.classList.remove("selected");
  } else {
    selectedProducts.add(product);
    card.classList.add("selected");
  }

  updateSelectedProducts();
}

/* Update the "Selected Products" section */
function updateSelectedProducts() {
  if (selectedProducts.size === 0) {
    selectedProductsList.innerHTML = `<p>No products selected.</p>`;
  } else {
    selectedProductsList.innerHTML = Array.from(selectedProducts)
      .map(
        (product) => `
      <div class="selected-product" data-id="${product.id}">
        <img src="${product.image}" alt="${product.name}" class="selected-product-image">
        <span>${product.name}</span>
        <button class="remove-btn" data-id="${product.id}">Remove</button>
      </div>
    `
      )
      .join("");

    // Add click event listeners to remove buttons
    const removeButtons = document.querySelectorAll(".remove-btn");
    removeButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent the click from bubbling up to the card
        const productId = e.target.getAttribute("data-id");
        const product = Array.from(selectedProducts).find(
          (p) => p.id === productId
        );
        selectedProducts.delete(product);
        updateSelectedProducts();

        // Unmark the product in the grid
        const productCard = document.querySelector(
          `.product-card[data-id="${productId}"]`
        );
        if (productCard) {
          productCard.classList.remove("selected");
        }
      });
    });
  }
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* Generate routine when the button is clicked */
generateRoutineButton.addEventListener("click", async () => {
  // Convert selected products to an array of product names
  const selectedProductNames = Array.from(selectedProducts).map(
    (product) => product.name
  );

  if (selectedProductNames.length === 0) {
    chatWindow.innerHTML += `
      <div class="chat-message error-message">
        Please select at least one product to generate a routine.
      </div>
    `;
    return;
  }

  try {
    // Send the selected products to the Cloudflare Worker API
    const response = await fetch(
      "https://loreal-worker.ttaylor-gross.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ products: selectedProductNames }),
      }
    );

    // Check if the response is successful
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Parse the JSON response
    const data = await response.json();

    // Display the generated routine in the "Let's Build Your Routine" section
    chatWindow.innerHTML = `
      <div class="chat-message bot-message">
        <strong>Your Routine:</strong><br>${data.routine}
      </div>
    `;
  } catch (error) {
    console.error("Failed to generate routine:", error);
    chatWindow.innerHTML = `
      <div class="chat-message error-message">
        Failed to generate routine. Please try again later.
      </div>
    `;
  }
});

/* Chat form submission handler - fetch routine suggestions from API */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get the user's input from the chat form
  const userInput = e.target.elements["userInput"].value;

  try {
    // Send the user's input to the API
    const response = await fetch(
      "https://loreal-worker.ttaylor-gross.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: userInput }),
      }
    );

    // Check if the response is successful
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Parse the JSON response
    const data = await response.json();

    // Display the API's response in the chat window
    chatWindow.innerHTML += `
      <div class="chat-message user-message">${userInput}</div>
      <div class="chat-message bot-message">${data.response}</div>
    `;
  } catch (error) {
    console.error("Failed to fetch routine suggestions:", error);
    chatWindow.innerHTML += `
      <div class="chat-message error-message">
        Failed to fetch routine suggestions. Please try again later.
      </div>
    `;
  }

  // Clear the chat form input
  e.target.reset();
});
