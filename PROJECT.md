# Estim Hero Enclosure Pattern Designer

A browser-based tool for designing two-color patterns on the hexagonal grid surfaces of the [Estim Hero](https://shop.impudicus.net/) electrostimulation device enclosure. Users can preview patterns in real-time and generate color maps for multi-material 3D printing.

## Background

The Estim Hero is an electrostimulation device with a 3D-printed enclosure. The top and bottom panels feature a tessellated hexagonal grid where each hexagon face can be printed in one of two colors (default: shiny blue silk PLA and shiny silver silk PLA) with black PLA borders between them. Some hexagons are open (ventilation/speaker holes) and some positions are absent (screw mounts, knob cutouts, rubber feet).

This tool allows users to design and preview patterns for these panels before printing, and was developed by Psynapse.

## Enclosure Geometry

### Hex Grid Properties
- **Orientation**: Flat-top hexagons (wider than tall, flat edges on top and bottom)
- **Interleave**: Column-offset — odd-numbered columns are shifted down by half a hex height
- **Neighbor topology** (for column `c`, row `r`):
  - Even column neighbors: `(c±1, r-1)`, `(c±1, r)`, `(c, r±1)`
  - Odd column neighbors: `(c±1, r)`, `(c±1, r+1)`, `(c, r±1)`
- **Maximum grid dimensions**: 33 columns × 14 rows (both panels)
- **Hex edge length**: ~4.16mm (extracted from 3MF mesh)

### Top Panel
- 33×14 max grid
- **Vent clusters** spelling "EH" (Estim Hero):
  - Left: E-shaped vent pattern (cols 9-11, rows 2-9)
  - Center: paired vent columns (cols 15-17, rows 3-8)
  - Right: H-shaped vent pattern (cols 21-23, rows 2-9)
- **Cutouts**: Corner positions, bottom edge reduced in the knob region (~cols 13-29 at rows 12-13)
- Three rotary knobs protrude from the bottom edge (gold, blue, red)
- Note: The 3MF mesh uses odd_col_down=False; positions are converted to the code's odd_col_down=True convention (odd column rows shifted by -1)

### Bottom Panel
- 33×14 max grid (mirrored left-to-right for bottom-up viewing)
- **Vent cluster**: Concentric ring pattern centered around col 15, row 5, with a center vent hex (13 total vent positions)
- **Cutouts**: Corner screw mounts, rubber feet, knob region on the LEFT side (cols 3-19, mirrored from 3MF data to match bottom-up viewing orientation)

### Colors
- **Color 1** (default shiny blue): Silk PLA, approximately `#4A90D9`
- **Color 2** (default shiny silver): Silk PLA, approximately `#C0C8D0`
- **Base color** (default black): Border/frame PLA, `#1A1A1A`
- All three colors are configurable via color pickers in the UI

### Vent/Cutout Position Extraction
Vent and cutout positions were extracted from the Bambu Studio 3MF file using connected-component analysis on the mesh geometry:
1. Extracted the 3MF archive (ZIP format with XML mesh data)
2. Identified hex face surfaces by checking triangle normals on Y-constant planes
3. Used union-find on shared vertices of coplanar triangles to identify individual hex faces
4. Fit a hex grid to the centroids to determine (col, row) assignments
5. Classified missing positions as vents (interior openings) or cutouts (edge/corner/knob regions)

## Patterns

### Currently Implemented (13 patterns)

1. **Spiral** — Archimedean spiral with elliptical aspect-ratio correction. Band ratio controls the fraction of each revolution that is color 1 vs color 2. Configurable spacing (default 84), direction (CW/CCW), and center position.

2. **Concentric Rings** — Four shape options: hexagon (default), circle, ellipse, and diamond. Hexagon shape uses true hex-grid cube-coordinate distance; others use continuous Euclidean/Manhattan distance with aspect-ratio correction. Features a zoom parameter (default 100) that interpolates between constant-width rings (zoom=0) and accelerating ring widths (zoom=100). Configurable ring thickness (default 30) and center position.

3. **Stripes** — Stripes at any angle from 0° to 180°, with snap points at geometrically natural angles (0°, 30°, 45°, 60°, 90°, 120°, 135°, 150°, 180°). Uses proper hex geometry projection for clean alignment at native hex angles.

4. **Sine Waves** — Horizontal sine waves with configurable count (1-6), frequency (default 29), amplitude (default 40), thickness (default 44), spacing between waves, phase offset between wave pairs, and horizontal shift. Frequency is calibrated to 0.5-5 full cycles across the 33-column width.

5. **Gradient Fade** — Stochastic dither gradient using a sigmoid probability function. Each hex is randomly assigned a color based on its position along the gradient axis. Sharpness (default 60) uses cubic mapping for dynamic range. Default direction places color 1 on the left and color 2 on the right. Directions: L→R, R→L, T→B, diagonal, radial.

6. **Chevron** — V-shaped stripe pattern with four directions (left, right, down, up). Default direction is right. Configurable stripe width (default 40), V-angle, and apex position.

7. **Hex Flower** — 7-hex rosette clusters (1 center + 6 neighbors) tiled on a hex-grid superlattice. Uses cube-coordinate distance for proper hex spacing. Adjustable spacing (3-8, default 4). Four modes: full flowers, centers only, petals only, and checkerboard.

8. **Tumbling Blocks** — Groups of hexagons colored to create an isometric 3D cube illusion. Configurable scale.

9. **Moiré** — Two periodic stripe patterns superimposed at different frequencies and angles. Creates emergent large-scale interference curves.

10. **Tri-directional Weave** — Three sets of bands at 0°, 60°, and 120° creating an over-under weave illusion.

11. **Independent Set** — Two variants of a "no two colored neighbors" constraint: sparse (widely spaced dots) and dense (maximum independent set — 1/3 of all hexes). Uses cube coordinates for proper hex-grid topology.

12. **Random Scatter** — Stochastic uniform distribution with configurable density and seed.

13. **Text** — Arbitrary text rendered in hex-pixel letters. Auto-sizes across four font tiers:
    - **Jumbo** (5×12): ≤5 characters
    - **Large** (3×8): ≤8 characters
    - **Small** (2×5 + gap): ≤11 characters
    - **Tiny** (2×5 tight): ≤16 characters
    - Supports A-Z, 0-9, space, dash, period, exclamation mark

### Patterns Explored but Not Included

These were prototyped during development and could be re-added:

- **Turing Spots** — Reaction-diffusion steady-state pattern thresholded to two colors
- **Pascal mod 2 (Sierpinski)** — Sierpinski gasket mapped to hex grid
- **Maze** — Single-solution maze with corridors through walls
- **Sierpinski Hexaflake** — Recursive fractal with sub-hexagons
- **Hex Cellular Automaton** — CA producing labyrinthine structures

### Pattern Ideas (Not Yet Implemented)

- **Voronoi domains** — Seed points generating organic territory boundaries
- **Perlin noise clusters** — Organic island-like groupings
- **Wallpaper group symmetries** — The hex lattice supports p6m symmetry group
- **Fibonacci spiral** — Golden ratio spiral mapped to the grid
- **Snowflake** — 6-fold symmetric dendritic pattern

## Global Controls

All patterns share these controls:
- **Panel selector**: Top / Bottom (different vent layouts and cutout positions)
- **Center X / Center Y**: Shifts the pattern center (0-100% of grid)
- **Invert**: Swaps color 1 and color 2
- **Show vents**: Toggle open/vent hex display
- **Color pickers**: Base color (borders and background), Color 1, Color 2

## Technical Architecture

### Implementation
- Vite + React project with single App component
- Canvas-based rendering with device-pixel-ratio support
- Each hex drawn with flat-top orientation, radial gradient overlay for shininess effect
- Pattern functions are pure: `fn(col, row, params, centerX, centerY) → boolean`
- Some patterns use a `generate()` function that returns a closure (hex flower, text) for patterns requiring precomputation
- Vent/cutout positions stored as `Set<"col,row">` strings
- Slider component supports snap points for natural angle values

### Key Technical Decisions
- Hex coordinate system: offset coordinates (col, row) with odd-column-down offset
- Cube coordinates used for hex-distance calculations (concentric rings hexagon mode, hex flower, independent set)
- Frequency parameters calibrated to physical grid dimensions
- Sigmoid sharpness uses cubic mapping for better low-end dynamic range
- Spiral band ratio expressed as fraction of period (not absolute width) to prevent coupling issues
- Font auto-sizing picks largest font that fits, with 4 tiers
- Bottom panel cutouts mirrored left-to-right to match bottom-up viewing perspective

### What Needs Doing

1. **Export functionality** — Generate output that can be used in the slicer:
   - SVG color map for visual reference
   - Possibly direct integration with Bambu Studio paint-on color assignment
   - JSON export of the hex color assignments

2. **Hosting** — Deploy as a static site others can use without needing to run locally

3. **Pattern presets** — Save/load specific parameter configurations

4. **Combine patterns** — Layer multiple patterns (e.g., text over a gradient background)

## File Structure

```
index.html                          — Entry point with dark theme CSS
src/main.jsx                        — React root mount with title
src/App.jsx                         — Main React component with all patterns and UI
vite.config.js                      — Vite config with React plugin
package.json                        — Dependencies and scripts
assets/Box V1.2.3.3mf              — Original enclosure 3MF (Bambu Studio)
assets/Box V1.2.3-Psynapse.3mf     — Modified 3MF with spiral top + concentric hex bottom
PROJECT.md                          — This file
README.md                           — Quick start guide
```

The enclosure mesh files in `assets/` are distributed with permission from the original manufacturer.

## Development History

This tool was developed iteratively through conversation, starting from basic pattern exploration and progressively refining the hex grid geometry, pattern implementations, and UI. Key milestones:

1. Initial radial hex grid visualizer with basic patterns
2. Correction to rectangular flat-top hex grid with column offset
3. Individual pattern explorers (waves, spiral, rings, chevron, etc.)
4. Deep research into hex tessellation patterns from math/art literature
5. Comprehensive pattern tool with all patterns combined
6. Photo analysis of actual Estim Hero top and bottom panels
7. UI refinements: text input, auto-sizing fonts, wave parameter fixes, pattern cleanup
8. Concentric hexagons zoom parameter matching the physical print
9. Vite + React project setup with proper build tooling
10. Configurable colors via color pickers (base, color 1, color 2)
11. 3MF mesh parsing for exact hex positions via connected-component analysis
12. Bottom panel knob cutout mirroring for correct bottom-up orientation
13. Pattern consolidation (concentric rings + hexagons merged) and default tuning

## Brand Context

- **Psynapse**: Brand identity
- **Color palette**: Electric blue (#0099FF range) + metallic silver
- **Device**: [Estim Hero](https://shop.impudicus.net/) electrostimulation device
- **Printing**: Bambu 3D printer with silk PLA filaments
