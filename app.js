// Wolfgang - Recipe Declutterer App

// ============================================================================
// Database Module - IndexedDB for local storage
// ============================================================================
const DB = {
    name: 'WolfgangDB',
    version: 1,
    db: null,

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.name, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains('recipes')) {
                    const recipeStore = db.createObjectStore('recipes', { keyPath: 'id', autoIncrement: true });
                    recipeStore.createIndex('url', 'url', { unique: true });
                    recipeStore.createIndex('dateAdded', 'dateAdded', { unique: false });
                }

                if (!db.objectStoreNames.contains('shopping')) {
                    db.createObjectStore('shopping', { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    },

    async addRecipe(recipe) {
        const tx = this.db.transaction(['recipes'], 'readwrite');
        const store = tx.objectStore('recipes');
        recipe.dateAdded = Date.now();

        try {
            const request = store.add(recipe);
            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            throw error;
        }
    },

    async getRecipes() {
        const tx = this.db.transaction(['recipes'], 'readonly');
        const store = tx.objectStore('recipes');
        const request = store.getAll();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getRecipe(id) {
        const tx = this.db.transaction(['recipes'], 'readonly');
        const store = tx.objectStore('recipes');
        const request = store.get(id);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async deleteRecipe(id) {
        const tx = this.db.transaction(['recipes'], 'readwrite');
        const store = tx.objectStore('recipes');
        const request = store.delete(id);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async addToShopping(items) {
        const tx = this.db.transaction(['shopping'], 'readwrite');
        const store = tx.objectStore('shopping');

        for (const item of items) {
            store.add({ text: item, checked: false });
        }

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    async getShoppingList() {
        const tx = this.db.transaction(['shopping'], 'readonly');
        const store = tx.objectStore('shopping');
        const request = store.getAll();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async updateShoppingItem(id, checked) {
        const tx = this.db.transaction(['shopping'], 'readwrite');
        const store = tx.objectStore('shopping');
        const request = store.get(id);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const item = request.result;
                item.checked = checked;
                const updateRequest = store.put(item);
                updateRequest.onsuccess = () => resolve();
                updateRequest.onerror = () => reject(updateRequest.error);
            };
            request.onerror = () => reject(request.error);
        });
    },

    async clearShopping() {
        const tx = this.db.transaction(['shopping'], 'readwrite');
        const store = tx.objectStore('shopping');
        const request = store.clear();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async clearAll() {
        const tx = this.db.transaction(['recipes', 'shopping'], 'readwrite');
        const recipeStore = tx.objectStore('recipes');
        const shoppingStore = tx.objectStore('shopping');

        recipeStore.clear();
        shoppingStore.clear();

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
};

// ============================================================================
// Recipe Scraper - Fetch and parse Schema.org JSON-LD
// ============================================================================
const RecipeScraper = {
    corsProxy: 'https://corsproxy.io/?',

    async fetchRecipe(url) {
        try {
            const response = await fetch(this.corsProxy + encodeURIComponent(url));

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const html = await response.text();
            return this.parseRecipe(html, url);
        } catch (error) {
            console.error('Fetch error:', error);
            throw new Error('Failed to fetch recipe. The site might be blocking requests or the URL is invalid.');
        }
    },

    parseRecipe(html, sourceUrl) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');

        for (const script of jsonLdScripts) {
            try {
                const data = JSON.parse(script.textContent);
                const recipe = this.findRecipeInJsonLd(data);

                if (recipe) {
                    return this.normalizeRecipe(recipe, sourceUrl);
                }
            } catch (error) {
                console.error('Failed to parse JSON-LD:', error);
            }
        }

        throw new Error('No recipe found. This site might not use Schema.org markup.');
    },

    findRecipeInJsonLd(data) {
        if (Array.isArray(data)) {
            for (const item of data) {
                const recipe = this.findRecipeInJsonLd(item);
                if (recipe) return recipe;
            }
        } else if (data && typeof data === 'object') {
            if (data['@type'] === 'Recipe') {
                return data;
            }
            if (data['@graph']) {
                return this.findRecipeInJsonLd(data['@graph']);
            }
        }
        return null;
    },

    normalizeRecipe(data, sourceUrl) {
        const recipe = {
            name: data.name || 'Untitled Recipe',
            url: sourceUrl,
            description: data.description || '',
            image: this.extractImage(data.image),
            prepTime: data.prepTime || '',
            cookTime: data.cookTime || '',
            totalTime: data.totalTime || '',
            recipeYield: data.recipeYield || '',
            ingredients: this.extractIngredients(data.recipeIngredient),
            instructions: this.extractInstructions(data.recipeInstructions)
        };

        return recipe;
    },

    extractImage(image) {
        if (!image) return '';
        if (typeof image === 'string') return image;
        if (Array.isArray(image)) return image[0];
        if (image.url) return image.url;
        return '';
    },

    extractIngredients(ingredients) {
        if (!ingredients) return [];
        if (Array.isArray(ingredients)) return ingredients;
        return [ingredients];
    },

    extractInstructions(instructions) {
        if (!instructions) return [];

        const steps = [];

        if (typeof instructions === 'string') {
            return [instructions];
        }

        if (Array.isArray(instructions)) {
            for (const instruction of instructions) {
                if (typeof instruction === 'string') {
                    steps.push(instruction);
                } else if (instruction.text) {
                    steps.push(instruction.text);
                } else if (instruction['@type'] === 'HowToSection') {
                    if (instruction.itemListElement) {
                        for (const item of instruction.itemListElement) {
                            if (item.text) steps.push(item.text);
                        }
                    }
                } else if (instruction['@type'] === 'HowToStep') {
                    if (instruction.text) steps.push(instruction.text);
                }
            }
        }

        return steps;
    }
};

// ============================================================================
// UI Controller - Manage views and user interactions
// ============================================================================
const UI = {
    currentView: 'home',
    currentRecipeId: null,

    init() {
        this.setupNavigation();
        this.setupEventListeners();
        this.loadShoppingList();
    },

    setupNavigation() {
        const navButtons = {
            'home-btn': 'home',
            'recipes-btn': 'recipes',
            'shopping-btn': 'shopping',
            'settings-btn': 'settings'
        };

        Object.entries(navButtons).forEach(([btnId, viewName]) => {
            document.getElementById(btnId).addEventListener('click', () => {
                this.showView(viewName);
            });
        });

        document.getElementById('back-btn').addEventListener('click', () => {
            this.showView('recipes');
        });
    },

    setupEventListeners() {
        document.getElementById('fetch-btn').addEventListener('click', () => this.handleFetchRecipe());
        document.getElementById('recipe-url').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleFetchRecipe();
        });

        document.getElementById('export-recipes-btn').addEventListener('click', () => this.exportRecipes());
        document.getElementById('import-recipes-btn').addEventListener('click', () => {
            document.getElementById('import-file').click();
        });
        document.getElementById('import-file').addEventListener('change', (e) => this.importRecipes(e));
        document.getElementById('clear-all-btn').addEventListener('click', () => this.clearAllData());

        document.getElementById('export-shopping-btn').addEventListener('click', () => this.exportShoppingList());
        document.getElementById('clear-shopping-btn').addEventListener('click', () => this.clearShoppingList());
    },

    showView(viewName) {
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

        if (viewName === 'recipe-detail') {
            document.getElementById('recipe-detail-view').classList.add('active');
        } else {
            document.getElementById(`${viewName}-view`).classList.add('active');
            document.getElementById(`${viewName}-btn`).classList.add('active');
            this.currentView = viewName;

            if (viewName === 'recipes') {
                this.loadRecipeList();
            } else if (viewName === 'shopping') {
                this.loadShoppingList();
            }
        }
    },

    async handleFetchRecipe() {
        const urlInput = document.getElementById('recipe-url');
        const url = urlInput.value.trim();

        if (!url) {
            this.showError('Please enter a recipe URL');
            return;
        }

        this.showLoading(true);
        this.hideError();

        try {
            const recipe = await RecipeScraper.fetchRecipe(url);
            const id = await DB.addRecipe(recipe);

            this.showLoading(false);
            urlInput.value = '';

            this.currentRecipeId = id;
            this.showRecipeDetail(id);
            this.showView('recipe-detail');
        } catch (error) {
            this.showLoading(false);
            this.showError(error.message);
        }
    },

    async loadRecipeList() {
        const recipes = await DB.getRecipes();
        const container = document.getElementById('recipe-list');

        if (recipes.length === 0) {
            container.innerHTML = '<div class="shopping-empty">No saved recipes yet. Add one from the home page!</div>';
            return;
        }

        recipes.sort((a, b) => b.dateAdded - a.dateAdded);

        container.innerHTML = recipes.map(recipe => `
            <div class="recipe-card" data-id="${recipe.id}">
                <h3>${this.escapeHtml(recipe.name)}</h3>
                <p>${this.escapeHtml(recipe.description.substring(0, 150))}${recipe.description.length > 150 ? '...' : ''}</p>
                <div class="recipe-meta">
                    ${recipe.totalTime ? `<span>⏱️ ${recipe.totalTime}</span>` : ''}
                    ${recipe.recipeYield ? `<span>🍽️ ${recipe.recipeYield}</span>` : ''}
                </div>
                <div class="recipe-card-actions">
                    <button class="primary-btn view-recipe-btn">View Recipe</button>
                    <button class="danger-btn delete-recipe-btn">Delete</button>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.recipe-card').forEach(card => {
            const id = parseInt(card.dataset.id);

            card.querySelector('.view-recipe-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.currentRecipeId = id;
                this.showRecipeDetail(id);
                this.showView('recipe-detail');
            });

            card.querySelector('.delete-recipe-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm('Delete this recipe?')) {
                    await DB.deleteRecipe(id);
                    this.loadRecipeList();
                }
            });
        });
    },

    async showRecipeDetail(id) {
        const recipe = await DB.getRecipe(id);
        const container = document.getElementById('recipe-detail');

        container.innerHTML = `
            <h2>${this.escapeHtml(recipe.name)}</h2>

            <div class="recipe-meta">
                ${recipe.prepTime ? `<div>Prep: ${recipe.prepTime}</div>` : ''}
                ${recipe.cookTime ? `<div>Cook: ${recipe.cookTime}</div>` : ''}
                ${recipe.totalTime ? `<div>Total: ${recipe.totalTime}</div>` : ''}
                ${recipe.recipeYield ? `<div>Servings: ${recipe.recipeYield}</div>` : ''}
                <div><a href="${recipe.url}" target="_blank" rel="noopener">Original Recipe →</a></div>
            </div>

            ${recipe.description ? `<p>${this.escapeHtml(recipe.description)}</p>` : ''}

            <div class="recipe-section">
                <h3>Ingredients</h3>
                <ul class="ingredients-list">
                    ${recipe.ingredients.map(ing => `<li>${this.escapeHtml(ing)}</li>`).join('')}
                </ul>
            </div>

            <div class="recipe-section">
                <h3>Instructions</h3>
                <ol class="instructions-list">
                    ${recipe.instructions.map(inst => `<li>${this.escapeHtml(inst)}</li>`).join('')}
                </ol>
            </div>

            <div class="recipe-actions">
                <button id="add-to-shopping-btn" class="primary-btn">Add to Shopping List</button>
            </div>
        `;

        document.getElementById('add-to-shopping-btn').addEventListener('click', () => {
            this.addIngredientsToShopping(recipe.ingredients);
        });
    },

    async addIngredientsToShopping(ingredients) {
        await DB.addToShopping(ingredients);
        alert('Ingredients added to shopping list!');
    },

    async loadShoppingList() {
        const items = await DB.getShoppingList();
        const container = document.getElementById('shopping-list');

        if (items.length === 0) {
            container.innerHTML = '<div class="shopping-empty">Your shopping list is empty</div>';
            return;
        }

        container.innerHTML = items.map(item => `
            <div class="shopping-item ${item.checked ? 'checked' : ''}" data-id="${item.id}">
                <input type="checkbox" id="item-${item.id}" ${item.checked ? 'checked' : ''}>
                <label for="item-${item.id}">${this.escapeHtml(item.text)}</label>
            </div>
        `).join('');

        container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', async (e) => {
                const itemDiv = e.target.closest('.shopping-item');
                const id = parseInt(itemDiv.dataset.id);
                await DB.updateShoppingItem(id, e.target.checked);
                itemDiv.classList.toggle('checked', e.target.checked);
            });
        });
    },

    async exportShoppingList() {
        const items = await DB.getShoppingList();
        const unchecked = items.filter(item => !item.checked);

        if (unchecked.length === 0) {
            alert('No items to export');
            return;
        }

        const text = unchecked.map(item => `• ${item.text}`).join('\n');

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Shopping List',
                    text: text
                });
            } catch (error) {
                if (error.name !== 'AbortError') {
                    this.copyToClipboard(text);
                }
            }
        } else {
            this.copyToClipboard(text);
        }
    },

    async clearShoppingList() {
        if (confirm('Clear all items from shopping list?')) {
            await DB.clearShopping();
            this.loadShoppingList();
        }
    },

    async exportRecipes() {
        const recipes = await DB.getRecipes();
        const json = JSON.stringify(recipes, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `wolfgang-recipes-${Date.now()}.json`;
        a.click();

        URL.revokeObjectURL(url);
    },

    async importRecipes(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const recipes = JSON.parse(text);

            for (const recipe of recipes) {
                delete recipe.id;
                try {
                    await DB.addRecipe(recipe);
                } catch (error) {
                    console.error('Failed to import recipe:', recipe.name, error);
                }
            }

            alert(`Imported ${recipes.length} recipes!`);
            this.loadRecipeList();
        } catch (error) {
            alert('Failed to import recipes. Invalid file format.');
        }

        event.target.value = '';
    },

    async clearAllData() {
        if (confirm('This will delete all recipes and shopping list items. Are you sure?')) {
            await DB.clearAll();
            alert('All data cleared');
            this.loadRecipeList();
            this.loadShoppingList();
        }
    },

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            alert('Copied to clipboard!');
        }).catch(() => {
            alert('Failed to copy. Please copy manually:\n\n' + text);
        });
    },

    showLoading(show) {
        document.getElementById('loading').classList.toggle('hidden', !show);
    },

    showError(message) {
        const errorEl = document.getElementById('error');
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    },

    hideError() {
        document.getElementById('error').classList.add('hidden');
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// ============================================================================
// Service Worker Registration
// ============================================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('Service Worker registered:', reg.scope))
            .catch(err => console.error('Service Worker registration failed:', err));
    });
}

// ============================================================================
// App Initialization
// ============================================================================
(async function init() {
    try {
        await DB.init();
        UI.init();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        alert('Failed to initialize the app. Please refresh the page.');
    }
})();
