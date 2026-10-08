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
export type BaseKey =
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
  | 'nav.shopRun'
  | 'nav.agents'
  | 'nav.signIn'
  | 'nav.apply'
  | 'nav.menu'
  | 'nav.close'
  | 'footer.index'
  | 'footer.studio'
  | 'footer.elsewhere'
  | 'footer.language'
  | 'footer.copyright'
  | 'footer.motto'

  // SiteHeader home variant (Round 6 — editorial masthead)
  | 'nav.cloth'
  | 'nav.blanks'
  | 'home.header.line'

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
  | 'about.statement'
  | 'about.paragraph1'
  | 'about.paragraph2'
  | 'about.est'
  | 'about.shop'
  | 'about.press'

  // Contact page
  | 'contact.headline'
  | 'contact.statement'
  | 'contact.line'
  | 'contact.email'
  | 'contact.shop'
  | 'contact.elsewhere'

  // Waitlist page + actions
  | 'waitlist.headline'
  | 'apply.index'
  | 'waitlist.statement'
  | 'waitlist.projectLabel'
  | 'waitlist.success'
  | 'waitlist.projectAttached'
  | 'waitlist.roleLabel'
  | 'waitlist.role.band'
  | 'waitlist.role.tattoo'
  | 'waitlist.role.illustrator'
  | 'waitlist.role.label'
  | 'waitlist.role.brand'
  | 'waitlist.role.other'
  | 'waitlist.emailPlaceholder'
  | 'waitlist.emailLabel'
  | 'waitlist.received'
  | 'waitlist.next1'
  | 'waitlist.next2'
  | 'waitlist.next3'
  | 'plate.label'
  | 'waitlist.apply'
  | 'waitlist.applying'
  | 'waitlist.privacy'
  | 'waitlist.errorGeneric'
  | 'waitlist.errorInvalidEmail'
  | 'waitlist.savedBlanks'
  | 'waitlist.savedBlanksAttached.one'
  | 'waitlist.savedBlanksAttached.other'
  | 'waitlist.role.festival'

  // Home page (v3 redesign; Round 6 — premium editorial rewrite)
  | 'home.hero.promptLabel'
  | 'home.hero.placeholder'
  | 'home.hero.start'
  | 'home.hero.startBrief'
  | 'home.hero.fact.printed'
  | 'home.hero.fact.zero'
  | 'home.brief.label'
  | 'home.brief.next'
  | 'home.brief.step1'
  | 'home.brief.step2'
  | 'home.brief.step3'
  | 'home.brief.apply'
  | 'home.brief.edit'
  | 'home.brief.close'

  | 'home.printedFor'

  | 'home.cover.fact.organic'
  | 'home.cover.fact.application'
  | 'home.cover.caption'
  | 'home.cover.tagline'
  | 'home.cloth.line'
  | 'home.cloth.eco'

  | 'home.statement.body'

  | 'home.cloth.stat.heaviest'
  | 'home.cloth.stat.heaviestTee'
  | 'home.cloth.stat.gots'
  | 'home.cloth.stat.oeko'
  | 'home.cloth.cta'

  | 'home.zero.word'
  | 'home.zero.headline'
  | 'home.zero.stock.title'
  | 'home.zero.stock.body'
  | 'home.zero.min.title'
  | 'home.zero.min.body'
  | 'home.zero.margin.title'
  | 'home.zero.margin.body'
  | 'home.zero.cta'
  | 'home.zero.bulk'

  | 'home.setlist.title'
  | 'home.setlist.subtitle'
  | 'home.setlist.step1.title'
  | 'home.setlist.step1.body'
  | 'home.setlist.step2.title'
  | 'home.setlist.step2.body'
  | 'home.setlist.step3.title'
  | 'home.setlist.step3.body'
  | 'home.setlist.step4.title'
  | 'home.setlist.step4.body'
  | 'home.setlist.step5.title'
  | 'home.setlist.step5.body'

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

  | 'home.agents.label'
  | 'home.agents.soon'
  | 'home.agents.title'
  | 'home.agents.body'
  | 'home.agents.connector'
  | 'home.agents.clients'
  | 'home.agents.endpoint'
  | 'home.agents.protocol'
  | 'home.agents.clientsLabel'
  | 'home.agents.status'
  | 'home.agents.copy'
  | 'home.agents.copied'

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

// Round 9 slice keys (WP5). Transitional: English must define every one
// (a missing key in en.ts fails tsc); the other five locales may omit them
// and t() falls back to English. WP21 folds NewKey into BaseKey and makes
// every locale strict again.
export type NewKey =
  // Nav
  | 'nav.home'

  // Home hero: promise, tagline, run label, composer
  | 'home.hero.promise'
  | 'home.hero.tagline'
  | 'home.hero.run'
  | 'home.composer.label'
  | 'home.composer.placeholder.1'
  | 'home.composer.placeholder.2'
  | 'home.composer.placeholder.3'
  | 'home.composer.placeholder.4'
  | 'home.composer.chipsLabel'
  | 'home.composer.chip.1'
  | 'home.composer.chip.2'
  | 'home.composer.chip.3'
  | 'home.composer.chip.4'
  | 'home.composer.send'
  | 'home.composer.hint'

  // Product band / AppFrame (static example flow)
  | 'product.index'
  | 'product.title'
  | 'product.frameLabel'
  | 'product.example'
  | 'product.breadcrumb'
  | 'product.breadcrumb.project'
  | 'product.you'
  | 'product.agent'
  | 'product.brief'
  | 'product.agent.reading'
  | 'product.agent.mockup'
  | 'product.agent.quote'
  | 'product.agent.proof'
  | 'product.mockup.caption'
  | 'product.quote.title'
  | 'product.quote.blank'
  | 'product.quote.print'
  | 'product.quote.qty'
  | 'product.quote.lead'
  | 'product.quote.total'
  | 'product.quote.priced'
  | 'product.proof.approved'
  | 'product.agentLive'
  | 'product.caption'
  | 'product.mcp'

  // About
  | 'about.index'
  | 'about.claim.1'
  | 'about.claim.2'
  | 'about.facts.method'
  | 'about.facts.method.value'
  | 'about.facts.cert'
  | 'about.facts.cert.value'
  | 'about.facts.vegan'
  | 'about.facts.vegan.value'
  | 'about.plate.credit'

  // Catalog header, paper insert, spec captions
  | 'catalog.header.index'
  | 'catalog.insert.label'
  | 'catalog.card.sku'
  | 'catalog.card.from'
  | 'catalog.card.moq'
  | 'catalog.card.lead';

export type Key = BaseKey | NewKey;

// Locales other than English: full BaseKey coverage is enforced, NewKey
// is optional until WP21.
export type Dictionary = Record<BaseKey, string> & Partial<Record<NewKey, string>>;

// English is the source: every key, base and new, is required.
export type EnglishDictionary = Record<Key, string>;
