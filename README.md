# Estim Hero Enclosure Pattern Designer

A browser-based tool for designing two-color hexagonal patterns on the [Estim Hero](https://shop.impudicus.net/) electrostimulation device enclosure. Preview patterns in real-time on the actual panel geometry, then use the included 3MF files to print.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 to launch the designer.

To build for production:

```bash
npm run build
```

This outputs static files to `dist/` which can be deployed anywhere (GitHub Pages, Netlify, etc.).

## About

The Estim Hero enclosure has top and bottom panels covered in a 33x14 grid of flat-top hexagons. Each hex face can be printed in one of two colors using multi-material 3D printing, with a third base color for borders. Some hex positions are open for ventilation or speakers, and others are absent for screw mounts, knobs, and rubber feet.

This tool lets you explore 13 different pattern types on both panels, tune parameters with real-time feedback, and pick your own colors — all before committing to a print.

## Features

- 13 pattern types: spiral, concentric rings, stripes, sine waves, gradient fade, chevron, hex flower, tumbling blocks, moire, tri-directional weave, independent set, random scatter, and text
- Top and bottom panel layouts with vent and cutout positions extracted from the 3MF mesh geometry
- Configurable base, color 1, and color 2 via color pickers
- Per-pattern parameter sliders with sensible defaults
- Global controls for center position, color inversion, and vent visibility

## 3MF Files

The `assets/` directory contains Bambu Studio project files for the enclosure:

- **Box V1.2.3.3mf** — Original enclosure mesh (unmodified)
- **Box V1.2.3-Psynapse.3mf** — Modified with a spiral pattern on the top panel and a concentric hexagonal pattern on the bottom panel with a black base color and white LED covers

The enclosure mesh files are distributed with permission from the original manufacturer.

## Documentation

See [PROJECT.md](PROJECT.md) for full technical details including grid geometry, pattern algorithms, and development history.

## Credits

Developed by Psynapse.