# Changelog

## 1.0.1

### Added
- **Preset sharing**: Load/Save button opens a modal for copying current settings as JSON or loading settings from pasted JSON data. Includes validation with inline error messages.
- **Preset JSON schema** (`preset-schema.json`): Formal schema for the preset format, covering panel, pattern, colors, global controls, and pattern-specific parameters.

## 1.0.0

Initial release.

- 13 pattern types: spiral, concentric rings, stripes, sine waves, gradient fade, chevron, hex flower, tumbling blocks, moire, tri-directional weave, independent set, random scatter, and text
- Top and bottom panel layouts with vent/cutout positions extracted from 3MF mesh geometry
- Configurable base, color 1, and color 2 via color pickers
- Per-pattern parameter sliders with sensible defaults
- Global controls for center position, color inversion, and vent visibility
- GitHub Pages deployment via Actions workflow
- Includes original and modified 3MF enclosure files in `assets/`
