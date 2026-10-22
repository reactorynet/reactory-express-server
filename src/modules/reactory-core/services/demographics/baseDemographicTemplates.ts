import type {
  DemographicCategory,
  DemographicReferenceModel,
  DemographicValueType,
  IDemographicOption,
} from '@reactory/server-modules/reactory-core/models/demographics/DemographicDefinition';

/**
 * ORG-030: the base demographic template set (plan section 6, decision D9).
 *
 * Every organization is seeded with this set when it is created. The
 * definitions are copied into `reactory_demographic_definitions` for the
 * organization with `system: true`; from then on they belong to that
 * organization and an administrator may rename, reorder, re-enable or disable
 * them (the value type is frozen by `DemographicsService.save`). A deleted
 * definition is never resurrected by a later seed run - see
 * `DemographicsService.seedForOrganization`.
 *
 * This module is *data only*. There is deliberately no accessor, switch or
 * per-tenant branch here: the seeding code iterates the array, and tests assert
 * the array is valid as a whole. Adding a template is therefore a one-line
 * change with no behavioural code path to reason about.
 *
 * ---------------------------------------------------------------------------
 * Default decisions and why
 * ---------------------------------------------------------------------------
 *
 * `enabled: true` for the whole set. The acceptance criterion for ORG-030 is
 * "a new organization has the base set", and ORG-031+ (configuration UI) only
 * lists enabled definitions by default. Seeding a definition that is invisible
 * until somebody switches it on would look exactly like a missing definition.
 * Organizations that must not collect a field disable it, which is an explicit
 * administrator action and survives re-seeding.
 *
 * `required: false` for the whole set. Seeding happens at organization
 * creation, before any member exists. A required definition would immediately
 * make every existing membership's value set incomplete and would block
 * self-service saves (the validator rejects a null value for required
 * definitions), so obligation is an organization decision, not a default.
 *
 * `sensitive: true` only for the protected-characteristic fields (race,
 * ethnicity, nationality, disabilityStatus). In ORG-006 `sensitive` controls
 * who may read the *definition* and who may read other members' values, and it
 * filters the definition out of a non-administrator's listing. These four are
 * special-category personal data that should be administrator-only by default.
 * dateOfBirth is precise PII too, but it is also the one personal field a
 * self-service profile form genuinely needs, so it is left non-sensitive and
 * organizations can restrict it with the policy's `adminOnlyKeys` instead. Where
 * precise age is not required, `ageBand` gives reporting a non-identifying
 * alternative.
 *
 * `race` and `ethnicity` are `multi-enum`, `language` is `multi-enum`: a person
 * may identify with more than one, and forcing a single choice loses
 * information that cannot be recovered later. Each of those three also sets
 * `multiValued: true`: `valueType: 'multi-enum'` selects the option membership
 * rule, `multiValued` is what tells `validateDemographicValue` the value is an
 * array. Everything else that is a controlled vocabulary is a single `enum`.
 *
 * `nationality` is a free-text `string` rather than an enum. Nationality is not
 * a closed set (dual citizenship, disputed states, "South African" vs "RSA"),
 * and a stale enum would reject legitimate answers; the value is `sensitive`
 * and reporting can normalise on read.
 *
 * Option keys are lower-case, hyphenated slugs and are the persisted value
 * (`validateDemographicValue` compares against `option.key`); `label` is display
 * text and can change without touching stored values. Each sensitive enum ends
 * with `prefer-not-to-say`, so a member is never forced to disclose.
 *
 * Definition keys are the plan's camelCase identifiers (`dateOfBirth`,
 * `ageBand`, ...). The model lower-cases a key on write and every public lookup
 * normalizes its argument, so `dateOfBirth` and `dateofbirth` both resolve;
 * seeding compares normalized keys so a re-run recognises the documents it
 * created.
 *
 * The `race` and `ethnicity` option sets follow the population-group and
 * language categories used by South African employment-equity reporting, which
 * is the reporting context this platform ships for. They are a *default*: an
 * organization can rename, extend or replace the options, or disable the
 * definition outright.
 *
 * Structural fields (`region`, `operationalGroup`, `businessUnit`, `team`) are
 * `reference` definitions rather than enums so they point at the
 * organization's own records and follow renames. All four are single-valued:
 * each membership belongs to one region / operational group / business unit /
 * team in the organization model, and a multi-valued reference would allow
 * values that contradict the membership record. `team` can be switched to
 * `multiple` by an administrator if the organization genuinely allows
 * concurrent team memberships (the value type stays `reference`, so the
 * system-definition guard does not block it).
 *
 * Ordinals are spaced by ten and grouped by category (personal, then
 * employment, then organizational) so a new template can be slotted in without
 * renumbering the rest, while `DemographicsService.list` still returns a stable,
 * meaningful order before any administrator reorders anything.
 */

/** Category groups, in seeding/display order. */
const PERSONAL: DemographicCategory = 'personal';
const EMPLOYMENT: DemographicCategory = 'employment';
const ORGANIZATIONAL: DemographicCategory = 'organizational';

/** One entry of the base set, as data. */
export interface IBaseDemographicTemplate {
  /** Immutable per-organization definition key (the plan's camelCase name; stored lower-case). */
  key: string;
  title: string;
  description: string;
  category: DemographicCategory;
  valueType: DemographicValueType;
  /** Required for `enum` / `multi-enum`, absent otherwise. */
  options?: IDemographicOption[];
  /** Required for `reference`, absent otherwise. */
  reference?: { model: DemographicReferenceModel; multiple?: boolean };
  /** Default for the copied definition; see the module note. */
  required: boolean;
  /** True when the value itself is a collection (references only, usually). */
  multiValued?: boolean;
  /** PII marker: gates reads/reporting and listing visibility. */
  sensitive: boolean;
  /** Index the value for free-text search. */
  searchable?: boolean;
  enabled: boolean;
  ordinal: number;
  /** Seeding only ever creates `system` definitions. */
  system: true;
}

/** Shorthand for a single-choice option list. */
const options = (...entries: Array<[string, string]>): IDemographicOption[] =>
  entries.map(([key, label], index) => ({ key, label, ordinal: index + 1, deprecated: false }));

/** Shared opt-out option; every sensitive enum must allow non-disclosure. */
const PREFER_NOT_TO_SAY: [string, string] = ['prefer-not-to-say', 'Prefer not to say'];

/**
 * The ORG-030 base set. Ordered by `ordinal`; the array order is the seeding
 * order and is asserted by the test suite.
 */
export const BASE_DEMOGRAPHIC_TEMPLATES: ReadonlyArray<IBaseDemographicTemplate> = [
  {
    key: 'dateOfBirth',
    title: 'Date of birth',
    description: 'The member\'s date of birth. Used to derive age; report on ageBand wherever possible.',
    category: PERSONAL,
    valueType: 'date',
    required: false,
    sensitive: false,
    enabled: true,
    ordinal: 10,
    system: true,
  },
  {
    key: 'ageBand',
    title: 'Age band',
    description: 'Age range the member falls into. The non-identifying alternative to date of birth for reporting.',
    category: PERSONAL,
    valueType: 'enum',
    options: options(
      ['under-18', 'Under 18'],
      ['18-24', '18 to 24'],
      ['25-34', '25 to 34'],
      ['35-44', '35 to 44'],
      ['45-54', '45 to 54'],
      ['55-64', '55 to 64'],
      ['65+', '65 or older'],
      PREFER_NOT_TO_SAY,
    ),
    required: false,
    sensitive: false,
    enabled: true,
    ordinal: 20,
    system: true,
  },
  {
    key: 'gender',
    title: 'Gender',
    description: 'The member\'s gender identity.',
    category: PERSONAL,
    valueType: 'enum',
    options: options(
      ['female', 'Female'],
      ['male', 'Male'],
      ['non-binary', 'Non-binary'],
      ['other', 'Other'],
      PREFER_NOT_TO_SAY,
    ),
    required: false,
    sensitive: false,
    enabled: true,
    ordinal: 30,
    system: true,
  },
  {
    key: 'pronoun',
    title: 'Pronoun',
    description: 'How the member prefers to be referred to.',
    category: PERSONAL,
    valueType: 'enum',
    options: options(
      ['she-her', 'She / her'],
      ['he-him', 'He / him'],
      ['they-them', 'They / them'],
      ['other', 'Other'],
      PREFER_NOT_TO_SAY,
    ),
    required: false,
    sensitive: false,
    enabled: true,
    ordinal: 40,
    system: true,
  },
  {
    key: 'race',
    title: 'Race',
    description: 'Population group the member identifies with. Collected for employment-equity reporting only.',
    category: PERSONAL,
    valueType: 'multi-enum',
    options: options(
      ['african', 'African'],
      ['coloured', 'Coloured'],
      ['indian', 'Indian'],
      ['white', 'White'],
      ['other', 'Other'],
      PREFER_NOT_TO_SAY,
    ),
    required: false,
    multiValued: true,
    sensitive: true,
    enabled: true,
    ordinal: 50,
    system: true,
  },
  {
    key: 'ethnicity',
    title: 'Ethnicity',
    description: 'Cultural or linguistic group the member identifies with. May be more than one.',
    category: PERSONAL,
    valueType: 'multi-enum',
    options: options(
      ['zulu', 'Zulu'],
      ['xhosa', 'Xhosa'],
      ['afrikaans', 'Afrikaans'],
      ['english', 'English'],
      ['sotho', 'Sotho'],
      ['tswana', 'Tswana'],
      ['pedi', 'Pedi'],
      ['venda', 'Venda'],
      ['tsonga', 'Tsonga'],
      ['ndebele', 'Ndebele'],
      ['swati', 'Swati'],
      ['other', 'Other'],
      PREFER_NOT_TO_SAY,
    ),
    required: false,
    multiValued: true,
    sensitive: true,
    enabled: true,
    ordinal: 60,
    system: true,
  },
  {
    key: 'nationality',
    title: 'Nationality',
    description: 'The member\'s nationality or citizenships, as free text.',
    category: PERSONAL,
    valueType: 'string',
    required: false,
    sensitive: true,
    enabled: true,
    ordinal: 70,
    system: true,
  },
  {
    key: 'language',
    title: 'Language',
    description: 'Languages the member speaks. May be more than one.',
    category: PERSONAL,
    valueType: 'multi-enum',
    options: options(
      ['en', 'English'],
      ['af', 'Afrikaans'],
      ['zu', 'isiZulu'],
      ['xh', 'isiXhosa'],
      ['st', 'Sesotho'],
      ['tn', 'Setswana'],
      ['ts', 'Xitsonga'],
      ['ss', 'siSwati'],
      ['ve', 'Tshivenda'],
      ['nr', 'isiNdebele'],
      ['nso', 'Sepedi'],
      ['other', 'Other'],
    ),
    required: false,
    multiValued: true,
    sensitive: false,
    enabled: true,
    ordinal: 80,
    system: true,
  },
  {
    key: 'disabilityStatus',
    title: 'Disability status',
    description: 'Whether the member lives with a disability, for equity and accommodation reporting.',
    category: PERSONAL,
    valueType: 'enum',
    options: options(
      ['no-disability', 'No disability'],
      ['disability', 'Disability'],
      PREFER_NOT_TO_SAY,
    ),
    required: false,
    sensitive: true,
    enabled: true,
    ordinal: 90,
    system: true,
  },
  {
    key: 'position',
    title: 'Position',
    description: 'The member\'s job title or position in the organization.',
    category: EMPLOYMENT,
    valueType: 'string',
    required: false,
    sensitive: false,
    searchable: true,
    enabled: true,
    ordinal: 100,
    system: true,
  },
  {
    key: 'employmentType',
    title: 'Employment type',
    description: 'The member\'s employment relationship with the organization.',
    category: EMPLOYMENT,
    valueType: 'enum',
    options: options(
      ['permanent', 'Permanent'],
      ['fixed-term', 'Fixed term'],
      ['contract', 'Contract'],
      ['part-time', 'Part time'],
      ['intern', 'Intern'],
      ['other', 'Other'],
    ),
    required: false,
    sensitive: false,
    enabled: true,
    ordinal: 110,
    system: true,
  },
  {
    key: 'region',
    title: 'Region',
    description: 'The organization region the member belongs to.',
    category: ORGANIZATIONAL,
    valueType: 'reference',
    reference: { model: 'Region', multiple: false },
    required: false,
    sensitive: false,
    enabled: true,
    ordinal: 120,
    system: true,
  },
  {
    key: 'operationalGroup',
    title: 'Operational group',
    description: 'The operational group the member belongs to.',
    category: ORGANIZATIONAL,
    valueType: 'reference',
    reference: { model: 'OperationalGroup', multiple: false },
    required: false,
    sensitive: false,
    enabled: true,
    ordinal: 130,
    system: true,
  },
  {
    key: 'businessUnit',
    title: 'Business unit',
    description: 'The business unit the member belongs to.',
    category: ORGANIZATIONAL,
    valueType: 'reference',
    reference: { model: 'BusinessUnit', multiple: false },
    required: false,
    sensitive: false,
    enabled: true,
    ordinal: 140,
    system: true,
  },
  {
    key: 'team',
    title: 'Team',
    description: 'The team the member belongs to.',
    category: ORGANIZATIONAL,
    valueType: 'reference',
    reference: { model: 'Team', multiple: false },
    required: false,
    sensitive: false,
    enabled: true,
    ordinal: 150,
    system: true,
  },
];

/**
 * Frozen at module load: the seam code iterates this array, so a runtime
 * mutation of a template would silently change what every future organization
 * is seeded with. Freezing turns that into a visible error at the mutation
 * site. `ReadonlyArray` only helps the compiler.
 */
BASE_DEMOGRAPHIC_TEMPLATES.forEach((template) => {
  if (template.options) {
    template.options.forEach((option) => Object.freeze(option));
    Object.freeze(template.options);
  }
  if (template.reference) Object.freeze(template.reference);
  Object.freeze(template);
});
Object.freeze(BASE_DEMOGRAPHIC_TEMPLATES);

/** The definition keys of the base set, in seeding order. */
export const BASE_DEMOGRAPHIC_TEMPLATE_KEYS: ReadonlyArray<string> =
  BASE_DEMOGRAPHIC_TEMPLATES.map((template) => template.key);

export default BASE_DEMOGRAPHIC_TEMPLATES;
