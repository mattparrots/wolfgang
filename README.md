# Wolfgang 🍳

A clean, minimal Progressive Web App for decluttering recipes from cooking websites. Extract just the recipe—no ads, no life stories, no popups.

## Features

- **Recipe Scraping**: Paste any recipe URL and extract clean content using Schema.org JSON-LD
- **Offline Support**: Full PWA with service worker for offline access
- **Local Storage**: Recipes saved in IndexedDB for persistent storage
- **Shopping Lists**: Convert ingredients to checkable shopping lists
- **Import/Export**: Backup and restore your recipe collection as JSON
- **Share**: Export shopping lists via native share or clipboard
- **No Backend**: Runs entirely client-side, hosted on GitHub Pages

## Supported Recipe Sites

Wolfgang works with any site that uses Schema.org JSON-LD markup, including:

- Serious Eats
- NYT Cooking
- Bon Appétit
- Epicurious
- AllRecipes
- Food Network
- Budget Bytes
- Smitten Kitchen
- King Arthur Baking
- And many more!

## Technical Stack

- **Frontend**: Vanilla HTML, CSS, and JavaScript (no frameworks)
- **Storage**: IndexedDB for recipes and shopping lists
- **PWA**: Manifest + Service Worker for offline capability
- **CORS Proxy**: Uses corsproxy.io for fetching recipes client-side

## Installation

### For Development

1. Clone this repository:
   ```bash
   git clone <repo-url>
   cd wolfgang
   ```

2. Generate PWA icons (required for PWA functionality):
   - Open `generate-icons.html` in your browser
   - Click the download buttons to generate `icon-192.png` and `icon-512.png`
   - Place the icons in the root directory

3. Serve the app locally:
   ```bash
   # Using Python 3
   python3 -m http.server 8000

   # Using Node.js
   npx serve

   # Or any other static file server
   ```

4. Open `http://localhost:8000` in your browser

### For GitHub Pages

1. Enable GitHub Pages in your repository settings
2. Set the source to the main branch / root directory
3. Generate and commit the icon files (see step 2 above)
4. Push to GitHub
5. Access your app at `https://mattparrots.github.io/wolfgang`

## Usage

### Adding a Recipe

1. Find a recipe on any supported cooking website
2. Copy the URL
3. Paste it into Wolfgang's input field
4. Click "Fetch Recipe" or press Enter
5. The recipe is automatically saved for offline access

### Managing Recipes

- **View**: Click on any saved recipe to see the full details
- **Delete**: Remove recipes you no longer need
- **Export**: Backup all your recipes as a JSON file
- **Import**: Restore recipes from a previous backup

### Shopping Lists

1. Open any saved recipe
2. Click "Add to Shopping List"
3. Navigate to the Shopping List tab
4. Check off items as you shop
5. Export the list to share or save to Notes/Reminders

## Project Structure

```
wolfgang/
├── index.html           # Main HTML structure
├── styles.css           # All styling
├── app.js              # Application logic
├── manifest.json       # PWA manifest
├── service-worker.js   # Service worker for offline support
├── icon.svg           # Source icon
├── icon-192.png       # PWA icon (192x192)
├── icon-512.png       # PWA icon (512x512)
└── generate-icons.html # Tool for generating PNG icons
```

## Known Limitations

- **CORS Proxy**: Relies on a third-party CORS proxy (corsproxy.io) which may have rate limits
- **Schema.org Only**: Only works with sites that use proper Schema.org JSON-LD markup
- **No Search**: No built-in recipe search (yet)
- **Basic UI**: Minimal styling focused on functionality over aesthetics

## Future Enhancements

- [ ] Custom CORS proxy (Cloudflare Worker)
- [ ] Recipe tagging and categories
- [ ] Search and filter functionality
- [ ] Meal planning features
- [ ] Recipe scaling (adjust servings)
- [ ] Print-friendly view
- [ ] Dark mode
- [ ] PWA install prompt

## Browser Support

Wolfgang works on all modern browsers that support:
- Service Workers
- IndexedDB
- ES6+ JavaScript
- CSS Grid/Flexbox

Tested on: Chrome, Firefox, Safari, Edge (latest versions)

## License

MIT

## Contributing

Contributions welcome! Please feel free to submit issues or pull requests.

## Privacy

Wolfgang runs entirely in your browser. No data is sent to any server except:
- Recipe URLs are fetched through corsproxy.io for CORS bypass
- Original recipe sites receive your request (via the proxy)

No analytics, no tracking, no accounts required.
