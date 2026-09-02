export type Lang = 'en' | 'pt' | 'es' | 'fr' | 'nl' | 'de';

export const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'de', label: 'Deutsch' },
];

// Every translatable string in the site, as dotted keys. Kept flat (not
// nested objects) so `Record<Key, string>` gives every dictionary
// complete, TypeScript-enforced key coverage — a missing translation is
// a compile error, not a runtime fallback surprise.
export type Key =
  // Corners / PageCorners nav
  | 'nav.partners'
  | 'nav.catalog'
  | 'nav.gallery'
  | 'nav.about'
  | 'nav.contact'
  | 'nav.waitlist'
  | 'nav.homeAriaLabel'
  | 'corners.tagline'

  // Catalog (GridView) filters, search, count, empty state
  | 'catalog.filter.type'
  | 'catalog.filter.fit'
  | 'catalog.filter.colour'
  | 'catalog.all'
  | 'catalog.allColours'
  | 'catalog.searchPlaceholder'
  | 'catalog.searchAriaLabel'
  | 'catalog.count.one'
  | 'catalog.count.other'
  | 'catalog.empty'
  | 'catalog.colourAriaLabel'
  | 'catalog.cardDetails'
  | 'catalog.noSavedBlanks'

  // Catalog product-type filter options
  | 'catalog.type.tshirts'
  | 'catalog.type.sweatsHoodies'
  | 'catalog.type.jackets'
  | 'catalog.type.polos'
  | 'catalog.type.shirts'
  | 'catalog.type.bottoms'
  | 'catalog.type.bagsAccessories'
  | 'catalog.type.kidsBaby'

  // Catalog fit filter options
  | 'catalog.fit.medium'
  | 'catalog.fit.relaxed'
  | 'catalog.fit.fitted'
  | 'catalog.fit.oversized'

  // ProductModal spec rows and controls
  | 'modal.colours'
  | 'modal.composition'
  | 'modal.weight'
  | 'modal.fit'
  | 'modal.printAreas'
  | 'modal.printArea.front'
  | 'modal.printArea.back'
  | 'modal.printArea.sleeve'
  | 'modal.printArea.other'
  | 'modal.sizes'
  | 'modal.certifications'
  | 'modal.printTechniques'
  | 'modal.startProject'
  | 'modal.close'
  | 'modal.previousPhoto'
  | 'modal.nextPhoto'
  | 'modal.prev'
  | 'modal.next'
  | 'modal.position'
  | 'modal.colourAriaLabel'
  | 'modal.photo.front'
  | 'modal.photo.back'
  | 'modal.photo.detail'
  | 'modal.photo.video'

  // Print technique names
  | 'modal.technique.screenPrint'
  | 'modal.technique.dtg'
  | 'modal.technique.embroidery'
  | 'modal.technique.heatTransfer'

  | 'modal.sizeGuide'
  | 'modal.measurementsIn'

  // GalleryView
  | 'gallery.pieceLabel'
  | 'gallery.tapHint'

  // About page
  | 'about.headline'
  | 'about.subline'
  | 'about.paragraph1'
  | 'about.paragraph2'
  | 'about.est'
  | 'about.shop'
  | 'about.press'

  // Contact page
  | 'contact.headline'
  | 'contact.paragraph'
  | 'contact.shop'
  | 'contact.elsewhere'

  // Waitlist page + actions
  | 'waitlist.headline'
  | 'waitlist.subline'
  | 'waitlist.projectLabel'
  | 'waitlist.success'
  | 'waitlist.projectAttached'
  | 'waitlist.rolePlaceholder'
  | 'waitlist.role.band'
  | 'waitlist.role.tattoo'
  | 'waitlist.role.illustrator'
  | 'waitlist.role.label'
  | 'waitlist.role.brand'
  | 'waitlist.role.other'
  | 'waitlist.emailPlaceholder'
  | 'waitlist.apply'
  | 'waitlist.applying'
  | 'waitlist.privacy'
  | 'waitlist.errorGeneric'
  | 'waitlist.errorInvalidEmail'
  | 'waitlist.savedBlanks'
  | 'waitlist.savedBlanksAttached.one'
  | 'waitlist.savedBlanksAttached.other'

  // 404
  | 'notFound.headline'
  | 'notFound.paragraph'
  | 'notFound.backLink'

  // Language switcher
  | 'languageSwitcher.ariaLabel'

  // Shared vocabulary used by more than one component
  | 'common.save'
  | 'common.saved'
  | 'common.savedCount'
  | 'common.remove'
  | 'common.details'
  | 'common.size'
  | 'common.related'
  | 'common.clearAll'
  | 'common.clearAllAriaLabel';

export type Dictionary = Record<Key, string>;
