# Estim Hero Enclosure Pattern Designer

A browser-based tool for designing two-color hexagonal patterns on the [Estim Hero](https://shop.impudicus.net/) electrostimulation device enclosure. Preview patterns in real-time on the actual panel geometry, then use the included 3MF files to print.

**The pattern designer can be accessed at: https://psynapps.github.io/estimhero-enclosure/**

## About

The Estim Hero enclosure has top and bottom panels covered in a 33x14 grid of flat-top hexagons. Each hex face can be printed in one of two colors using multi-material 3D printing, with a third base color for borders. Some hex positions are open for ventilation and others are absent for screw mounts and rubber feet.

This tool lets you explore different pattern types on both the top and bottom panels, tune parameters with real-time feedback, and pick your own colors. Settings can also be shared via JSON data.

## Example

This is an example enclosure printed using patterns produced by this tool (thanks Oolong for the printing assistance!). This was printed using a Bambu Lab H2D.

<img src="https://github.com/user-attachments/assets/6697f9e4-2bee-4214-bb2c-6fcf970081bc" width="50%" />
<img src="https://github.com/user-attachments/assets/4c5e6b97-329e-4f95-aade-ab10069bd534" width="50%" />

## Features

- 13 pattern types: spiral, concentric rings, stripes, sine waves, gradient fade, chevron, hex flower, tumbling blocks, moire, tri-directional weave, independent set, random scatter, and text
- Top and bottom panel layouts with vent and cutout positions extracted from the 3MF mesh geometry
- Configurable base, color 1, and color 2 via color pickers
- Per-pattern parameter sliders with sensible defaults
- Global controls for center position, color inversion, and vent visibility
- Load/Save presets: copy your current settings as JSON to share with others, or paste in a preset to load it

## Development

If you want to modify the tool locally:

```bash
git clone https://github.com/PsynApps/estimhero-enclosure.git
cd estimhero-enclosure
npm install
npm run dev
```

This starts a dev server at http://localhost:5173. Run `npm run build` to produce static files in `dist/`.

## Sharing Presets

Click the **Load / Save** button in the upper right of the controls to open the preset dialog. From there you can copy your current settings as a JSON snippet and share it however you like — paste it in a message, save it to a file, or include it in a GitHub issue. To load someone else's preset, paste the JSON into the textarea and click Load.

The preset format captures everything needed to reproduce a pattern: panel, pattern type, colors, global settings, and all pattern-specific parameters. The format is defined by the [preset-schema.json](preset-schema.json) JSON Schema in this repo.

An example preset:

```json
{
  "panel": "top",
  "pattern": "spiral",
  "invert": false,
  "showVents": true,
  "centerX": 50,
  "centerY": 50,
  "colors": {
    "base": "#1a1a1a",
    "color1": "#4A90D9",
    "color2": "#C0C8D0"
  },
  "params": {
    "ratio": 50,
    "spacing": 84,
    "dir": 0
  }
}
```

## 3MF Files

The `assets/` directory contains Bambu Studio project files for the enclosure:

- **Box V1.2.3.3mf** — Original enclosure mesh (unmodified)
- **Box V1.2.3-Psynapse.3mf** — Modified with a spiral pattern on the top panel and a concentric hexagonal pattern on the bottom panel with a black base color and white LED covers

The enclosure mesh files are distributed with permission from the original manufacturer.

## Documentation

See [PROJECT.md](PROJECT.md) for full technical details including grid geometry, pattern algorithms, and development history.

## Credits

Developed by Psynapse.
