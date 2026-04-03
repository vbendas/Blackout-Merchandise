# Spec: Product Detail Lightbox Unification

## MODIFIED Requirements

### Requirement: Product Detail Lightbox Display
The Product Detail Lightbox SHALL display product information with the same design patterns as the Showroom Lightbox, including animations, styling, and interaction states.

#### Scenario: Lightbox opens with animation
- **GIVEN** the user clicks a product in the catalog
- **WHEN** the Product Detail Lightbox opens
- **THEN** it displays with a smooth fade-in and scale animation
- **AND** the backdrop appears with the same styling as Showroom Lightbox

#### Scenario: Lightbox displays mode indicator in header
- **GIVEN** the Product Detail Lightbox is open
- **THEN** the header displays "Individual Mode" text
- **AND** shows the product counter (e.g., "1 / 10")

#### Scenario: Product already in selection shows indicator
- **GIVEN** the displayed product is already in the user's selection list
- **WHEN** the lightbox displays the product image
- **THEN** an emerald checkmark indicator appears on the image
- **AND** the action button shows "Update Selection" instead of "Add to Selection"

#### Scenario: Product not in selection shows add state
- **GIVEN** the displayed product is NOT in the user's selection list
- **WHEN** the lightbox displays
- **THEN** the action button shows "Add to Selection"

#### Scenario: Scroll gradients visible when scrolled
- **GIVEN** the user scrolls the product details panel
- **WHEN** not at the top of the panel
- **THEN** a top fade gradient is visible
- **AND** when not at the bottom, a bottom fade gradient is visible

#### Scenario: Container matches Showroom Lightbox styling
- **GIVEN** the Product Detail Lightbox is open
- **THEN** the container has rounded-2xl corners
- **AND** max-height is 80vh
- **AND** background is zinc-950
- **AND** border is zinc-800
