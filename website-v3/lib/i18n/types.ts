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
  // SiteHeader / SiteFooter nav (formerly Corners / PageCorners)
  | 'nav.partners'
  | 'nav.catalog'
  | 'nav.gallery'
  | 'nav.about'
  | 'nav.contact'
  | 'nav.waitlist'
  | 'nav.homeAriaLabel'
  | 'corners.tagline'

  // SiteHeader / SiteFooter (v3 redesign)
  | 'nav.howItWorks'
  | 'nav.shopRun'
  | 'nav.agents'
  | 'nav.signIn'
  | 'nav.apply'
  | 'nav.menu'
  | 'nav.close'
  | 'footer.rights'

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

  // Catalog page intro band, stats, tabs and zero-upfront band (v3 redesign)
  | 'catalog.intro.label'
  | 'catalog.intro.title'
  | 'catalog.intro.body'
  | 'catalog.stat.gots'
  | 'catalog.stat.heavy'
  | 'catalog.stat.methods'
  | 'catalog.tabs.ariaLabel'
  | 'catalog.toggle.heavy'
  | 'catalog.toggle.gots'
  | 'catalog.badge.heavy'
  | 'catalog.badge.gots'
  | 'catalog.card.colours.one'
  | 'catalog.card.colours.other'
  | 'catalog.band.label'
  | 'catalog.band.title'
  | 'catalog.band.body'
  | 'catalog.band.cta'
  | 'catalog.band.bulk'

  // Catalog page (Round 3 — vintage sidebar, grid/index, editorial cells)
  | 'catalog.filter.cloth'
  | 'catalog.view.grid'
  | 'catalog.view.index'
  | 'catalog.index.name'
  | 'catalog.index.type'
  | 'catalog.index.weight'
  | 'catalog.index.cert'
  | 'catalog.index.colours'
  | 'catalog.card.start'
  | 'catalog.filters.button'
  | 'catalog.filter.title'
  | 'catalog.filter.close'
  | 'catalog.filter.show.one'
  | 'catalog.filter.show.other'
  | 'catalog.note.kicker'
  | 'catalog.note.title'
  | 'catalog.note.foot'
  | 'catalog.editorial.cloth.kicker'
  | 'catalog.editorial.cloth.title'
  | 'catalog.editorial.studio.kicker'
  | 'catalog.editorial.studio.title'

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
  | 'gallery.title'
  | 'gallery.count.one'
  | 'gallery.count.other'

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
  | 'waitlist.role.festival'

  // Home page (v3 redesign)
  | 'home.hero.title'
  | 'home.hero.subline'
  | 'home.hero.promptLabel'
  | 'home.hero.placeholder'
  | 'home.hero.start'
  | 'home.hero.chip.tour'
  | 'home.hero.chip.festival'
  | 'home.hero.chip.tattoo'
  | 'home.hero.chip.store'
  | 'home.hero.fact.blanks'
  | 'home.hero.fact.printed'
  | 'home.hero.fact.from'
  | 'home.hero.fact.zero'
  | 'home.hero.fact.weight'
  | 'home.brief.label'
  | 'home.brief.next'
  | 'home.brief.step1'
  | 'home.brief.step2'
  | 'home.brief.step3'
  | 'home.brief.apply'
  | 'home.brief.edit'
  | 'home.brief.close'

  | 'home.printedFor'

  | 'home.cloth.label'
  | 'home.cloth.title'
  | 'home.cloth.body'
  | 'home.cloth.stat.heaviest'
  | 'home.cloth.stat.heaviestTee'
  | 'home.cloth.stat.gots'
  | 'home.cloth.stat.oeko'

  | 'home.zero.label'
  | 'home.zero.title'
  | 'home.zero.stock.title'
  | 'home.zero.stock.body'
  | 'home.zero.min.title'
  | 'home.zero.min.body'
  | 'home.zero.margin.title'
  | 'home.zero.margin.body'
  | 'home.zero.cta'
  | 'home.zero.bulk'

  | 'home.assistant.label'
  | 'home.assistant.title'
  | 'home.assistant.body'
  | 'home.assistant.you'
  | 'home.assistant.youText'
  | 'home.assistant.mockups'
  | 'home.assistant.draftA'
  | 'home.assistant.draftB'
  | 'home.assistant.quote'
  | 'home.assistant.quoteText'
  | 'home.assistant.proof'
  | 'home.assistant.approved'
  | 'home.assistant.shipped'
  | 'home.assistant.shippedText'

  | 'home.paths.label'
  | 'home.paths.title'
  | 'home.paths.shop.title'
  | 'home.paths.shop.meta'
  | 'home.paths.shop.body'
  | 'home.paths.shop.link'
  | 'home.paths.run.title'
  | 'home.paths.run.meta'
  | 'home.paths.run.body'
  | 'home.paths.run.link'

  | 'home.catalog.title'
  | 'home.catalog.body'
  | 'home.catalog.link'

  | 'home.studio.title'
  | 'home.studio.meta'

  | 'home.agents.label'
  | 'home.agents.soon'
  | 'home.agents.title'
  | 'home.agents.body'
  | 'home.agents.connector'
  | 'home.agents.clients'

  | 'home.apply.label'
  | 'home.apply.title'

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
